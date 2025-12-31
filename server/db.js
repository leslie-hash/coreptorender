import pkg from 'pg';
import fs from 'fs';
import path from 'path';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || '';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function init() {
  try {
    // create table if not exists
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS absenteeism_reports (
        id TEXT PRIMARY KEY,
        week_start DATE,
        start_date DATE,
        end_date DATE,
        no_of_days INTEGER,
        no_of_days_no_wknd INTEGER,
        name_of_absentee TEXT,
        reason_for_absence TEXT,
        absenteeism_authorised BOOLEAN,
        leave_form_sent BOOLEAN,
        comment TEXT,
        client TEXT,
        csp TEXT,
        country TEXT,
        week_no INTEGER,
        month TEXT,
        year INTEGER,
        time_stamp TIMESTAMPTZ,
        created_by TEXT,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      );
    `;

    await pool.query(createTableSql);
    
    // Create indexes for better query performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_absenteeism_csp ON absenteeism_reports(csp);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_absenteeism_dates ON absenteeism_reports(start_date, end_date);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_absenteeism_year ON absenteeism_reports(year);`);
    
    console.log('✅ Database initialized (absenteeism_reports)');
  } catch (error) {
    console.error('⚠️  Database initialization failed:', error.message);
    console.error('⚠️  Database features will not be available');
  }
}

async function getAbsenteeismReports(csp) {
  try {
    let res;
    if (csp) {
      res = await pool.query('SELECT * FROM absenteeism_reports WHERE csp = $1 ORDER BY created_at DESC', [csp]);
    } else {
      res = await pool.query('SELECT * FROM absenteeism_reports ORDER BY created_at DESC');
    }
    
    // Convert snake_case to camelCase for frontend compatibility
    return res.rows.map(row => ({
      id: row.id,
      weekStart: row.week_start,
      startDate: row.start_date,
      endDate: row.end_date,
      noOfDays: row.no_of_days,
      noOfDaysNoWknd: row.no_of_days_no_wknd,
      nameOfAbsentee: row.name_of_absentee,
      reasonForAbsence: row.reason_for_absence,
      absenteeismAuthorised: row.absenteeism_authorised ? 'Yes' : 'No',
      leaveFormSent: row.leave_form_sent ? 'Yes' : 'No',
      comment: row.comment,
      client: row.client,
      csp: row.csp,
      country: row.country,
      weekNo: row.week_no,
      month: row.month,
      year: row.year,
      timeStamp: row.time_stamp,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('Database error in getAbsenteeismReports:', error.message);
    // Return empty array as fallback
    return [];
  }
}

async function createAbsenteeismReport(report) {
  try {
    const id = report.id || Date.now().toString();
    const now = new Date().toISOString();
    const query = `INSERT INTO absenteeism_reports(
      id, week_start, start_date, end_date, no_of_days, no_of_days_no_wknd,
      name_of_absentee, reason_for_absence, absenteeism_authorised, leave_form_sent,
      comment, client, csp, country, week_no, month, year, time_stamp, created_by, created_at, updated_at
    ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING *`;

    const values = [
      id,
      report.weekStart || null,
      report.startDate || null,
      report.endDate || null,
      report.noOfDays || 0,
      report.noOfDaysNoWknd || 0,
      report.nameOfAbsentee || null,
      report.reasonForAbsence || null,
      report.absenteeismAuthorised === 'Yes',
      report.leaveFormSent === 'Yes',
      report.comment || null,
      report.client || null,
      report.csp || null,
      report.country || null,
      report.weekNo || null,
      report.month || null,
      report.year || null,
      report.timeStamp ? new Date(report.timeStamp).toISOString() : new Date().toISOString(),
      report.createdBy || report.csp || null,
      now,
      now
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (error) {
    console.error('Database error in createAbsenteeismReport:', error.message);
    throw error;
  }
}

async function updateAbsenteeismReport(id, data) {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key of Object.keys(data)) {
      // map camelCase keys to column names
      const col = key
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase();
      fields.push(`${col} = $${idx}`);
      let val = data[key];
      if (col === 'absenteeism_authorised' || col === 'leave_form_sent') {
        val = val === 'Yes' || val === true ? true : false;
      }
      values.push(val);
      idx++;
    }
    values.push(new Date().toISOString()); // updated_at
    const setClause = fields.join(', ') + `, updated_at = $${idx}`;
    const query = `UPDATE absenteeism_reports SET ${setClause} WHERE id = $${idx + 1} RETURNING *`;
    values.push(id);
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (error) {
    console.error('Database error in updateAbsenteeismReport:', error.message);
    throw error;
  }
}

async function deleteAbsenteeismReport(id) {
  try {
    await pool.query('DELETE FROM absenteeism_reports WHERE id = $1', [id]);
    return true;
  } catch (error) {
    console.error('Database error in deleteAbsenteeismReport:', error.message);
    throw error;
  }
}

export { pool, init, getAbsenteeismReports, createAbsenteeismReport, updateAbsenteeismReport, deleteAbsenteeismReport };
