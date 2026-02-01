// Test parseAmount function
const parseAmount = (str) => {
    if (!str) return 0;
    const cleaned = str.toString().replace(/[€\s"]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
};

// Test cases from CSV
const testCases = [
    '"99,99 €"',
    '99,99 €',
    '110,90 €',
    '1.406,52€',
    '12.18',
    '"0,00 €"',
    '50,00 €'
];

console.log('Testing parseAmount:');
testCases.forEach(test => {
    const result = parseAmount(test);
    console.log(`${test.padEnd(20)} => ${result}`);
});

// Simulate 2025 total
const prices2025 = [
    '99,99 €', '110,90 €', '21,02 €', '3,62 €', '109,36 €', '7,79 €', '13,79 €', '13,79 €', '11,50 €', '14,38 €'
];

const total = prices2025.reduce((sum, price) => sum + parseAmount(price), 0);
console.log(`\nTotal de primeros 10 productos: ${total.toFixed(2)}`);
