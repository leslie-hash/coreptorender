import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORY_PATH = path.join(__dirname, 'approvalHistory.json');

export function getApprovalHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
}

export function addApprovalRecord(record) {
  let history = [];
  if (fs.existsSync(HISTORY_PATH)) {
    history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
  }
  history.push(record);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}
