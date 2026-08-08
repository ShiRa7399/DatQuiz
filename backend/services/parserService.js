const pdfParse = require('pdf-parse');

/**
 * Parses raw text or PDF buffer into structured JSON questions array
 */
async function parseQuestionsFromBuffer(buffer, mimeType, originalName) {
  let textContent = '';

  if (mimeType === 'application/pdf' || (originalName && originalName.endsWith('.pdf'))) {
    try {
      const pdfData = await pdfParse(buffer);
      textContent = pdfData.text || '';
    } catch (err) {
      console.error('PDF parsing error:', err);
      // Do NOT fall back to raw binary string if buffer contains PDF stream header
      const rawStr = buffer.toString('utf-8');
      if (rawStr.includes('%PDF-') || rawStr.includes('stream')) {
        textContent = '';
      } else {
        textContent = rawStr;
      }
    }
  } else {
    textContent = buffer.toString('utf-8');
  }

  // Strip illegal control characters
  textContent = textContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  return parseTextToQuestions(textContent);
}

function parseTextToQuestions(text) {
  const questions = [];
  if (!text || typeof text !== 'string') return questions;

  // Clean raw PDF streams if any leaked through
  const cleanedInput = text.replace(/%PDF-[\s\S]*?%%EOF/gi, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  // Normalize line breaks
  const cleanedText = cleanedInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Try splitting by double newlines or numerical patterns like "1.", "Q1:", "Question 1"
  const blocks = cleanedText.split(/(?=\n(?:Q\d+|Question\d+|\d+[\.\)])\s*)/i).filter(b => b.trim().length > 0);

  blocks.forEach((block, index) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    let questionText = lines[0];
    // Remove leading numbering like "1. ", "Q1: "
    questionText = questionText.replace(/^(?:Q\d+[:\.]?|Question\s*\d+[:\.]?|\d+[\.\)])\s*/i, '').trim();

    let options = [];
    let correctAnswer = '';
    let explanation = '';
    let marks = 1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Option detection A), B), C), D) or A., B., C., D.
      const optionMatch = line.match(/^(?:[A-D]|\([A-D]\))[\.\:\)]\s*(.*)/i);
      const answerMatch = line.match(/^(?:Answer|Correct Answer|Ans)[:\.\s]*(.*)/i);
      const marksMatch = line.match(/^(?:Marks|Points)[:\.\s]*(\d+)/i);
      const expMatch = line.match(/^(?:Explanation)[:\.\s]*(.*)/i);

      if (optionMatch) {
        options.push(optionMatch[1].trim());
      } else if (answerMatch) {
        correctAnswer = answerMatch[1].trim().toUpperCase();
        // Handle full option text or letter
        if (correctAnswer.startsWith('A')) correctAnswer = 'A';
        else if (correctAnswer.startsWith('B')) correctAnswer = 'B';
        else if (correctAnswer.startsWith('C')) correctAnswer = 'C';
        else if (correctAnswer.startsWith('D')) correctAnswer = 'D';
      } else if (marksMatch) {
        marks = parseInt(marksMatch[1], 10) || 1;
      } else if (expMatch) {
        explanation = expMatch[1].trim();
      } else if (options.length === 0) {
        // Append extra line to question text if options haven't started yet
        questionText += ' ' + line;
      }
    }

    // Default fallback options if none parsed
    if (options.length < 2) {
      options = ['Option A', 'Option B', 'Option C', 'Option D'];
    }

    // Ensure options array has 4 items
    while (options.length < 4) {
      options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    }

    if (!correctAnswer || !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      correctAnswer = 'A';
    }

    questions.push({
      id: `q_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
      question: questionText || `Sample Question ${index + 1}`,
      options: options.slice(0, 4),
      correctAnswer,
      marks,
      explanation: explanation || 'Refer to course study material.'
    });
  });

  // Fallback if no questions parsed from blocks
  if (questions.length === 0) {
    questions.push({
      id: `q_${Date.now()}_1`,
      question: "Sample Question 1: What is the primary role of an LMS?",
      options: [
        "A) Managing courses & assessment",
        "B) Operating system kernel",
        "C) Database indexer",
        "D) Hardware firmware"
      ],
      correctAnswer: "A",
      marks: 1,
      explanation: "LMS stands for Learning Management System."
    });
  }

  return questions;
}

module.exports = {
  parseQuestionsFromBuffer,
  parseTextToQuestions
};
