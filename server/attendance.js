import fs from 'fs';

const ATTENDANCE_PATH = './server/attendanceRecords.json';

export function getAttendanceRecords() {
  if (!fs.existsSync(ATTENDANCE_PATH)) return [];
  return JSON.parse(fs.readFileSync(ATTENDANCE_PATH, 'utf-8'));
}

export function updateAttendanceForLeave(approval) {
  let records = [];
  if (fs.existsSync(ATTENDANCE_PATH)) {
    records = JSON.parse(fs.readFileSync(ATTENDANCE_PATH, 'utf-8'));
  }
  // Find or create record for team member
  let rec = records.find(r => r.teamMemberName === approval.teamMemberName);
  if (!rec) {
    rec = {
      teamMemberName: approval.teamMemberName,
      totalPTO: 0,
      leaves: []
    };
    records.push(rec);
  }
  // Add leave if approved
  if (approval.status === 'approved') {
    rec.leaves.push({
      type: approval.type,
      dates: approval.dates,
      days: approval.days,
      reason: approval.reason,
      timestamp: new Date().toISOString()
    });
    rec.totalPTO += approval.days;
  }
  fs.writeFileSync(ATTENDANCE_PATH, JSON.stringify(records, null, 2));
}
