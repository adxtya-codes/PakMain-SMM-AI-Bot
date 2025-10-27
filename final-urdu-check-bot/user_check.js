const axios = require('axios');
const CLIENT_API_BASE = process.env.CLIENT_API_BASE.endsWith('/') ? process.env.CLIENT_API_BASE : process.env.CLIENT_API_BASE + '/';

async function checkUserExists(username) {
    console.log('[API] Checking if user exists:', username);
    try {
        const res = await axios.get(`${CLIENT_API_BASE}users`, {
            headers: {
                'X-Api-Key': process.env.API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            params: { username }
        });
        console.log('[API] Full API response:', JSON.stringify(res.data, null, 2));
        if (!res.data || !res.data.data || !Array.isArray(res.data.data.list)) {
            console.log('[API] Unexpected API response structure');
            return {
                error: true,
                message: 'Unexpected API response structure'
            };
        }
        const userData = res.data.data.list.find(user =>
            user.username && user.username.toLowerCase() === username.toLowerCase()
        );
        if (userData) {
            console.log(`[API] User '${username}' found in the system`);
            return {
                exists: true,
                userData: userData
            };
        } else {
            console.log(`[API] User '${username}' not found in the system`);
            return {
                exists: false,
                message: 'Username not found'
            };
        }
    } catch (e) {
        const errorMessage = e?.response?.data?.error_message || e.message;
        console.log('[API] Error checking user existence:', errorMessage);
        return {
            error: true,
            message: errorMessage || 'Failed to verify username'
        };
    }
}

module.exports = { checkUserExists };
