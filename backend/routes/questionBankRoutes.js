const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseQuestionsFromBuffer, parseTextToQuestions } = require('../services/parserService');
const { readStore, writeStore, deleteFromFirestore } = require('../data/store');
const { requireAuth } = require('../middleware/auth');

const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB limit

// Upload single or multiple PDF/TXT files and parse into JSON questions
router.post('/upload', requireAuth, upload.any(), async (req, res) => {
  try {
    let allQuestions = [];
    let filesToProcess = req.files || [];
    const requestApiKey = req.headers['x-gemini-api-key'] || req.body.apiKey || null;

    if (filesToProcess.length > 0) {
      for (const file of filesToProcess) {
        const parsed = await parseQuestionsFromBuffer(
          file.buffer,
          file.mimetype,
          file.originalname,
          requestApiKey
        );
        allQuestions = allQuestions.concat(parsed);
      }
    } else if (req.body.text) {
      allQuestions = parseTextToQuestions(req.body.text);
    } else {
      return res.status(400).json({ error: 'Please select one or more .pdf or .txt files.' });
    }

    const defaultTitle = filesToProcess.length === 1 
      ? filesToProcess[0].originalname.replace(/\.[^/.]+$/, "")
      : `Bank (${filesToProcess.length} Files)`;

    const title = req.body.title && req.body.title !== 'Uploaded Question Bank' 
      ? req.body.title 
      : defaultTitle;

    const newQuestionBank = {
      id: `qb_${Date.now()}`,
      facultyId: req.user.id,
      title,
      description: req.body.description || `AI-Parsed from ${filesToProcess.length || 1} file(s)`,
      createdAt: new Date().toISOString(),
      questions: allQuestions
    };

    const store = readStore();
    store.questionBanks.unshift(newQuestionBank);
    writeStore(store);

    return res.json({
      message: `Successfully processed ${filesToProcess.length || 1} file(s) with ${allQuestions.length} questions!`,
      questionBank: newQuestionBank
    });
  } catch (err) {
    console.error('Question Bank Upload error:', err);
    return res.status(500).json({ error: 'Failed to parse file(s): ' + err.message });
  }
});

// List all Question Banks handler
const getQuestionBanksHandler = (req, res) => {
  const store = readStore();
  const myBanks = store.questionBanks.filter(b => b.facultyId === req.user.id);
  return res.json({
    banks: myBanks,
    questionBanks: myBanks
  });
};

router.get('/', requireAuth, getQuestionBanksHandler);
router.get('/list', requireAuth, getQuestionBanksHandler);

// Get single Question Bank
router.get('/:id', requireAuth, (req, res) => {
  const store = readStore();
  const bank = store.questionBanks.find(b => b.id === req.params.id && b.facultyId === req.user.id);
  if (!bank) return res.status(404).json({ error: 'Question Bank not found or unauthorized.' });
  return res.json({ questionBank: bank });
});

// Create manual question bank
router.post('/', requireAuth, (req, res) => {
  const { title, description, questions } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const store = readStore();
  const newBank = {
    id: `qb_${Date.now()}`,
    facultyId: req.user.id,
    title,
    description: description || '',
    createdAt: new Date().toISOString(),
    questions: questions || []
  };

  store.questionBanks.unshift(newBank);
  writeStore(store);
  return res.json({ questionBank: newBank });
});

// Edit individual question in Question Bank
router.put('/:id/question/:qId', requireAuth, (req, res) => {
  const store = readStore();
  const bank = store.questionBanks.find(b => b.id === req.params.id && b.facultyId === req.user.id);
  if (!bank) return res.status(404).json({ error: 'Question Bank not found or unauthorized.' });

  const qIndex = bank.questions.findIndex(q => q.id === req.params.qId);
  if (qIndex === -1) return res.status(404).json({ error: 'Question ID not found.' });

  const { question, options, correctAnswer, explanation, marks } = req.body;
  if (question !== undefined) bank.questions[qIndex].question = question;
  if (options && Array.isArray(options)) bank.questions[qIndex].options = options;
  if (correctAnswer !== undefined) bank.questions[qIndex].correctAnswer = correctAnswer;
  if (explanation !== undefined) bank.questions[qIndex].explanation = explanation;
  if (marks !== undefined) bank.questions[qIndex].marks = parseInt(marks, 10) || 1;

  writeStore(store);
  return res.json({ message: 'Question updated successfully.', questionBank: bank });
});

// Delete individual question from Question Bank
router.delete('/:id/question/:qId', requireAuth, (req, res) => {
  const store = readStore();
  const bank = store.questionBanks.find(b => b.id === req.params.id && b.facultyId === req.user.id);
  if (!bank) return res.status(404).json({ error: 'Question Bank not found or unauthorized.' });

  const initialCount = bank.questions.length;
  bank.questions = bank.questions.filter(q => q.id !== req.params.qId);

  if (bank.questions.length === initialCount) {
    return res.status(404).json({ error: 'Question ID not found in this bank.' });
  }

  writeStore(store);
  return res.json({ message: 'Question deleted successfully.', questionBank: bank });
});


// Delete entire Question Bank (deletes from store AND Cloud Firestore DB)
router.delete('/:id', requireAuth, async (req, res) => {
  const store = readStore();
  const index = store.questionBanks.findIndex(b => b.id === req.params.id && b.facultyId === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Question Bank not found or unauthorized.' });

  const deletedBank = store.questionBanks[index];
  store.questionBanks.splice(index, 1);
  writeStore(store);

  if (deletedBank.id) {
    await deleteFromFirestore('questionBanks', deletedBank.id);
  }

  return res.json({ message: 'Question Bank deleted successfully from database.' });
});

module.exports = router;
