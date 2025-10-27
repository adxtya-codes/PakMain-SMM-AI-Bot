require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROVIDER_GROUPS = {
    'panel.com': '1203630xxxxxx@g.us', 
    'anotherprovider.com': '1203630yyyyyy@g.us'
};

async function analyzeUserMessage(message, session) {
    const lowerMsg = message.toLowerCase();
    let actionPriority = null;
    if (/(cancel|stop|cancell?e?d?|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return)/i.test(lowerMsg)) {
        actionPriority = 'cancel';
    } else if (/(refill|refil|renew|reorder|top\s*up|replenish|restock|resupply|bhar|bhardo|gir|girr|dropped|lost|drop|decrease|kam|low)/i.test(lowerMsg)) {
        actionPriority = 'refill';
    } else if (/(speed|sped|speeed|fast|faster|quick|jaldi|tez|teej|tej|teez|jldi|tejj|jaldii|increase)/i.test(lowerMsg)) {
        actionPriority = 'speed';
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                role: 'system',
                content: `You are an intelligent WhatsApp bot for order management. 
Understand user intent from natural sentences in English, Hinglish, and Urdu. 
Focus on 3 actions: speed, cancel, refill. Also support balance, spent, logout, help, site, services, terms.

INTENT RULES:
- SPEED: words/phrases like "fast, faster, quick, speed up, hurry, urgent, jaldi, tez, stuck, not completing".
- CANCEL: words/phrases like "cancel, refund, stop, band, bnd, khatam, khtm end, finish, over, wapis, wpis, rok, rokk, rook, money back".
- REFILL: words/phrases like "refill, restore, replenish, restock, lost, drop, decrease, kam, gir gaye".

Order IDs: extract all numbers (≥4 digits) as orderId(s).
Typos: handle common misspellings ("cancle→cancel", "refil→refill", "spedd→speed").

Other intents:
- "balance" (balance/paisa/funds)
- "spent" (spent/kharch/expenditure)
- "balance_and_spent" (account summary)
- "logout" (logout, change account)
- "help", "site", "services", "terms", "refund_policy", "general"

Always respond in JSON:
{
  "intent": "string",
  "action": "speed|cancel|refill|null",
  "orderId": "comma-separated ids or null",
  "currency": "string or null",
  "confidence": number,
  "reply": "string"
}
`
            }, {
                role: 'user', 
                content: message
            }],
            temperature: 0.2,
            max_tokens: 200
        });
        
        const content = response.choices[0]?.message?.content;
        if (content) {
            let parsed = JSON.parse(content);
            if (actionPriority && ['cancel','refill','speed'].includes(actionPriority)) {
                parsed.action = actionPriority;
                if (["speed","cancel","refill"].includes(parsed.intent)) {
                    parsed.intent = actionPriority;
                }
            }
            return parsed;
        }
    } catch (error) {
        console.error('Error analyzing message with OpenAI:', error);
    }
    
    return { intent: 'general', action: null, orderId: null, confidence: 0, reply: null };
}

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "urdu-bot-session"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

async function detectOrderAction(message, userId) {
    const lowerMsg = message.toLowerCase();
    
    const idActionNoSpace = /(\d+)(cancel|stop|cancell?e?d?|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return|speed\s*up?|fast|faster|increase\s*speed|refill|refil|renew|reorder|top\s*up)$/i;
    const matchIdActionNoSpace = message.replace(/\s+/g, '').match(idActionNoSpace);
    if (matchIdActionNoSpace) {
        const ids = [matchIdActionNoSpace[1]];
        const actionWord = matchIdActionNoSpace[2].toLowerCase();
        let action = null;
        if (/cancel|stop|cancell?e?d?|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return/.test(actionWord)) action = 'cancel';
        else if (/speed|fast|faster|increase/.test(actionWord)) action = 'speed';
        else if (/refill|refil|renew|reorder|top/.test(actionWord)) action = 'refill';
        if (action && ids.length) {
            return {
                action,
                orderId: ids.join(','),
                confidence: 0.95,
                message: `I'll help you ${action} order${ids.length > 1 ? 's' : ''} ${ids.join(', ')}.`
            };
        }
    }
    const actionIdNoSpace = /^(cancel|stop|cancell?e?d?|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return|speed\s*up?|fast|faster|increase\s*speed|refill|refil|renew|reorder|top\s*up)(\d+)$/i;
    const matchActionIdNoSpace = message.replace(/\s+/g, '').match(actionIdNoSpace);
    if (matchActionIdNoSpace) {
        const ids = [matchActionIdNoSpace[2]];
        const actionWord = matchActionIdNoSpace[1].toLowerCase();
        let action = null;
        if (/cancel|stop|cancell?e?d?|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return/.test(actionWord)) action = 'cancel';
        else if (/speed|fast|faster|increase/.test(actionWord)) action = 'speed';
        else if (/refill|refil|renew|reorder|top/.test(actionWord)) action = 'refill';
        if (action && ids.length) {
            return {
                action,
                orderId: ids.join(','),
                confidence: 0.95,
                message: `I'll help you ${action} order${ids.length > 1 ? 's' : ''} ${ids.join(', ')}.`
            };
        }
    }
const universalPattern = /(cancel|stop|cancell?e?d?|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return|speed(?:\s*up)?|fast|faster|increase\s*speed|refill|refil|renew|reorder|top\s*up|replenish|restock|resupply|bhar(?:\s*do)?|bhardo|gir|girr)[\s,:-]*([\d,\s\u00A0]+)|([\d,\s\u00A0]+)[\s,:-]*(cancel|stop|cancell?e?d?|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return|speed(?:\s*up)?|fast|faster|increase\s*speed|refill|refil|renew|reorder|top\s*up|replenish|restock|resupply|bhar(?:\s*do)?|bhardo|gir|girr)/i;

const matchUniversal = message.match(universalPattern);

if (matchUniversal) {
    const rawIds = (matchUniversal[2] || matchUniversal[3] || '').replace(/[\s\u00A0]+/g, '');
    const ids = rawIds.split(',').map(x => x.trim()).filter(Boolean);

    const actionWord = (matchUniversal[1] || matchUniversal[4] || '').toLowerCase();

    let action = null;
    if (/cancel|stop|cancell?e?d?|rok|rokk|rook|ruk|band|bnd|refund|khatam|khtm|wapis|wpis|vapis/.test(actionWord)) action = 'cancel';
    else if (/speed|fast|faster|increase/.test(actionWord)) action = 'speed';
    else if (/refill|refil|renew|reorder|top|replenish|restock|resupply|bhar|bhardo|gir|girr/.test(actionWord)) action = 'refill';

    if (action && ids.length) {
        console.log(`[DEBUG] Universal match: action=${action}, orderIds=${ids.join(',')}, count=${ids.length}`);
        return {
            action,
            orderId: ids.join(','),
            confidence: 0.95,
            message: `I'll help you ${action} order${ids.length > 1 ? 's' : ''} ${ids.join(', ')}.`
        };
    }
}
    
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are an order management assistant. Analyze and understand deeply the user's message. Extract ALL numeric order IDs (comma-separated, anywhere in the message, even if action is at the end or there are extra commas/whitespace), and the action ('cancel', 'speed', or 'refill'). Always extract all valid order IDs and the intended action, even if the format is unusual. Respond with JSON: {action: 'cancel'|'speed'|'refill'|null, orderId: string|null, confidence: number, message: string}`
                },
                { role: 'user', content: message }
            ],
            temperature: 0.3,
            max_tokens: 60
        });
        
        const content = response.choices[0]?.message?.content;
        if (content) {
            const result = JSON.parse(content);
            if (result.action && result.confidence > 0.6) {
                return result;
            }
        }
    } catch (error) {
        console.error('Error analyzing message with OpenAI:', error);
    }
    
    return null;
}

const { OTP_SESSIONS, requestOtp, verifyOtp } = require('./otp');
const { checkUserExists } = require('./user_check');
const { fetchUserBalance } = require('./user_balance');
const SESSION = {};

const qrcode = require('qrcode-terminal');

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR RECEIVED - Scan this code with WhatsApp');
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED - Session is authenticated');
});

client.on('auth_failure', (msg) => {
    console.error('AUTH FAILURE:', msg);
});

client.on('ready', () => {
    console.log('CLIENT IS READY!');
    console.log('Bot can now receive messages');
});

client.on('loading_screen', (percent, message) => {
    console.log(`LOADING: ${percent}% - ${message}`);
});

client.on('disconnected', (reason) => {
    console.log('DISCONNECTED:', reason);
});

client.on('change_state', (state) => {
    console.log('STATE CHANGED:', state);
});

client.on('remote_session_saved', () => {
    console.log('REMOTE SESSION SAVED');
});

client.on('message', async (msg) => {
    console.log('=== MESSAGE RECEIVED ===');
    console.log('From:', msg.from);
    console.log('Body:', msg.body);
    console.log('Type:', msg.type);
    
    if (msg.body === '!ping') {
        console.log('Received !ping, sending pong...');
        await msg.reply('pong');
        return;
    }
    
    try {
        console.log(`[MSG] from ${msg.from}: ${msg.body}`);
const providerGroupIds = (() => {
    try {
        const fs = require('fs');
        const path = require('path');
        const contactsPath = path.join(__dirname, 'contacts.json');
        const contactsData = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
        return contactsData.map(c => c.id);
    } catch (e) {
        return [];
    }
})();
if (providerGroupIds.includes(msg.from)) {
    console.log('Message is from a provider group, ignoring.');
    return;
}
if (msg.from.includes('-')) {
    console.log('Message is from a group chat, ignoring.');
    return;
}
        const from = msg.from;
        const chatId = from;
        if (!OTP_SESSIONS[chatId]) {
            OTP_SESSIONS[chatId] = { state: 'init', triggered: false };
            console.log('New session created for', chatId);
        }
        const session = OTP_SESSIONS[chatId];
                if (!session.triggered && session.state === 'init') {
            if (!msg.body.toLowerCase().includes('bot')) {
                console.log('Message does not contain \'bot\', ignoring.');
                return;
            }
            session.triggered = true;
            console.log('Session triggered for', chatId, 'with message:', msg.body);
        }


    const PROVIDER_GROUPS = {
        'panel.com': '1203630xxxxxx@g.us', 
        'anotherprovider.com': '1203630yyyyyy@g.us'
    };

    if (session.state === 'init' && session.triggered) {
        console.log('State: init. Asking for User ID. Initial message was:', msg.body);
        session.state = 'awaiting_userid';
        await msg.reply('🤖 Welcome to PakMainSMM Bot! 🎉\n\n👤 Please enter your Username to get started. \n\n You can check your account Username from this page: \n\n https://pakmainsmm.com/account ');
        return;
    }
    if (session.state === 'awaiting_userid') {
        const username = msg.body.trim();
        console.log('State: awaiting_userid. Received User ID:', username);
        const checkRes = await checkUserExists(username);
        if (checkRes.error) {
            console.log('User check error:', checkRes.message);
            await msg.reply('❌ Error checking username: ' + checkRes.message + '\n\n🔄 Please try again with your correct User ID.');
            return;
        }
        if (!checkRes.exists) {
            console.log('Username does not exist:', username);
            session.state = 'init';
            await msg.reply('❌ You have entered an invalid username, 👤Kindly enter your valid Username:');
            return;
        }
        session.tempUserid = username;
        session.state = 'awaiting_confirmation';
        await msg.reply(`✅ Username found in our system!\n\n🔍 Please confirm your username: *${username}*\n\n💬 Reply with "Yes" or "No"`);
        return;
    }
    
    if (session.state === 'awaiting_confirmation') {
        const response = msg.body.trim().toLowerCase();
        console.log('State: awaiting_confirmation. Received response:', response);
        
        const yesResponses = ['yes', 'y', 'haan', 'ha', 'han', 'ji', 'correct', 'right', 'theek', 'sahi'];
        const noResponses = ['no', 'n', 'nahi', 'na', 'nai', 'wrong', 'galat', 'incorrect'];
        
        if (yesResponses.includes(response)) {
            session.userid = session.tempUserid;
            delete session.tempUserid;
            session.state = 'awaiting_otp';
            
            const { createOTPTicket } = require('./otp_api');
            const otpResult = await createOTPTicket(session.userid);
            
            if (otpResult && otpResult.otpCode) {
                session.otpCode = otpResult.otpCode;
                session.ticketId = otpResult.data?.ticket_id || otpResult.ticket_id || otpResult.data?.id || otpResult.id;
                
                console.log(`[DEBUG] OTP Result:`, JSON.stringify(otpResult, null, 2));
                console.log(`[DEBUG] Extracted ticket ID:`, session.ticketId);
                
                let otpMessage = '🎉 Username confirmed! \n\n📧 An OTP has been sent to your panel.\n\n';
                if (session.ticketId && session.ticketId !== 0) {
                    otpMessage += `🎫 **View your OTP here:** https://pakmainsmm.com/viewticket/${session.ticketId}\n\n`;
                }
                otpMessage += '🔢 Please enter the 6-digit OTP code:';
                
                await msg.reply(otpMessage);
            } else {
                console.log('Failed to create OTP ticket');
                await msg.reply('❌ Error sending OTP to your panel.\n\n🔄 Please try again later or contact support.');
                session.state = 'init';
            }
        } else if (noResponses.includes(response)) {
            delete session.tempUserid;
            session.state = 'awaiting_userid';
            await msg.reply('🔄 No problem! \n\n👤 Please enter your correct User ID:');
        } else {
            await msg.reply('🤔 I didn\'t understand that.\n\n💬 Please reply with "yes" or "no" to confirm your username.');
        }
        return;
    }
    
    if (session.state === 'awaiting_otp') {
        const userOTP = msg.body.trim();
        console.log('State: awaiting_otp. Received OTP:', userOTP);
        
        if (!/^\d{6}$/.test(userOTP)) {
            await msg.reply('❌ Invalid OTP format!\n\n🔢 Please enter a 6-digit code (e.g., 123456):');
            return;
        }
        
        const isValidOTP = (session.otpCode === userOTP);
        
        if (isValidOTP) {
            session.verified = true;
            session.state = 'authenticated';
            
            const { fetchUserBalance } = require('./user_balance');
            const balanceResult = await fetchUserBalance(session.userid);
            
            let balanceMsg = '';
            if (balanceResult && !balanceResult.error && balanceResult.balance) {
                balanceMsg = `\nYour balance is: ${balanceResult.balance.formatted}`;
            }
            
            await msg.reply('🎉 OTP verified successfully! \n\n✅ You are now authenticated and ready to use the bot!' + balanceMsg);
        } else {
            await msg.reply('❌ Invalid OTP code!\n\n🔄 Please check your ticket and try again:');
        }
        return;
    }
    
    if (!session.verified) {
        console.log('User not authenticated, blocking access:', chatId);
        await msg.reply('Please complete authentication to use the bot.');
        return;
    }

    const aiResponse = await analyzeUserMessage(msg.body, session);

    
    const thankYouPattern = /(thank\s*you|thanks|shukriya|shukria|dhanyavad|meherbani|meherbaani|tnx|thx|tysm|ty|thank u|thankyou|thanku|thankyou so much|bohot shukriya|bohut shukriya|bohot meherbani|bohut meherbani)/i;
if (thankYouPattern.test(msg.body)) {
    await msg.reply('🙏 Thank you for reaching out to Pak Main SMM! We look forward to assisting you again soon. If you have any more questions or need help, just message me anytime.');
    return;
}

if (aiResponse.intent === 'logout') {
        console.log(`[BOT] User requested logout. Resetting session for ${msg.from}`);
        
        if (OTP_SESSIONS[msg.from]) {
            delete OTP_SESSIONS[msg.from];
        }
        OTP_SESSIONS[msg.from] = { state: 'init', triggered: false };
        
        const logoutMsg = '👋 *Logged out successfully!*\n\n' +
                         '🔄 Starting fresh session...\n\n' +
                         '👤 Please send any message to start the bot:';
        
        console.log(`[BOT] Reply: ${logoutMsg}`);
        await msg.reply(logoutMsg);
        return;
    }
    
    if (aiResponse.intent === 'balance' || aiResponse.intent === 'spent' || aiResponse.intent === 'balance_and_spent') {
        const { fetchUserBalance } = require('./user_balance');
        const { convertCurrency, formatCurrency } = require('./currency_converter');
        const balanceResult = await fetchUserBalance(session.userid);
        
        if (balanceResult.error) {
            const failBalanceMsg = '❌ Could not retrieve your account information: ' + balanceResult.message;
            console.log(`[BOT] Reply: ${failBalanceMsg}`);
            await msg.reply(failBalanceMsg);
        } else if (balanceResult.balance || balanceResult.spent) {
            const balance = balanceResult.balance;
            const spent = balanceResult.spent;
            let msgLines = [];
            
            if (aiResponse.intent === 'balance' || aiResponse.intent === 'balance_and_spent') {
                if (balance) {
                    let balanceText = balance.formatted || (balance.value + ' ' + (balance.currency_code || ''));
                    
                    let requestedCurrency = aiResponse.currency;
                    if (requestedCurrency) {
                        requestedCurrency = requestedCurrency.trim().toUpperCase();
                        console.log(`[BOT] User requested balance in currency: ${requestedCurrency}`);
                    }
                    if (requestedCurrency && balance.value) {
                        const fromCurrency = balance.currency_code || 'USD';
                        const conversion = await convertCurrency(balance.value, fromCurrency, requestedCurrency);
                        
                        if (conversion.success) {
                            const convertedText = formatCurrency(conversion.convertedAmount, requestedCurrency);
                            balanceText = `${convertedText} (converted from ${balanceText})`;
                        } else {
                            
                        }
                    }
                    
                    msgLines.push(`💰 Your current balance: ${balanceText}`);
                }
            }
            
            if (aiResponse.intent === 'spent' || aiResponse.intent === 'balance_and_spent') {
                if (spent) {
                    let spentText = spent.formatted || (spent.value + ' ' + (spent.currency_code || ''));
                    
                    let requestedCurrency = aiResponse.currency;
                    if (requestedCurrency) {
                        requestedCurrency = requestedCurrency.trim().toUpperCase();
                        console.log(`[BOT] User requested spent in currency: ${requestedCurrency}`);
                    }
                    if (requestedCurrency && spent.value) {
                        const fromCurrency = spent.currency_code || 'USD';
                        const conversion = await convertCurrency(spent.value, fromCurrency, requestedCurrency);
                        
                        if (conversion.success) {
                            const convertedText = formatCurrency(conversion.convertedAmount, requestedCurrency);
                            spentText = `${convertedText} (converted from ${spentText})`;
                        } else {
                            spentText = `${spentText} (conversion to ${requestedCurrency} failed)`;
                        }
                    }
                    
                    msgLines.push(`💸 Total spent: ${spentText}`);
                }
            }
            
            const responseMsg = msgLines.join('\n') || '❌ No account information available.';
            console.log(`[BOT] Reply: ${responseMsg}`);
            await msg.reply(responseMsg);
        } else {
            const failBalanceMsg = '❌ Could not retrieve your account information.';
            console.log(`[BOT] Reply: ${failBalanceMsg}`);
            await msg.reply(failBalanceMsg);
        }
        return;
    }
    
    if (aiResponse.intent === 'order_action_incomplete') {
        const helpMsg = `Please provide an order ID. Examples:\n• "${aiResponse.action} 123456,"\n• "123456 ${aiResponse.action}"\n\nAvailable actions: cancel, refill, speed up. \n\nYou can also type multiple ids like : ${aiResponse.action} 123456, 23456, 345643 \n\nType ${aiResponse.action} before the order ids.\n\nMaximum 50 ids can be sent at once `;
        console.log(`[BOT] Reply: ${helpMsg}`);
        await msg.reply(helpMsg);
        return;
    }
    
    if (aiResponse.intent === 'help' || aiResponse.intent === 'command_suggestion') {
        const helpMsg = `🤖 Available commands:\n\n💰 **Account Info:**\n• Balance: "balance", "paisa kitna hai"\n• Spent: "spent", "kitna kharch kiya"\n• Both: "account summary", "balance aur spent"\n\n📦 **Order Management:**\n• Cancel: "cancel 123456", "123456 band karo"\n• Speed up: "speed 123456", "123456 jaldi karo"\n• Refill: "refill 123456", "123456 lost followers"\n• Details: "details 123456", "123456 details"\n\n🔗 **Other:**\n• Services: "services"\n• Website: "site"\n• Help: "help"\n\n💡 **Tips:**\n• Use natural language in English/Hinglish/Urdu\n• Multiple orders: "cancel 123,456,789"\n• Currency: "balance in USD", "INR mein balance"`;
        console.log(`[BOT] Reply: ${helpMsg}`);
        await msg.reply(helpMsg);
        return;
    }

    if (aiResponse.intent === 'services' || /\b(service|services)\b/i.test(msg.body)) {
        const servicesMsg = `🛍️ Check out our services: https://pakmainsmm.com/services`;
        console.log(`[BOT] Reply: ${servicesMsg}`);
        await msg.reply(servicesMsg);
        return;
    }

    if (aiResponse.intent === 'terms' || /\b(terms|terms of service|tos)\b/i.test(msg.body)) {
        const termsMsg = `📋 Terms of Service: https://pakmainsmm.com/terms`;
        console.log(`[BOT] Reply: ${termsMsg}`);
        await msg.reply(termsMsg);
        return;
    }

    if (aiResponse.intent === 'refund_policy' || (/\b(refund|return|refund policy|return policy)\b/i.test(msg.body) && !/\d{4,}/.test(msg.body))) {
        const refundMsg = `💰 Refund Policy: https://pakmainsmm.com/refund-policy`;
        console.log(`[BOT] Reply: ${refundMsg}`);
        await msg.reply(refundMsg);
        return;
    }

    if (aiResponse.intent === 'site' || /\b(site|website|main site)\b/i.test(msg.body)) {
        const siteMsg = `🌐 Visit our website: https://pakmainsmm.com/`;
        console.log(`[BOT] Reply: ${siteMsg}`);
        await msg.reply(siteMsg);
        return;
    }
    
    let orderActionMatch = null;
    
    let sanitizedMsg = msg.body.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ').replace(/\s+/g, ' ').trim();
    const trimmedMsg = sanitizedMsg;
    console.log(`[DEBUG] Checking message: "${trimmedMsg}"`);
    
    let orderIds = [];
    let actionType = null;
    
    const idMatches = trimmedMsg.match(/\d+/g);
    if (idMatches) {
        orderIds = idMatches.filter(id => id.length >= 4);
        console.log(`[DEBUG] Found ${orderIds.length} order IDs: ${orderIds.join(',')}`);
    }
    
    let actionAnywhere = trimmedMsg.match(/(cancel|cance|cnacel|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return|refill|refil|speed\s*up|speedup|sped\s*up|speeed\s*up|speed|sped|speeed|fast|faster|quick|jaldi|tez|teej|tej|teez|jldi|tejj|jaldii|dropped|lost|drop|decrease|kam|gir|girr|bhar|bhar do|bhardo|low)/i);
    if (actionAnywhere) {
        actionType = actionAnywhere[1].toLowerCase().replace(/\s+/g, '');
        if (/speed|sped|speeed|fast|faster|quick|jaldi|tez|teej|tej|teez|jldi|tejj|jaldii/.test(actionType)) {
            actionType = 'speed';
        } else if (/refill|refil|dropped|lost|drop|decrease|kam|gir|girr|bhar|bhardo|low/.test(actionType)) {
            actionType = 'refill';
        } else if (/cancel|cance|cnacel|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return/.test(actionType)) {
            actionType = 'cancel';
        }
        orderIds = (trimmedMsg.match(/\d{4,}/g) || []).map(x => x.trim());
        if (orderIds.length > 0) {
            console.log(`[DEBUG] Universal match: action=${actionType}, orderIds=${orderIds.join(',')}`);
        } else {
            console.log(`[DEBUG] Action found but no valid order IDs`);
        }
    }
    
    let match = null;
    if (orderIds.length > 0 && actionType) {
        match = [null, actionType, orderIds.join(',')];
        console.log(`[DEBUG] Created match: action=${actionType}, orderIds=${orderIds.join(',')}, count=${orderIds.length}`);
    }

    let orderId = null;
    if (match) {
        actionType = match[1];
        orderId = match[2];
        if (actionType && orderId) {
            orderActionMatch = true;
            console.log(`[DEBUG] Parsed: actionType=${actionType}, orderId=${orderId}, count=${orderIds.length}`);
        } else {
            console.log(`[DEBUG] Match found but actionType or orderId missing. actionType=`, actionType, 'orderId=', orderId);
        }
    } else {
        console.log(`[DEBUG] No order IDs or action found`);
    }
    
    if (!orderActionMatch) {
    const commandPattern = /(cancel|stop|cancell?e?d?|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return|refill|refil|renew|reorder|top\s*up|replenish|restock|resupply|bhar|bhardo|gir|girr|speed|sped|speeed|fast|faster|quick|jaldi|tez|teej|tej|teez|jldi|tejj|jaldii|increase)/i;
    const hasCommand = commandPattern.test(msg.body);
    const hasOrderId = /\d{4,}/.test(msg.body);
    if (hasCommand && !hasOrderId) {
        await msg.reply('Please send your Order ID with command✨\n📌 Example: 123456 refill/cancel/speed');
        return;
    }

        const detailsPattern = /\b(details?|detail)\b[\s:,-]*(order)?[\s:,-]*(\d+)/i;
        const reverseDetailsPattern = /^(\d+)[\s:,-]*(details?|detail)\b/i;
        let detailsMatch = msg.body.trim().match(detailsPattern);
        let reverseMatch = msg.body.trim().match(reverseDetailsPattern);
        let orderId = null;
        if (detailsMatch) {
            orderId = detailsMatch[3];
        } else if (reverseMatch) {
            orderId = reverseMatch[1];
        }
        if (orderId) {
            const { fetchOrderById } = require('./order_api');
            const orderResult = await fetchOrderById(orderId);
            if (!orderResult || !orderResult.data) {
                await msg.reply(`❌ Could not find order #${orderId}. Please check the order ID and try again.`);
                return;
            }
            const order = orderResult.data;
            if (order.user?.toLowerCase() !== session.userid?.toLowerCase()) {
                await msg.reply(`⛔ You don't have permission to view order #${orderId}.`);
                return;
            }
            let detailsMsg = `📦 Order #${orderId} details:\n`;
            detailsMsg += `• Service: ${order.service_name || 'N/A'}\n`;
            detailsMsg += `• Link: ${order.link || 'N/A'}\n`;
            detailsMsg += `• Status: ${order.status || 'N/A'}\n`;
            detailsMsg += `• Price: ${order.charge?.formatted || order.charge?.value + ' ' + (order.charge?.currency_code || '') || 'N/A'}\n`;
            detailsMsg += `• Quantity: ${order.quantity || 'N/A'}`;
            await msg.reply(detailsMsg);
            return;
        }
        const onlyOrderIdMatch = msg.body.trim().match(/^(\d+)$/);
        if (onlyOrderIdMatch) {
            const orderId = onlyOrderIdMatch[1];
            const { fetchOrderById } = require('./order_api');
            const orderResult = await fetchOrderById(orderId);
            if (!orderResult || !orderResult.data) {
                await msg.reply(`❌ Could not find order #${orderId}. Please check the order ID and try again.`);
                return;
            }
            const order = orderResult.data;
            if (order.user?.toLowerCase() !== session.userid?.toLowerCase()) {
                await msg.reply(`⛔ You don't have permission to view order #${orderId}.`);
                return;
            }
            await msg.reply(`What do you want to do with order #${orderId}?\nReply with one of: details, cancel, refill, speed`);
            return;
        }
    }
    if (!global.userCooldowns) global.userCooldowns = {};
const userCooldowns = global.userCooldowns;

if (orderActionMatch) {
    let priorityAction = null;
    const lowerMsg = msg.body.toLowerCase();
    if (/(cancel|stop|cancell?e?d?|rok|rokk|rook|ruk|band|bnd|wapis|wpis|vapis|refund|return)/i.test(lowerMsg)) {
        priorityAction = 'cancel';
    } else if (/(refill|refil|renew|reorder|top\s*up|replenish|restock|resupply|bhar|bhardo|gir|girr|dropped|lost|drop|decrease|kam|low)/i.test(lowerMsg)) {
        priorityAction = 'refill';
    } else if (/(speed|sped|speeed|fast|faster|quick|jaldi|tez|teej|tej|teez|jldi|tejj|jaldii|increase)/i.test(lowerMsg)) {
        priorityAction = 'speed';
    }
    if (priorityAction && actionType !== priorityAction) {
        actionType = priorityAction;
    }

    const now = Date.now();
    const orderIdsArray = orderId.replace(/\s+/g, '').split(',').map(id => id.trim()).filter(id => id.length > 0);
    
    for (const singleOrderId of orderIdsArray) {
        const cooldownKey = `${session.userid || msg.from}|${singleOrderId}|${actionType}`;
        const cooldown = userCooldowns[cooldownKey];
        if (cooldown && now - cooldown < 180 * 60 * 1000) {
            await msg.reply('⏳ Please wait for 3 hours before sending another request');
            return;
        }
    }
    
    for (const singleOrderId of orderIdsArray) {
        const cooldownKey = `${session.userid || msg.from}|${singleOrderId}|${actionType}`;
        userCooldowns[cooldownKey] = now;
    }
        if (!orderId) {
            await msg.reply('Please provide an order ID. Example: "Cancel order 123" or "123 cancel.\nYou can use multiple ids also like:  123456,234567,345678"');
            return;
        }
        if (!actionType) {
            await msg.reply('Please specify an action (cancel, refill, speed).');
            return;
        }

        let orderIds = orderId.replace(/\s+/g, '').split(',').map(id => id.trim()).filter(id => id.length > 0);
        orderIds = [...new Set(orderIds)];
        const isSingleOrder = orderIds.length === 1;
        const { fetchOrderById } = require('./order_api');
        
        const orders = [];
        const notFound = [];
        const noPermission = [];
        
        for (const id of orderIds) {
            const orderResult = await fetchOrderById(id);
            if (!orderResult || !orderResult.data) {
                notFound.push(id);
            } else if (orderResult.data.user?.toLowerCase() !== session.userid?.toLowerCase()) {
                noPermission.push(id);
            } else {
                orders.push({ id, data: orderResult.data });
            }
        }
        
        if (notFound.length > 0) {
            await msg.reply(`❌ Could not find orders: ${notFound.join(', ')}`);
        }
        if (noPermission.length > 0) {
            await msg.reply(`⛔ No permission for orders: ${noPermission.join(', ')}`);
        }
        if (orders.length === 0) {
            return;
        }

        if (actionType === 'cancel') {
            if (isSingleOrder) {
                const order = orders[0];
                const normalizedStatus = order.data.status?.toLowerCase().replace(/_/g, ' ');
                if (["pending", "in progress", "processing"].includes(normalizedStatus)) {
                    const { getGroupIdForProvider } = require('./provider_groups');
                    const provider = order.data.provider;
                    const groupId = getGroupIdForProvider(provider);
                    
                    if (groupId && groupId !== '120363422970660711@g.us') {
                        const forwardMsg = `${order.data.external_id} cancel`;
                        console.log(`[FORWARD] Sending to group ${groupId} (provider: ${provider}): "${forwardMsg}"`);
                        console.log(`[MESSAGE] → Group: ${provider} | Command: "${forwardMsg}" | Order: #${order.id}`);
                        await client.sendMessage(groupId, forwardMsg);
                        console.log(`[FORWARD] ✅ Successfully sent cancel request for order #${order.id} to provider group`);
                        await msg.reply(`✅ Cancel request processed for order #${order.id}.\n\n⏰ Please note: Cancel can take up to 24 hours.`);
                    } else {
                        const supportGroupId = '120363422970660711@g.us';
                        const forwardMsg = `Provider Group not found\n\nOrder id : ${order.id}\nCommand : cancel\nProvider : ${order.data.provider || 'N/A'}\nExternal Id : ${order.data.external_id || 'N/A'}`;
                        console.log(`[FORWARD] Sending to support issues group: "${forwardMsg}"`);
                        await client.sendMessage(supportGroupId, forwardMsg);
                        console.log(`[FORWARD] ✅ Successfully sent cancel request for order #${order.id} to support issues group`);
                        await msg.reply(`Cancel not possible contact with support team:\n\n+12268010890`);
                    }
                } else {
                    await msg.reply(`Order #${order.id} cannot be cancelled (status: ${order.data.status || 'unknown'}).`);
                }
            } else {
                const eligible = [];
                const completed = [];
                const canceled = [];
                const other = [];
                
                for (const order of orders) {
                    const normalizedStatus = order.data.status?.toLowerCase().replace(/_/g, ' ');
                    if (["pending", "in progress", "processing"].includes(normalizedStatus)) {
                        eligible.push(order.id);
                    } else if (["completed", "partial"].includes(normalizedStatus)) {
                        completed.push(order.id);
                    } else if (["canceled", "cancelled"].includes(normalizedStatus)) {
                        canceled.push(order.id);
                    } else {
                        other.push(order.id);
                    }
                }
                
                let statusMsg = '';
                if (completed.length > 0) statusMsg += `These are completed ✅: ${completed.join(', ')}\n`;
                if (canceled.length > 0) statusMsg += `These are canceled ❌: ${canceled.join(', ')}\n`;
                if (other.length > 0) statusMsg += `These have other status: ${other.join(', ')}\n`;
                if (eligible.length > 0) {
                    statusMsg += `These orders can be cancelled: ${eligible.join(', ')}\n`;
                    const { groupOrdersByProvider } = require('./provider_groups');
                    const eligibleOrders = orders.filter(o => eligible.includes(o.id));
                    const grouped = groupOrdersByProvider(eligibleOrders);
                    
                    for (const [provider, orderIds] of Object.entries(grouped)) {
                        const { getGroupIdForProvider } = require('./provider_groups');
                        const groupId = getGroupIdForProvider(provider);
                        
                        if (groupId && groupId !== '120363422970660711@g.us' && provider !== 'unknown') {
                            const forwardMsg = `${orders.filter(o=>orderIds.includes(o.id)).map(o=>o.data.external_id).join(',')} cancel`;
                            console.log(`[FORWARD] Sending to group ${groupId} (provider: ${provider}): "${forwardMsg}"`);
                            console.log(`[MESSAGE] → Group: ${provider} | Command: "${forwardMsg}" | Orders: ${orderIds.length} orders`);
                            await client.sendMessage(groupId, forwardMsg);
                            console.log(`[FORWARD] ✅ Successfully sent cancel request for orders ${orderIds.join(', ')} to provider group`);
                            statusMsg += `✅ Processed: ${orderIds.join(', ')}\n⏰ Please note: Cancel can take up to 24 hours.\n`;
                        } else {
                            // Forward to support issues group for orders with no provider/external_id/domain
                            const supportGroupId = '120363422970660711@g.us';
                            const supportOrders = orders.filter(o => orderIds.includes(o.id));
                            for (const order of supportOrders) {
                                const forwardMsg = `Provider Group not found\n\nOrder id : ${order.id}\nCommand : cancel\nProvider : ${order.data.provider || 'N/A'}\nExternal Id : ${order.data.external_id || 'N/A'}`;
                                console.log(`[FORWARD] Sending to support issues group: "${forwardMsg}"`);
                                await client.sendMessage(supportGroupId, forwardMsg);
                            }
                            console.log(`[FORWARD] ✅ Successfully sent cancel request for orders ${orderIds.join(', ')} to support issues group`);
                            statusMsg += `Cancel not possible contact with support team:\n\nOrder for which you have to contact support team: ${orderIds.join(', ')}\n\n+12268010890\n`;
                        }
                    }
                }
                
                await msg.reply(statusMsg || 'No orders processed.');
            }
            return;
        } else if (actionType === 'speed') {
            const { processSpeedUpRequest } = require('./order_api');
            
            if (isSingleOrder) {
                const order = orders[0];
                const result = processSpeedUpRequest(order.data);
                
                if (result.success) {
                    const { getGroupIdForProvider } = require('./provider_groups');
                    const provider = order.data.provider;
                    const groupId = getGroupIdForProvider(provider);
                    
                    if (groupId && groupId !== '120363422970660711@g.us') {
                        const forwardMsg = `${order.data.external_id} speed`;
                        console.log(`[FORWARD] Sending to group ${groupId} (provider: ${provider}): "${forwardMsg}"`);
                        console.log(`[MESSAGE] → Group: ${provider} | Command: "${forwardMsg}" | Order: #${order.id}`);
                        await client.sendMessage(groupId, forwardMsg);
                        console.log(`[FORWARD] ✅ Successfully sent speed request for order #${order.id} to provider group`);
                        await msg.reply(result.message);
                    } else {
                        const supportGroupId = '120363422970660711@g.us';
                        const forwardMsg = `Provider Group not found\n\nOrder id : ${order.id}\nCommand : speed\nProvider : ${order.data.provider || 'N/A'}\nExternal Id : ${order.data.external_id || 'N/A'}`;
                        console.log(`[FORWARD] Sending to support issues group: "${forwardMsg}"`);
                        await client.sendMessage(supportGroupId, forwardMsg);
                        console.log(`[FORWARD] ✅ Successfully sent speed request for order #${order.id} to support issues group`);
                        await msg.reply(`Speed not possible contact with support team:\n\n+12268010890`);
                    }
                } else {
                    await msg.reply(result.message);
                }
            } else {
                const results = [];
                const eligible = [];
                
                for (const order of orders) {
                    const result = processSpeedUpRequest(order.data);
                    results.push({ id: order.id, result });
                    
                    if (result.success) {
                        eligible.push(order.id);
                    }
                }
                
                let statusMsg = '';
                const processed = [];
                
                for (const result of results) {
                    if (result.result.success) {
                        processed.push(result.id);
                        statusMsg += `Speed up processed ⚡: ${result.id}\n`;
                    } else {
                        statusMsg += `Speed not possible - ${result.result.message.toLowerCase().includes('completed') || result.result.message.toLowerCase().includes('partial') ? 'completed/partial' : result.result.message.toLowerCase().includes('canceled') ? 'canceled' : 'not ready'} ${result.result.message.toLowerCase().includes('completed') || result.result.message.toLowerCase().includes('partial') ? '✅' : result.result.message.toLowerCase().includes('canceled') ? '❌' : ''}: ${result.id}\n`;
                    }
                }
                
                if (processed.length > 0) {
                    const { groupOrdersByProvider } = require('./provider_groups');
                    const processedOrders = orders.filter(o => processed.includes(o.id));
                    const grouped = groupOrdersByProvider(processedOrders);
                    
                    for (const [provider, orderIds] of Object.entries(grouped)) {
                        const { getGroupIdForProvider } = require('./provider_groups');
                        const groupId = getGroupIdForProvider(provider);
                        
                        if (groupId && groupId !== '120363422970660711@g.us' && provider !== 'unknown') {
                            const forwardMsg = `${orders.filter(o=>orderIds.includes(o.id)).map(o=>o.data.external_id).join(',')} speed`;
                            console.log(`[FORWARD] Sending to group ${groupId} (provider: ${provider}): "${forwardMsg}"`);
                            console.log(`[MESSAGE] → Group: ${provider} | Command: "${forwardMsg}" | Orders: ${orderIds.length} orders`);
                            await client.sendMessage(groupId, forwardMsg);
                            console.log(`[FORWARD] ✅ Successfully sent speed request for orders ${orderIds.join(', ')} to provider group`);
                            statusMsg += `✅ Processed: ${orderIds.join(', ')}\n`;
                        } else {
                            const supportGroupId = '120363422970660711@g.us';
                            const supportOrders = orders.filter(o => orderIds.includes(o.id));
                            for (const order of supportOrders) {
                                const forwardMsg = `Provider Group not found\n\nOrder id : ${order.id}\nCommand : speed\nProvider : ${order.data.provider || 'N/A'}\nExternal Id : ${order.data.external_id || 'N/A'}`;
                                console.log(`[FORWARD] Sending to support issues group: "${forwardMsg}"`);
                                await client.sendMessage(supportGroupId, forwardMsg);
                            }
                            console.log(`[FORWARD] ✅ Successfully sent speed request for orders ${orderIds.join(', ')} to support issues group`);
                            statusMsg += `Speed not possible contact with support team:\n\nOrder for which you have to contact support team: ${orderIds.join(', ')}\n\n+12268010890\n`;
                        }
                    }
                }
                
                await msg.reply(statusMsg || 'No orders processed.');
            }
            return;
        } else if (actionType === 'refill') {
            if (isSingleOrder) {
                const order = orders[0];
                if (order.data.status?.toLowerCase() !== 'completed') {
                    await msg.reply(`Order #${order.id} is not eligible for refill (status: ${order.data.status || 'unknown'})`);
                } else {
                    const serviceName = order.data.service_name || '';
                    let refillNoPattern = /Refill\s*:\s*No/i;
                    let refillLifetimePattern = /Refill\s*:\s*Lifetime/i;
                    let refillDaysPattern = /Refill\s*:\s*(\d+)\s*Days/i;
                    
                    if (refillNoPattern.test(serviceName)) {
                        await msg.reply(`Refill not available for order #${order.id}.`);
                    } else if (refillLifetimePattern.test(serviceName)) {
                        const { getGroupIdForProvider } = require('./provider_groups');
                        const provider = order.data.provider;
                        const groupId = getGroupIdForProvider(provider);
                        
                        if (groupId && groupId !== '120363422970660711@g.us') {
                            const forwardMsg = `${order.data.external_id} refill`;
                            console.log(`[FORWARD] Sending to group ${groupId} (provider: ${provider}): "${forwardMsg}"`);
                            console.log(`[MESSAGE] → Group: ${provider} | Command: "${forwardMsg}" | Order: #${order.id}`);
                            await client.sendMessage(groupId, forwardMsg);
                            console.log(`[FORWARD] ✅ Successfully sent refill request for order #${order.id} to provider group`);
                            await msg.reply(`✅ Refill request processed for order #${order.id}.\n\n⏰ Please note: Refill can take up to 24 hours.`);
                        } else {
                            const supportGroupId = '120363422970660711@g.us';
                            const forwardMsg = `Provider Group not found\n\nOrder id : ${order.id}\nCommand : refill\nProvider : ${order.data.provider || 'N/A'}\nExternal Id : ${order.data.external_id || 'N/A'}`;
                            console.log(`[FORWARD] Sending to support issues group: "${forwardMsg}"`);
                            await client.sendMessage(supportGroupId, forwardMsg);
                            console.log(`[FORWARD] ✅ Successfully sent refill request for order #${order.id} to support issues group`);
                            await msg.reply(`Refill not possible contact with support team:\n\n+12268010890`);
                        }
                    } else {
                        let match = serviceName.match(refillDaysPattern);
                        if (match) {
                            const refillDays = parseInt(match[1], 10);
                            const createdDate = order.data.created;
                            if (createdDate) {
                                const created = new Date(createdDate.replace(' ', 'T'));
                                const now = new Date();
                                const msSince = now - created;
                                const msAllowed = refillDays * 24 * 60 * 60 * 1000;
                                if (msSince > msAllowed) {
                                    await msg.reply(`❌ Refill period has been expired for order #${order.id}.`);
                                } else {
                                    const { getGroupIdForProvider } = require('./provider_groups');
                                    const provider = order.data.provider;
                                    const groupId = getGroupIdForProvider(provider);
                                    
                                    if (groupId && groupId !== '120363422970660711@g.us') {
                                        const forwardMsg = `${order.data.external_id} refill`;
                                        console.log(`[FORWARD] Sending to group ${groupId} (provider: ${provider}): "${forwardMsg}"`);
                                        console.log(`[MESSAGE] → Group: ${provider} | Command: "${forwardMsg}" | Order: #${order.id}`);
                                        await client.sendMessage(groupId, forwardMsg);
                                        console.log(`[FORWARD] ✅ Successfully sent refill request for order #${order.id} to provider group`);
                                        await msg.reply(`✅ Refill request processed for order #${order.id}.\n\n⏰ Please note: Refill can take up to 24 hours.`);
                                    } else {
                                        const supportGroupId = '120363422970660711@g.us';
                                        const forwardMsg = `Provider Group not found\n\nOrder id : ${order.id}\nCommand : refill\nProvider : ${order.data.provider || 'N/A'}\nExternal Id : ${order.data.external_id || 'N/A'}`;
                                        console.log(`[FORWARD] Sending to support issues group: "${forwardMsg}"`);
                                        await client.sendMessage(supportGroupId, forwardMsg);
                                        console.log(`[FORWARD] ✅ Successfully sent refill request for order #${order.id} to support issues group`);
                                        await msg.reply(`Refill not possible contact with support team:\n\n+12268010890`);
                                    }
                                }
                            } else {
                                await msg.reply(`Could not determine order creation date for refill eligibility.`);
                            }
                        } else {
                            await msg.reply(`Refill policy not found in service name for order #${order.id}.`);
                        }
                    }
                }
            } else {
                const eligible = [];
                const notCompleted = [];
                const noRefill = [];
                const expired = [];
                
                for (const order of orders) {
                    if (order.data.status?.toLowerCase() !== 'completed') {
                        notCompleted.push(order.id);
                        continue;
                    }
                    
                    const serviceName = order.data.service_name || '';
                    let refillNoPattern = /Refill\s*:\s*No/i;
                    let refillLifetimePattern = /Refill\s*:\s*Lifetime/i;
                    let refillDaysPattern = /Refill\s*:\s*(\d+)\s*Days/i;
                    
                    if (refillNoPattern.test(serviceName)) {
                        noRefill.push(order.id);
                    } else if (refillLifetimePattern.test(serviceName)) {
                        eligible.push(order.id);
                    } else {
                        let match = serviceName.match(refillDaysPattern);
                        if (match) {
                            const refillDays = parseInt(match[1], 10);
                            const createdDate = order.data.created;
                            if (createdDate) {
                                const created = new Date(createdDate.replace(' ', 'T'));
                                const now = new Date();
                                const msSince = now - created;
                                const msAllowed = refillDays * 24 * 60 * 60 * 1000;
                                if (msSince > msAllowed) {
                                    expired.push(order.id);
                                } else {
                                    eligible.push(order.id);
                                }
                            } else {
                                noRefill.push(order.id);
                            }
                        } else {
                            noRefill.push(order.id);
                        }
                    }
                }
                
                let statusMsg = '';
                if (notCompleted.length > 0) statusMsg += `These are not completed: ${notCompleted.join(', ')}\n`;
                if (noRefill.length > 0) statusMsg += `Refill not available ❌: ${noRefill.join(', ')}\n`;
                if (expired.length > 0) statusMsg += `❌ Refill period has been expired for: ${expired.join(', ')}\n`;
                if (eligible.length > 0) {
                    statusMsg += `These orders can be refilled: ${eligible.join(', ')}\n`;
                    const { groupOrdersByProvider } = require('./provider_groups');
                    const eligibleOrders = orders.filter(o => eligible.includes(o.id));
                    const grouped = groupOrdersByProvider(eligibleOrders);
                    
                    for (const [provider, orderIds] of Object.entries(grouped)) {
                        const { getGroupIdForProvider } = require('./provider_groups');
                        const groupId = getGroupIdForProvider(provider);
                        
                        if (groupId && groupId !== '120363422970660711@g.us' && provider !== 'unknown') {
                            const forwardMsg = `${orders.filter(o=>orderIds.includes(o.id)).map(o=>o.data.external_id).join(',')} refill`;
                            console.log(`[FORWARD] Sending to group ${groupId} (provider: ${provider}): "${forwardMsg}"`);
                            console.log(`[MESSAGE] → Group: ${provider} | Command: "${forwardMsg}" | Orders: ${orderIds.length} orders`);
                            await client.sendMessage(groupId, forwardMsg);
                            console.log(`[FORWARD] ✅ Successfully sent refill request for orders ${orderIds.join(', ')} to provider group`);
                            statusMsg += `✅ Processed: ${orderIds.join(', ')}\n⏰ Please note: Refill can take up to 24 hours.\n`;
                        } else {
                            const supportGroupId = '120363422970660711@g.us';
                            const supportOrders = orders.filter(o => orderIds.includes(o.id));
                            for (const order of supportOrders) {
                                const forwardMsg = `Provider Group not found\n\nOrder id : ${order.id}\nCommand : refill\nProvider : ${order.data.provider || 'N/A'}\nExternal Id : ${order.data.external_id || 'N/A'}`;
                                console.log(`[FORWARD] Sending to support issues group: "${forwardMsg}"`);
                                await client.sendMessage(supportGroupId, forwardMsg);
                            }
                            console.log(`[FORWARD] ✅ Successfully sent refill request for orders ${orderIds.join(', ')} to support issues group`);
                            statusMsg += `Refill not possible contact with support team:\n\nOrder for which you have to contact support team: ${orderIds.join(', ')}\n\n+12268010890\n`;
                        }
                    }
                }
                
                await msg.reply(statusMsg || 'No orders processed.');
            }
            return;
        }
    }
        if (orderActionMatch) {
        return;
    }
    
    if (aiResponse.intent === 'general') {
        const lowerMsg = msg.body.toLowerCase();
        const hasNumbers = /\d{4,}/.test(msg.body);
        const hasActionWords = /(cancel|speed|refill|balance|spent|help|detail)/i.test(msg.body);
        
        if (hasNumbers || hasActionWords || aiResponse.confidence < 0.5) {
            const suggestionMsg = `🤔 I'm not sure what you're trying to do. Here are the available commands:\n\n💰 *Account Info:*\n• "balance" or "paisa kitna hai"\n• "spent" or "kitna kharch kiya"\n\n📦 *Order Management:*\n• "cancel 123456" or "cancel 123456"\n• "speed 123456" or " speed 123456 "\n• "refill 123456" or "refill 253637, 338488, 123456 lost followers"\n• "details 123456"\n\n❓ *Need Help?*`;
            console.log(`[BOT] Reply: ${suggestionMsg}`);
            await msg.reply(suggestionMsg);
        } else if (aiResponse.reply) {
            console.log(`[BOT] Reply: ${aiResponse.reply}`);
            await msg.reply(aiResponse.reply);
        } else {
            const fallbackMsg = `🤖 I'm here to help with your orders and account! Type "help" to see all available commands, or try:\n• "balance" - check your balance\n• "spent" - see total spent\n• "cancel 123456" - cancel an order\n• "speed 123456" - speed up an order`;
            console.log(`[BOT] Reply: ${fallbackMsg}`);
            await msg.reply(fallbackMsg);
        }
        return;
    }

    try {
        const systemPrompt = `You are a WhatsApp chatbot for order management and OTP verification.\n\nContext:\n- Users interact via WhatsApp.\n- You must handle: OTP verification, speed up/cancel/refill/balance/spent commands, and help.\n- All messages may be in English or Urdu.\n- Use structured JSON responses: {intent, parameters, reply}.\n- If OTP flow is not complete, manage OTP state.\n- If order command, extract IDs, action, and reply with summary.\n- If balance/spent, reply with user's info.\n- If you need to call an API, reply with {intent: 'api_call', api: '...', params: {...}}.\n- If you need to forward to provider group, reply with {intent: 'forward', action: '...', order_ids: [...]}\n- If user is not verified, always start with OTP flow.\n- If you need to ask user something, reply with {intent: 'ask', question: '...'}\n- Always reply in JSON.\n\nCurrent session: ${JSON.stringify(session)}\n`;
        const userPrompt = msg.body;
        const aiRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 512
        });
        let aiReply = aiRes.choices[0]?.message?.content;
        let parsed;
        try { parsed = JSON.parse(aiReply); } catch (e) { parsed = { reply: aiReply }; }
        if (parsed.reply) await msg.reply(parsed.reply);
        if (parsed.intent === 'set_session') {
            Object.assign(session, parsed.parameters || {});
        }
        if (parsed.intent === 'api_call') {
            
        }
        if (parsed.intent === 'forward') {
            const groupId = PROVIDER_GROUPS[parsed.provider];
            if (groupId) {
                const forwardMsg = `${parsed.order_external_ids ? parsed.order_external_ids.join(',') : parsed.order_ids.join(',')} ${parsed.action}`;
                console.log(`[FORWARD] Sending to group ${groupId} (provider: ${parsed.provider}): "${forwardMsg}"`);
                console.log(`[MESSAGE] → Group: ${parsed.provider} | Command: "${forwardMsg}" | Orders: ${parsed.order_ids.length} orders`);
                await client.sendMessage(groupId, forwardMsg);
                console.log(`[FORWARD] ✅ Successfully sent ${parsed.action} request to provider group`);
                await msg.reply(`Forwarded to provider group (${parsed.provider}): ${forwardMsg}`);
            } else if (parsed.intent === 'forward' && (!parsed.order_ids || parsed.order_ids.length === 0)) {
                const actionType = parsed.action || 'action';
                await msg.reply(`Please send your Order ID with the command ✨\n📌 Example:\n${actionType} 173625`);
            } else {
                await msg.reply('Sorry, something went wrong while processing your request. Please try with correct spellings for "cancel", "refill" and "speed/speed up".');
            }
        }
    } catch (aiErr) {
        console.error('[AI ERROR]', aiErr);
        await msg.reply('❌ AI processing error. Please try again or type "help" for available commands.');
    }
    
    } catch (err) {
        console.error('[BOT ERROR]', err);
        try {
            await msg.reply('❌ Something went wrong. Please try again or type "help" for available commands.');
        } catch (replyErr) {
            console.error('[BOT REPLY ERROR]', replyErr);
        }
    }
});

console.log('Starting WhatsApp client initialization...');
client.initialize().catch(err => {
    console.error('Failed to initialize client:', err);
});
