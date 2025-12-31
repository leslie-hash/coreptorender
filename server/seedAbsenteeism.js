import { init, createAbsenteeismReport, getAbsenteeismReports, pool } from './db.js';

async function main() {
  try {
    await init();
    console.log('DB init complete');

    const samples = [
      {
        weekStart: '2025-11-30',
        startDate: '2025-12-02',
        endDate: '2025-12-03',
        noOfDays: 2,
        noOfDaysNoWknd: 2,
        nameOfAbsentee: 'Shawn Buka',
        reasonForAbsence: 'Annual Leave',
        absenteeismAuthorised: 'Yes',
        leaveFormSent: 'Yes',
        comment: 'Approved by CSP',
        client: 'Zimworx',
        csp: 'Leslie Chasinda',
        country: 'Zimbabwe',
        weekNo: 49,
        month: 'December',
        year: 2025,
        timeStamp: new Date().toISOString()
      },
      {
        weekStart: '2025-11-30',
        startDate: '2025-12-05',
        endDate: '2025-12-05',
        noOfDays: 1,
        noOfDaysNoWknd: 1,
        nameOfAbsentee: 'Tadiwa Chibwe',
        reasonForAbsence: 'Sick Leave',
        absenteeismAuthorised: 'No',
        leaveFormSent: 'No',
        comment: 'Under review',
        client: 'Zimworx',
        csp: 'CSP User',
        country: 'Zimbabwe',
        weekNo: 49,
        month: 'December',
        year: 2025,
        timeStamp: new Date().toISOString()
      }
    ];

    for (const s of samples) {
      const created = await createAbsenteeismReport(s);
      console.log('Inserted sample id:', created.id);
    }

    const all = await getAbsenteeismReports(null);
    console.log('All absenteeism rows count:', all.length);
    console.log(all.slice(0, 5));

    await pool.end();
    console.log('Done');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

main();
