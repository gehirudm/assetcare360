const fs = require('fs');
const code = fs.readFileSync('pages/dashboard/inventory-manager/script.js', 'utf8');

// Check for duplicate function definitions
const funcDefs = code.match(/function\s+(\w+)\s*\(/g);
const funcNames = funcDefs.map(f => f.match(/function\s+(\w+)/)[1]);
const duplicates = funcNames.filter((name, idx) => funcNames.indexOf(name) !== idx);
if (duplicates.length > 0) {
    console.log('DUPLICATE FUNCTIONS:', [...new Set(duplicates)]);
} else {
    console.log('No duplicate functions found');
}
console.log('Total functions:', funcNames.length);

// Check specific functions exist
const critical = ['approveOrder', 'rejectOrder', 'confirmApproval', 'confirmRejection', 'openModal', 'closeModal', 'viewOrderDetails', 'displayOrders', 'loadSparePartOrders'];
critical.forEach(fn => {
    const found = funcNames.includes(fn);
    console.log(`  ${found ? '✅' : '❌'} ${fn}`);
});
