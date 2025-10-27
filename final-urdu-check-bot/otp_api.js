const axios = require('axios');

const API_BASE_URL = 'https://pakmainsmm.com/adminapi/v2';
const API_KEY = process.env.API_KEY || '';

async function createOTPTicket(username) {
    try {
        const otpCode = generateOTP();
        const response = await axios.post(`${API_BASE_URL}/tickets/add`, {
            subject: 'OTP Verification',
            message: `Your OTP verification code is: ${otpCode}`,
            username: username
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': API_KEY
            }
        });

        console.log(`[OTP API] Created ticket for user: ${username}, OTP: ${otpCode}`);
        console.log(`[OTP API] Full response:`, JSON.stringify(response.data, null, 2));
        return { ...response.data, otpCode };
    } catch (error) {
        console.error('[OTP API] Error creating OTP ticket:', error.response?.data || error.message);
        return null;
    }
}

async function verifyOTP(ticketId, userOTP) {
    try {
        const response = await axios.get(`${API_BASE_URL}/tickets/${ticketId}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': API_KEY
            }
        });

        console.log(`[OTP API] Fetched ticket ${ticketId} for verification`);
        
        if (response.data && response.data.data && response.data.data.messages) {
            const messages = response.data.data.messages;
            const latestMessage = messages[messages.length - 1];
            
            if (latestMessage && latestMessage.message) {
                const otpMatch = latestMessage.message.match(/Your OTP verification code is: (\d{6})/);
                if (otpMatch) {
                    const actualOTP = otpMatch[1];
                    return actualOTP === userOTP.toString();
                }
            }
        }
        
        return false;
    } catch (error) {
        console.error('[OTP API] Error verifying OTP:', error.response?.data || error.message);
        return false;
    }
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
    createOTPTicket,
    verifyOTP,
    generateOTP
};
