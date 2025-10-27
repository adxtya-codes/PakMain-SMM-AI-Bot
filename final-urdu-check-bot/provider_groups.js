const fs = require('fs');
const path = require('path');

function loadProviderGroups() {
    try {
        const contactsPath = path.join(__dirname, 'contacts.json');
        const contactsData = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
        
        const providerGroups = {};
        contactsData.forEach(contact => {
            if (contact.domain && contact.id) {
                providerGroups[contact.domain] = contact.id;
            }
        });
        
        console.log(`[PROVIDER] Loaded ${Object.keys(providerGroups).length} provider groups`);
        return providerGroups;
    } catch (error) {
        console.error('[PROVIDER] Error loading contacts.json:', error);
        return {};
    }
}

// Get group ID for a provider domain
function getGroupIdForProvider(provider) {
    const providerGroups = loadProviderGroups();
    const DEFAULT_GROUP_ID = '120363422970660711@g.us';
    return providerGroups[provider] || DEFAULT_GROUP_ID;
}

function groupOrdersByProvider(orders) {
    const grouped = {};
    
    orders.forEach(order => {
        const provider = order.data.provider;
        if (provider) {
            if (!grouped[provider]) {
                grouped[provider] = [];
            }
            grouped[provider].push(order.id);
        } else {
            if (!grouped['unknown']) {
                grouped['unknown'] = [];
            }
            grouped['unknown'].push(order.id);
        }
    });
    
    return grouped;
}

module.exports = {
    loadProviderGroups,
    getGroupIdForProvider,
    groupOrdersByProvider
};
