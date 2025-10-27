const axios = require('axios');
const CLIENT_API_BASE = process.env.CLIENT_API_BASE;

async function fetchUserBalance(username) {
    console.log('[API] Fetching balance for:', username);
    try {
        const res = await axios.get(`${CLIENT_API_BASE}users`, {
            headers: {
                'X-Api-Key': process.env.API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            params: { username }
        });
        console.log('[API] Balance response:', res.data);
        if (!res.data || !res.data.data || !Array.isArray(res.data.data.list)) {
            return { error: true, message: 'Unexpected API response' };
        }
        const user = res.data.data.list.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
        if (!user) {
            return { error: true, message: 'User not found' };
        }
        return {
            balance: user.balance,
            spent: user.spent
        };
    } catch (e) {
        console.log('[API] Balance fetch error:', e?.response?.data?.message || e.message);
        return { error: true, message: e?.response?.data?.message || 'API error' };
    }
}

module.exports = { fetchUserBalance };

