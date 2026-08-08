const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseRosterExcel } = require('../services/excelService');
const { sendBulkQuizInvites } = require('../services/emailService');
const { readStore, writeStore } = require('../data/store');

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

// Helper to generate 5-letter random uppercase code
function generateQuizCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create new quiz handler
const handleCreateQuiz = (req, res) => {
  const {
    title,
    description,
    startTime,
    endTime,
    durationMinutes,
    marksPerQuestion,
    questionBankId,
    customQuestions,
    facultyId
  } = req.body;

  if (!title) return res.status(400).json({ error: 'Quiz title is required.' });

  const store = readStore();

  // Generate unique 5-letter code
  let quizCode = generateQuizCode();
  while (store.quizzes.some(q => q.quizCode === quizCode)) {
    quizCode = generateQuizCode();
  }

  let questions = customQuestions || [];
  if (questionBankId) {
    const bank = store.questionBanks.find(b => b.id === questionBankId);
    if (bank && bank.questions) {
      questions = bank.questions.map(q => ({
        ...q,
        marks: marksPerQuestion ? parseInt(marksPerQuestion, 10) : q.marks
      }));
    }
  }

  const newQuiz = {
    id: `qz_${Date.now()}`,
    quizCode,
    title,
    description: description || '',
    facultyId: facultyId || 'faculty_1',
    startTime: startTime || new Date().toISOString(),
    endTime: endTime || new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: parseInt(durationMinutes, 10) || 30,
    marksPerQuestion: parseInt(marksPerQuestion, 10) || 1,
    questionBankId: questionBankId || null,
    questions,
    roster: [],
    createdAt: new Date().toISOString()
  };

  store.quizzes.unshift(newQuiz);
  writeStore(store);

  return res.json({
    message: 'Quiz created successfully!',
    quiz: newQuiz
  });
};

router.post('/', handleCreateQuiz);
router.post('/create', handleCreateQuiz);

// List all quizzes
router.get('/', (req, res) => {
  const store = readStore();
  return res.json({ quizzes: store.quizzes });
});

// Get single quiz by Code
router.get('/:code', (req, res) => {
  const store = readStore();
  const code = req.params.code.trim().toUpperCase();
  const quiz = store.quizzes.find(q => q.quizCode === code);

  if (!quiz) {
    return res.status(404).json({ error: `Quiz code '${code}' not found.` });
  }

  return res.json({ quiz });
});

// Upload Student Roster Excel (.xlsx) for a quiz
router.post('/:code/roster', upload.single('file'), (req, res) => {
  try {
    const store = readStore();
    const code = req.params.code.trim().toUpperCase();
    const quiz = store.quizzes.find(q => q.quizCode === code);

    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    let newRoster = [];

    if (req.file) {
      newRoster = parseRosterExcel(req.file.buffer);
    } else if (req.body.roster && Array.isArray(req.body.roster)) {
      newRoster = req.body.roster;
    } else {
      return res.status(400).json({ error: 'Please upload an Excel file (.xlsx) or JSON roster array.' });
    }

    // Merge or replace roster
    quiz.roster = newRoster;
    writeStore(store);

    return res.json({
      message: `Successfully uploaded roster with ${newRoster.length} students.`,
      roster: quiz.roster
    });
  } catch (err) {
    console.error('Roster parse error:', err);
    return res.status(500).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

// Bulk Email Dispatch API Endpoint: /api/quiz/send-invites
router.post('/send-invites', async (req, res) => {
  try {
    const { quizCode, facultyEmail, frontendUrl } = req.body;
    if (!quizCode) return res.status(400).json({ error: 'quizCode is required.' });

    const store = readStore();
    const code = quizCode.trim().toUpperCase();
    const quiz = store.quizzes.find(q => q.quizCode === code);

    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
    if (!quiz.roster || quiz.roster.length === 0) {
      return res.status(400).json({ error: 'Quiz has no student roster uploaded yet.' });
    }

    // Trigger async dispatch loop
    const dispatchResults = await sendBulkQuizInvites({
      roster: quiz.roster,
      quiz,
      facultyEmail: facultyEmail || 'faculty@quizgenius.edu',
      frontendUrl
    });

    return res.json({
      message: `Invites processed! Sent: ${dispatchResults.sent}, Failed: ${dispatchResults.failed}`,
      results: dispatchResults
    });
  } catch (err) {
    console.error('Send Invites API Error:', err);
    return res.status(500).json({ error: 'Failed to send bulk invites: ' + err.message });
  }
});

// Delete single quiz by Code or ID
router.delete('/:code', (req, res) => {
  const store = readStore();
  const code = req.params.code.trim().toUpperCase();
  const index = store.quizzes.findIndex(q => q.quizCode === code || q.id === req.params.code);

  if (index === -1) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  store.quizzes.splice(index, 1);
  writeStore(store);
  return res.json({ message: 'Quiz deleted successfully.' });
});

module.exports = router;
