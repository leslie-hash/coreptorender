const fs = require('fs');
const path = require('path');

// Centralized file paths
const FILE_PATHS = {
  leaveRequests: path.join(__dirname, 'leaveRequests.json'),
  teamMemberMeta: path.join(__dirname, 'teamMemberMeta.json'),
  users: path.join(__dirname, 'users.json'),
  emailSettings: path.join(__dirname, 'emailSettings.json'),
  integrationSettings: path.join(__dirname, 'integrationSettings.json'),
  approvalHistory: path.join(__dirname, 'approvalHistory.json')
};

// Fix unassigned requests status to pending-csp-review
const leaveRequestsPath = FILE_PATHS.leaveRequests;
const backupPath = path.join(__dirname, 'leaveRequests.backup-before-status-fix.json');

try {
  // Read current data
  const leaveRequests = JSON.parse(fs.readFileSync(leaveRequestsPath, 'utf8'));
  
  // Create backup
  fs.writeFileSync(backupPath, JSON.stringify(leaveRequests, null, 2));
  console.log(`✅ Backup created: ${backupPath}`);

  let fixedCount = 0;
  
  // Fix unassigned requests with invalid status
  const fixedRequests = leaveRequests.map(request => {
    // Check if request is unassigned
    const isUnassigned = !request.assignedTo || 
                        request.assignedTo === 'null' || 
                        request.assignedTo === '' ||
                        !request.assignedToEmail || 
                        request.assignedToEmail === 'null' || 
                        request.assignedToEmail === '';
    
    if (isUnassigned) {
      // Check if status is invalid (not a recognized workflow status)
      const validStatuses = ['pending-csp-review', 'csp-review', 'pending-client-approval', 'client-approved', 'approved', 'declined', 'pending'];
      const hasValidStatus = validStatuses.includes(request.status);
      
      // If unassigned and status is not valid, set to pending-csp-review
      if (!hasValidStatus) {
        fixedCount++;
        console.log(`  Fixing: ${request.id} ${request.teamMemberName} - status: "${request.status}" → "pending-csp-review"`);
        return {
          ...request,
          status: 'pending-csp-review'
        };
      }
    }
    return request;
  });

  // Write fixed data
  fs.writeFileSync(leaveRequestsPath, JSON.stringify(fixedRequests, null, 2));
  console.log(`\n✅ Fixed ${fixedCount} unassigned requests with invalid status`);
  console.log(`📊 Total requests processed: ${fixedRequests.length}`);
  
} catch (error) {
  console.error('❌ Error fixing request statuses:', error.message);
  process.exit(1);
}

