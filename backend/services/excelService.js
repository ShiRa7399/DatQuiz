const XLSX = require('xlsx');

/**
 * Parses uploaded Excel roster buffer into JSON list of students.
 * Flexibly accepts Registration No spellings:
 * - "Registration no", "register no", "registration number", "register number", "reg no", "roll no", "id", etc.
 * Preserves exact order of students as uploaded.
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

    Object.keys(row).forEach((key) => {
      const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      // Registration number variant matching
      if (
        cleanKey.includes('register') || 
        cleanKey.includes('registration') || 
        cleanKey.includes('reg') || 
        cleanKey.includes('roll') || 
        cleanKey.includes('studentno') || 
        cleanKey.includes('studentnum') || 
        cleanKey === 'id' || 
        cleanKey.includes('studentid')
      ) {
        if (!regNo) regNo = String(row[key]).trim();
      } 
      // Name variant matching
      else if (cleanKey.includes('name')) {
        if (!name) name = String(row[key]).trim();
      } 
      // Email variant matching
      else if (cleanKey.includes('email') || cleanKey.includes('mail')) {
        if (!email) email = String(row[key]).trim();
      }
    });

    if (regNo || name || email) {
      roster.push({
        regNo: regNo || `REG_${Math.floor(1000 + Math.random() * 9000)}`,
        name: name || 'Student',
        email: email || ''
      });
    }
  });

  return roster;
}

/**
 * Creates CSV string strictly following format:
 * "register no | name | status | marks"
 * - status: 'P' if attended, 'A' if absent
 * - marks: score achieved if attended ('P'), 0 if absent ('A')
 * - Email column removed
 * - Row order remains EXACTLY the same as uploaded roster
 */
function generateIntelligentCSV(roster, submissions) {
  const submissionMap = new Map();
  (submissions || []).forEach((sub) => {
    if (sub.regNo) {
      submissionMap.set(sub.regNo.trim().toUpperCase(), sub);
    }
  });

  const rows = [
    ['register no', 'name', 'status', 'marks']
  ];

  (roster || []).forEach((student) => {
    const key = student.regNo ? student.regNo.trim().toUpperCase() : '';
    const sub = submissionMap.get(key);
    const isAttended = !!sub;

    const status = isAttended ? 'P' : 'A';
    const marks = isAttended ? (sub.score !== undefined ? sub.score : 0) : 0;

    rows.push([
      `"${student.regNo}"`,
      `"${student.name}"`,
      `"${status}"`,
      marks
    ]);
  });

  return rows.map((r) => r.join(',')).join('\n');
}

/**
 * Creates graded Excel buffer strictly following format:
 * Columns: "register no", "name", "status", "marks"
 * - status: 'P' if attended, 'A' if absent
 * - marks: score achieved if attended ('P'), 0 if absent ('A')
 * - Email column removed
 * - Row order remains EXACTLY the same as uploaded roster
 */
function generateGradedExcelBuffer(roster, submissions) {
  const submissionMap = new Map();
  (submissions || []).forEach((sub) => {
    if (sub.regNo) {
      submissionMap.set(sub.regNo.trim().toUpperCase(), sub);
    }
  });

  const gradedData = (roster || []).map((student) => {
    const key = student.regNo ? student.regNo.trim().toUpperCase() : '';
    const sub = submissionMap.get(key);
    const isAttended = !!sub;

    return {
      'register no': student.regNo,
      'name': student.name,
      'status': isAttended ? 'P' : 'A',
      'marks': isAttended ? (sub.score !== undefined ? sub.score : 0) : 0
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(gradedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Graded Roster');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  parseRosterExcel,
  generateIntelligentCSV,
  generateGradedExcelBuffer
};
