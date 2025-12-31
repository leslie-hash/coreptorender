import fs from 'fs';

function calculatePTOBalance(teamMemberName) {
  const metaData = JSON.parse(fs.readFileSync('teamMemberMeta.json', 'utf8'));
  const member = metaData.find(m => m.employeeId === teamMemberName || m.teamMemberName === teamMemberName);
  const annualPTO = member?.annualPTO || 12;
  
  const requests = JSON.parse(fs.readFileSync('leaveRequests.json', 'utf8'));
  const currentYear = new Date().getFullYear();
  const usedPTO = requests
    .filter(r => r.teamMember === teamMemberName && 
                 (r.status === 'approved' || r.status === 'pending' || r.status === 'csp-review') &&
                 new Date(r.startDate).getFullYear() === currentYear)
    .reduce((sum, r) => sum + (r.days || 0), 0);
  
  return { annualPTO, usedPTO, remainingPTO: annualPTO - usedPTO };
}

const requests = JSON.parse(fs.readFileSync('leaveRequests.json', 'utf8'));
const updated = requests.map(req => ({ ...req, ptoBalance: calculatePTOBalance(req.teamMember) }));
fs.writeFileSync('leaveRequests.json', JSON.stringify(updated, null, 2));
console.log('✅ Updated ' + updated.length + ' leave requests with real PTO balances');
updated.forEach(req => {
  console.log(`  - ${req.teamMember}: ${req.ptoBalance.annualPTO} annual, ${req.ptoBalance.usedPTO} used, ${req.ptoBalance.remainingPTO} remaining`);
});
