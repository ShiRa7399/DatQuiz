const XLSX = require('xlsx');

/**
 * Parses uploaded Excel roster buffer into JSON list of students.
 * Extracts: Registration no, name, email
 */
function parseRosterExcel(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const roster = [];

  rawData.forEach((row) => {
    let regNo = '';
    let name = '';
    let email = '';

    // Find keys matching columns (case-insensitive)
    Object.keys(row).forEach((key) => {
      const cleanKey = key.trim().toLowerCase();
      if (cleanKey.includes('reg') || cleanKey.includes('roll') || cleanKey.includes('id')) {
        regNo = String(row[key]).trim();
      } else if (cleanKey.includes('name')) {
        name = String(row[key]).trim();
      } else if (cleanKey.includes('email') || cleanKey.includes('mail')) {
        email = String(row[key]).trim();
      }
    });

    if (regNo || name || email) {
      roster.push({
        regNo: regNo || `REG_${Math.floor(1000 + Math.random() * 9000)}`,
        name: name || 'Student',
        email: email || 'student@example.com'
      });
    }
  });

  return roster;
}

/**
 * Creates intelligent CSV string matching roster against submissions.
 */
function generateIntelligentCSV(roster, submissions, totalMarks = 100) {
  const submissionMap = new Map();
  submissions.forEach((sub) => {
    submissionMap.set(sub.regNo.trim().toUpperCase(), sub);
  });

  const rows = [
    ['Registration No', 'Student Name', 'Email', 'Marks Obtained', 'Percentage (%)', 'Status', 'Tab Switches', 'Flags', 'Submitted At']
  ];

  roster.forEach((student) => {
    const key = student.regNo.trim().toUpperCase();
    const sub = submissionMap.get(key);

    if (sub) {
      const marks = sub.score !== undefined ? sub.score : 0;
      const pct = sub.totalPossible ? ((marks / sub.totalPossible) * 100).toFixed(1) : '0.0';
      const status = sub.status || (sub.cheatFlags && sub.cheatFlags.length > 0 ? 'Flagged' : 'Submitted');
      const flags = sub.cheatFlags ? sub.cheatFlags.join('; ') : 'None';
      const date = sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'N/A';

      rows.push([
        student.regNo,
        student.name,
        student.email,
        marks,
        `${pct}%`,
        status,
        sub.tabSwitchCount || 0,
        `"${flags}"`,
        `"${date}"`
      ]);
    } else {
      rows.push([
        student.regNo,
        student.name,
        student.email,
        0,
        '0.0%',
        'Absent',
        0,
        'None',
        'N/A'
      ]);
    }
  });

  return rows.map((r) => r.join(',')).join('\n');
}

/**
 * Creates graded Excel buffer appending "Marks Obtained" and "Exam Status".
 */
function generateGradedExcelBuffer(roster, submissions) {
  const submissionMap = new Map();
  submissions.forEach((sub) => {
    submissionMap.set(sub.regNo.trim().toUpperCase(), sub);
  });

  const gradedData = roster.map((student) => {
    const key = student.regNo.trim().toUpperCase();
    const sub = submissionMap.get(key);

    return {
      'Registration no': student.regNo,
      'Name': student.name,
      'Email': student.email,
      'Marks Obtained': sub ? sub.score : 'Absent',
      'Exam Status': sub ? (sub.cheatFlags?.length > 0 ? 'Flagged/Suspicious' : 'Completed') : 'Absent',
      'Tab Switches': sub ? (sub.tabSwitchCount || 0) : 0
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(gradedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Graded Quiz Roster');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  parseRosterExcel,
  generateIntelligentCSV,
  generateGradedExcelBuffer
};
