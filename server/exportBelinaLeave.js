const HISTORY_PATH = './server/approvalHistory.json';
const EXPORT_PATH = './server/belina_leave_export.xlsx';
const META_PATH = './server/teamMemberMeta.json';

function getMetaMap() {
  if (!fs.existsSync(META_PATH)) return {};
  const arr = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
  const map = {};
  arr.forEach(m => { map[m.teamMemberName] = m; });
  return map;
}

export function exportApprovedLeaveToExcel() {
  if (!fs.existsSync(HISTORY_PATH)) return false;
  const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
  const metaMap = getMetaMap();
  const approved = history.filter(r => r.action === 'approved');
  const rows = approved.map(r => {
    const meta = metaMap[r.teamMemberName] || {};
    return {
      'Employee ID': meta.employeeId || '',
      'Team Member': r.teamMemberName,
      'Department': meta.department || '',
      'Type': r.type,
      'Dates': r.dates,
      'Days': r.days,
      'Reason': r.reason,
      'Status': 'Approved',
      'Approved By': r.actor,
      'Approval Date': r.timestamp
    };
  });
  const worksheet = xlsx.utils.json_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Approved Leave');
  xlsx.writeFile(workbook, EXPORT_PATH);
  return true;
}
