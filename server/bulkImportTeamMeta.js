import fs from 'fs';
import xlsx from 'xlsx';

const META_PATH = './server/teamMemberMeta.json';

export function bulkImportTeamMetaFromExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  // Expected columns: teamMemberName, employeeId, department
  const valid = data.filter(row => row.teamMemberName && row.employeeId && row.department);
  fs.writeFileSync(META_PATH, JSON.stringify(valid, null, 2));
  return valid.length;
}
