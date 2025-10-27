const axios = require('axios');

const OTP_SESSIONS = {};

const CLIENT_API_BASE = process.env.CLIENT_API_BASE;

async function requestOtp(username) {
    console.log('[API] Requesting OTP for:', username);
    try {
        const res = await axios.post(`${CLIENT_API_BASE}generate-otp`, { username });
        console.log('[API] OTP request response:', res.data);
        return res.data;
    } catch (e) {
        console.log('[API] OTP request error:', e?.response?.data?.message || e.message);
        return { error: true, message: e?.response?.data?.message || 'API error' };
    }
}

async function verifyOtp(username, otp) {
    console.log('[API] Verifying OTP for:', username, 'OTP:', otp);
    try {
        const res = await axios.post(`${CLIENT_API_BASE}verify-otp`, { username, otp });
        console.log('[API] OTP verify response:', res.data);
        return res.data;
    } catch (e) {
        console.log('[API] OTP verify error:', e?.response?.data?.message || e.message);
        return { error: true, message: e?.response?.data?.message || 'API error' };
    }
}

module.exports = {
    OTP_SESSIONS,
    requestOtp,
    verifyOtp
};
