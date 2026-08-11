const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseQuestionsFromBuffer, parseTextToQuestions } = require('../services/parserService');
const { readStore, writeStore, deleteFromFirestore } = require('../data/store');

const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB limit

// Upload single or multiple PDF/TXT files and parse into JSON questions
router.post('/upload', upload.any(), async (req, res) => {
  try {
    let allQuestions = [];
    let filesToProcess = req.files || [];

    if (filesToProcess.length > 0) {
      for (const file of filesToProcess) {
        const parsed = await parseQuestionsFromBuffer(
          file.buffer,
          file.mimetype,
          file.originalname
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

// Delete entire Question Bank (deletes from store AND Cloud Firestore DB)
router.delete('/:id', async (req, res) => {
  const store = readStore();
  const index = store.questionBanks.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Question Bank not found.' });

  const deletedBank = store.questionBanks[index];
  store.questionBanks.splice(index, 1);
  writeStore(store);

  if (deletedBank.id) {
    await deleteFromFirestore('questionBanks', deletedBank.id);
  }

  return res.json({ message: 'Question Bank deleted successfully from database.' });
});

module.exports = router;
