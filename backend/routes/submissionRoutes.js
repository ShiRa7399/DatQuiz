const express = require('express');
const router = express.Router();
const { readStore, writeStore } = require('../data/store');
const { generateIntelligentCSV, generateGradedExcelBuffer } = require('../services/excelService');

// Submit student quiz attempt
router.post('/submit', (req, res) => {
  const { quizCode, regNo, studentName, answers, tabSwitchCount, fullscreenViolations } = req.body;

  if (!quizCode || !regNo) {
    return res.status(400).json({ error: 'Quiz code and Registration number are required.' });
  }

  const store = readStore();
  const code = quizCode.trim().toUpperCase();
  const quiz = store.quizzes.find(q => q.quizCode === code);

  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

  // Check if student already submitted
  const normalizedReg = regNo.trim().toUpperCase();
  const existingSubIndex = store.submissions.findIndex(
    s => s.quizCode === code && s.regNo.trim().toUpperCase() === normalizedReg
  );

  if (existingSubIndex !== -1) {
    return res.status(400).json({
      error: 'You have already submitted this quiz.',
      alreadySubmitted: true,
      submission: store.submissions[existingSubIndex]
    });
  }

  // Calculate score
  let score = 0;
  let totalPossible = 0;
  const questions = quiz.questions || [];

  questions.forEach(q => {
    const markValue = q.marks || quiz.marksPerQuestion || 1;
    totalPossible += markValue;
    const studentAns = answers ? answers[q.id] : null;
    if (studentAns && studentAns.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()) {
      score += markValue;
    }
  });

  // Build anti-cheat warning flags
  const cheatFlags = [];
  const switchCount = parseInt(tabSwitchCount, 10) || 0;
  if (switchCount > 0) {
    cheatFlags.push(`Tab Switched (${switchCount} ${switchCount === 1 ? 'time' : 'times'})`);
  }
  if (fullscreenViolations > 0) {
    cheatFlags.push(`Exited Fullscreen Mode (${fullscreenViolations} ${fullscreenViolations === 1 ? 'time' : 'times'})`);
  }

  const newSubmission = {
    id: `sub_${Date.now()}`,
    quizCode: code,
    regNo: regNo.trim(),
    studentName: studentName || 'Student',
    answers: answers || {},
    score,
    totalPossible,
    tabSwitchCount: switchCount,
    fullscreenViolations: parseInt(fullscreenViolations, 10) || 0,
    cheatFlags,
    status: cheatFlags.length > 0 ? 'Flagged' : 'Completed',
    submittedAt: new Date().toISOString()
  };

  store.submissions.push(newSubmission);
  writeStore(store);

  return res.json({
    message: 'Quiz submitted successfully!',
    submission: newSubmission
  });
});

// Check if student has already submitted
router.get('/check-status', (req, res) => {
  const { code, regNo } = req.query;
  if (!code || !regNo) {
    return res.status(400).json({ error: 'Code and regNo required' });
  }

  const store = readStore();
  const normalizedCode = code.trim().toUpperCase();
  const normalizedReg = regNo.trim().toUpperCase();

  const sub = store.submissions.find(
    s => s.quizCode === normalizedCode && s.regNo.trim().toUpperCase() === normalizedReg
  );

  return res.json({
    submitted: !!sub,
    submission: sub || null
  });
});

// List all submissions for a quiz code
router.get('/:code', (req, res) => {
  const store = readStore();
  const code = req.params.code.trim().toUpperCase();
  const quizSubmissions = store.submissions.filter(s => s.quizCode === code);
  const quiz = store.quizzes.find(q => q.quizCode === code);

  return res.json({
    quizCode: code,
    totalSubmissions: quizSubmissions.length,
    rosterCount: quiz?.roster?.length || 0,
    submissions: quizSubmissions
  });
});

// Revoke student attempt
router.delete('/:code/:regNo', (req, res) => {
  const store = readStore();
  const code = req.params.code.trim().toUpperCase();
  const regNo = req.params.regNo.trim().toUpperCase();

  const index = store.submissions.findIndex(
    s => s.quizCode === code && s.regNo.trim().toUpperCase() === regNo
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Submission not found for this student.' });
  }

  store.submissions.splice(index, 1);
  writeStore(store);

  return res.json({ message: `Successfully revoked submission for ${regNo}` });
});

// Export Intelligent CSV (matches roster vs submissions, missing = Absent with 0)
router.get('/:code/export-csv', (req, res) => {
  const store = readStore();
  const code = req.params.code.trim().toUpperCase();
  const quiz = store.quizzes.find(q => q.quizCode === code);

  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

  const submissions = store.submissions.filter(s => s.quizCode === code);
  const roster = quiz.roster && quiz.roster.length > 0 ? quiz.roster : [
    ...submissions.map(s => ({ regNo: s.regNo, name: s.studentName, email: 'N/A' }))
  ];

  const csvContent = generateIntelligentCSV(roster, submissions);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${code}_Quiz_Results.csv"`);
  return res.send(csvContent);
});

// Export Auto-Filled Excel (.xlsx)
router.get('/:code/export-excel', (req, res) => {
  try {
    const store = readStore();
    const code = req.params.code.trim().toUpperCase();
    const quiz = store.quizzes.find(q => q.quizCode === code);

    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    const submissions = store.submissions.filter(s => s.quizCode === code);
    const roster = quiz.roster && quiz.roster.length > 0 ? quiz.roster : [
      ...submissions.map(s => ({ regNo: s.regNo, name: s.studentName, email: 'N/A' }))
    ];

    const buffer = generateGradedExcelBuffer(roster, submissions);

    const fileName = `${code}_Graded_Roster.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer, 'binary');
  } catch (err) {
    console.error('Export Excel error:', err);
    return res.status(500).json({ error: 'Failed to generate Excel file: ' + err.message });
  }
});

module.exports = router;
