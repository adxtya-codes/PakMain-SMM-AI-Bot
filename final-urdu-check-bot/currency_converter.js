const axios = require('axios');

async function convertCurrency(amount, fromCurrency, toCurrency) {
    try {
        if (fromCurrency.toLowerCase() === toCurrency.toLowerCase()) {
            return { success: true, convertedAmount: amount, rate: 1 };
        }
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`);
        
        if (response.data && response.data.rates && response.data.rates[toCurrency.toUpperCase()]) {
            const rate = response.data.rates[toCurrency.toUpperCase()];
            const convertedAmount = (parseFloat(amount) * rate).toFixed(2);
            
            console.log(`[CURRENCY] Converted ${amount} ${fromCurrency} to ${convertedAmount} ${toCurrency} (rate: ${rate})`);
            
            return {
                success: true,
                convertedAmount: parseFloat(convertedAmount),
                rate: rate,
                fromCurrency: fromCurrency.toUpperCase(),
                toCurrency: toCurrency.toUpperCase()
            };
        } else {
            console.log(`[CURRENCY] Currency ${toCurrency} not supported`);
            return { success: false, error: 'Currency not supported' };
        }
    } catch (error) {
        console.error('[CURRENCY] Error converting currency:', error.message);
        return { success: false, error: 'Currency conversion failed' };
    }
}

function getCurrencySymbol(currencyCode) {
    const symbols = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£',
        'PKR': 'PKR ',
        'BDT': '৳',
        'JPY': '¥',
        'CNY': '¥',
        'AUD': 'A$',
        'CAD': 'C$',
        'AED': 'AED ',
        'SAR': 'SAR ',
        'QAR': 'QAR '
    };
    return symbols[currencyCode.toUpperCase()] || currencyCode.toUpperCase();
}

function formatCurrency(amount, currencyCode) {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${parseFloat(amount).toLocaleString()}`;
}

module.exports = {
    convertCurrency,
    getCurrencySymbol,
    formatCurrency
};
