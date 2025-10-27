const axios = require('axios');

const CLIENT_API_BASE = process.env.CLIENT_API_BASE;
const API_KEY = process.env.API_KEY;

async function fetchOrderById(orderId) {
    const url = `${CLIENT_API_BASE}orders/${orderId}`;
    try {
        const res = await axios.get(url, {
            headers: {
                'X-Api-Key': API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });
        return res.data;
    } catch (e) {
        return { error: true, message: e?.response?.data?.error_message || e.message };
    }
}

async function fetchOrdersByIds(orderIds) {
    const url = `${CLIENT_API_BASE}orders`;
    try {
        const res = await axios.get(url, {
            headers: {
                'X-Api-Key': API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            params: { order: orderIds.join(',') }
        });
        return res.data;
    } catch (e) {
        return { error: true, message: e?.response?.data?.error_message || e.message };
    }
}

function extractStartTime(serviceName) {
    if (!serviceName) return null;
    
    const match = serviceName.match(/Start\s*:\s*0-(\d+)\s*(minutes?|hours?)/i);
    if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        if (unit.startsWith('minute')) {
            return value;
        } else if (unit.startsWith('hour')) {
            return value * 60;
        }
    }
    return null;
}

function hasStartTimePassed(createdTime, startTimeMinutes) {
    if (!createdTime || !startTimeMinutes) return false;
    
    const createdDate = new Date(createdTime);
    const now = new Date();
    const elapsedMinutes = (now - createdDate) / (1000 * 60);
    
    return elapsedMinutes >= startTimeMinutes;
}

function processSpeedUpRequest(order) {
    const orderId = order.id;
    const status = order.status?.toLowerCase();
    const serviceName = order.service_name;
    const createdTime = order.created;
    
    if (['completed', 'partial', 'canceled'].includes(status)) {
        return {
            success: false,
            message: `Speed not possible, order is already ${status}.`
        };
    }
    
    if (['pending', 'in progress', 'processing', 'in_progress'].includes(status)) {
        const startTimeMinutes = extractStartTime(serviceName);
        console.log(`[DEBUG] Order ${orderId}: status=${status}, serviceName="${serviceName}", startTimeMinutes=${startTimeMinutes}, createdTime=${createdTime}`);
        
        if (startTimeMinutes && hasStartTimePassed(createdTime, startTimeMinutes)) {
            return {
                success: true,
                message: `Your request to speed up order id ${orderId} has been processed✅.\n\nPlease note, it may take upto 6 hours to speed up.`
            };
        } else if (startTimeMinutes) {
            // Calculate remaining time
            const createdDate = new Date(createdTime);
            const now = new Date();
            const elapsedMinutes = Math.floor((now - createdDate) / (1000 * 60));
            const remainingMinutes = Math.max(0, startTimeMinutes - elapsedMinutes);
            const startTimeFormatted = createdDate.toLocaleString('en-GB', { hour12: false });
            let remainingFormatted;
            if (remainingMinutes >= 60) {
                const hrs = Math.floor(remainingMinutes / 60);
                const mins = remainingMinutes % 60;
                remainingFormatted = `${hrs} hour${hrs !== 1 ? 's' : ''}${mins > 0 ? ' ' + mins + ' min' : ''}`;
            } else {
                remainingFormatted = `${remainingMinutes} min`;
            }
            return {
                success: false,
                message: `Order is still within its start time window (${serviceName.match(/Start\s*:\s*0-\d+\s*(?:minutes?|hours?)/i)?.[0]?.replace(/Start\s*:\s*/, '') || 'unknown'}). Speed up not yet possible.\n\nThe start time of this order is ${serviceName.match(/Start\s*:\s*0-\d+\s*(?:minutes?|hours?)/i)?.[0]?.replace(/Start\s*:\s*/, '') || 'unknown'}. If the order is not completed by then, you may request a speed-up.`,
                startTime: startTimeFormatted,
                remainingTime: remainingFormatted
            };

        } else {
            return {
                success: true,
                message: `Your request to speed up order id ${orderId} has been processed✅.\n\nPlease note, it may take upto 6 hours to speed up.`
            };
        }
    }
    
    return {
        success: false,
        message: `Cannot process speed up for order ${orderId} with status: ${status}.`
    };
}

module.exports = { fetchOrderById, fetchOrdersByIds, processSpeedUpRequest };
