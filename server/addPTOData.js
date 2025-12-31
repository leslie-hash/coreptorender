import fs from 'fs';

const data = JSON.parse(fs.readFileSync('teamMemberMeta.json', 'utf8'));
const updated = data.map((member, i) => ({ 
  ...member, 
  annualPTO: [15, 18, 20, 22, 25][i % 5] 
}));
fs.writeFileSync('teamMemberMeta.json', JSON.stringify(updated, null, 2));
console.log('✅ Updated ' + updated.length + ' team members with PTO allocations');
console.log('  15 days: ' + updated.filter(m => m.annualPTO === 15).length);
console.log('  18 days: ' + updated.filter(m => m.annualPTO === 18).length);
console.log('  20 days: ' + updated.filter(m => m.annualPTO === 20).length);
console.log('  22 days: ' + updated.filter(m => m.annualPTO === 22).length);
console.log('  25 days: ' + updated.filter(m => m.annualPTO === 25).length);
