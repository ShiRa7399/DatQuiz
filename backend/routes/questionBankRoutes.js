const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseQuestionsFromBuffer, parseTextToQuestions } = require('../services/parserService');
const { readStore, writeStore } = require('../data/store');

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Upload PDF/TXT file and parse into JSON questions
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    let questions = [];
    let title = req.body.title || 'Uploaded Question Bank';

    if (req.file) {
      title = title !== 'Uploaded Question Bank' ? title : req.file.originalname.replace(/\.[^/.]+$/, "");
      questions = await parseQuestionsFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
    } else if (req.body.text) {
      questions = parseTextToQuestions(req.body.text);
    } else {
      return res.status(400).json({ error: 'Please provide a file (.pdf, .txt) or text content.' });
    }

    const newQuestionBank = {
      id: `qb_${Date.now()}`,
      title,
      description: req.body.description || `AI-Parsed from ${req.file ? req.file.originalname : 'text input'}`,
      createdAt: new Date().toISOString(),
      questions
    };

    const store = readStore();
    store.questionBanks.unshift(newQuestionBank);
    writeStore(store);

    return res.json({
      message: 'File processed and Question Bank created successfully!',
      questionBank: newQuestionBank
    });
  } catch (err) {
    console.error('Question Bank Upload error:', err);
    return res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
});

// List all Question Banks handler
const getQuestionBanksHandler = (req, res) => {
  const store = readStore();
  return res.json({
    banks: store.questionBanks,
    questionBanks: store.questionBanks
  });
};

router.get('/', getQuestionBanksHandler);
router.get('/list', getQuestionBanksHandler);

// Get single Question Bank
router.get('/:id', (req, res) => {
  const store = readStore();
  const bank = store.questionBanks.find(b => b.id === req.params.id);
  if (!bank) return res.status(404).json({ error: 'Question Bank not found.' });
  return res.json({ questionBank: bank });
});

// Create manual question bank
router.post('/', (req, res) => {
  const { title, description, questions } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const store = readStore();
  const newBank = {
    id: `qb_${Date.now()}`,
    title,
    description: description || '',
    createdAt: new Date().toISOString(),
    questions: questions || []
  };

  store.questionBanks.unshift(newBank);
  writeStore(store);
  return res.json({ questionBank: newBank });
});

// Delete individual question from Question Bank
router.delete('/:id/question/:qId', (req, res) => {
  const store = readStore();
  const bank = store.questionBanks.find(b => b.id === req.params.id);
  if (!bank) return res.status(404).json({ error: 'Question Bank not found.' });

  const initialCount = bank.questions.length;
  bank.questions = bank.questions.filter(q => q.id !== req.params.qId);

  if (bank.questions.length === initialCount) {
    return res.status(404).json({ error: 'Question ID not found in this bank.' });
  }

  writeStore(store);
  return res.json({ message: 'Question deleted successfully.', questionBank: bank });
});

// Delete entire Question Bank
router.delete('/:id', (req, res) => {
  const store = readStore();
  const index = store.questionBanks.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Question Bank not found.' });

  store.questionBanks.splice(index, 1);
  writeStore(store);
  return res.json({ message: 'Question Bank deleted successfully.' });
});

module.exports = router;
