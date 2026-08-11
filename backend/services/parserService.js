const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');

/**
 * Parses raw text or PDF buffer into structured JSON questions array.
 * Uses Gemini API (if GEMINI_API_KEY is configured in env) with automatic fallback to pdf-parse + regex.
 */
async function parseQuestionsFromBuffer(buffer, mimeType, originalName) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      console.log('🤖 Attempting AI PDF extraction via Gemini 1.5 Flash...');
      const questions = await parseWithGeminiAI(buffer, mimeType, originalName, apiKey);
      if (questions && questions.length > 0) {
        console.log(`✨ Gemini AI successfully extracted ${questions.length} questions!`);
        return questions;
      }
    } catch (err) {
      console.warn('⚠️ Gemini AI extraction error, falling back to local regex parser:', err.message);
    }
  } else {
    console.log('ℹ️ GEMINI_API_KEY not set in env, using local pdf-parse + regex parser.');
  }

  // Local fallback parser
  return parseLocalFallback(buffer, mimeType, originalName);
}

/**
 * AI-powered PDF & document parser using Gemini 1.5 Flash
 */
async function parseWithGeminiAI(buffer, mimeType, originalName, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const isPdf = mimeType === 'application/pdf' || (originalName && originalName.endsWith('.pdf'));
  const effectiveMimeType = isPdf ? 'application/pdf' : 'text/plain';

  const base64Data = buffer.toString('base64');

  const prompt = `You are an expert exam creator and document parser. Extract ALL multiple-choice questions (MCQs) from this uploaded document.
Return ONLY a valid JSON array of question objects matching this exact format with no extra markdown text outside the JSON array:

[
  {
    "id": "q_1",
    "question": "Exact question text goes here",
    "options": [
      "A) Option text 1",
      "B) Option text 2",
      "C) Option text 3",
      "D) Option text 4"
    ],
    "correctAnswer": "A",
    "marks": 1,
    "explanation": "Detailed explanation of the correct answer"
  }
]

Rules:
1. "options" must be an array of exactly 4 strings formatted as "A) ...", "B) ...", "C) ...", "D) ...".
2. "correctAnswer" must be a single uppercase letter: "A", "B", "C", or "D".
3. "marks" must be an integer (default 1).
4. Extract every question accurately. Return ONLY raw valid JSON array inside \`\`\`json \`\`\` codeblock or plain text.`;

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Data,
        mimeType: effectiveMimeType
      }
    },
    prompt
  ]);

  const text = result.response.text();
  const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

  const parsed = JSON.parse(cleanedText);
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map((q, idx) => ({
      id: q.id || `q_gemini_${Date.now()}_${idx}`,
      question: q.question || `Question ${idx + 1}`,
      options: Array.isArray(q.options) && q.options.length >= 2 
        ? q.options.slice(0, 4) 
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: (q.correctAnswer || 'A').toString().trim().toUpperCase().charAt(0),
      marks: parseInt(q.marks, 10) || 1,
      explanation: q.explanation || 'Refer to study material.'
    }));
  }

  return [];
}

/**
 * Local fallback parser using pdf-parse and regex pattern matching
 */
async function parseLocalFallback(buffer, mimeType, originalName) {
  let textContent = '';

  if (mimeType === 'application/pdf' || (originalName && originalName.endsWith('.pdf'))) {
    try {
      const pdfData = await pdfParse(buffer);
      textContent = pdfData.text || '';
    } catch (err) {
      console.error('PDF parsing error:', err);
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

  const cleanedInput = text.replace(/%PDF-[\s\S]*?%%EOF/gi, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  const cleanedText = cleanedInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const blocks = cleanedText.split(/(?=\n(?:Q\d+|Question\d+|\d+[\.\)])\s*)/i).filter(b => b.trim().length > 0);

  blocks.forEach((block, index) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    let questionText = lines[0];
    questionText = questionText.replace(/^(?:Q\d+[:\.]?|Question\s*\d+[:\.]?|\d+[\.\)])\s*/i, '').trim();

    let options = [];
    let correctAnswer = '';
    let explanation = '';
    let marks = 1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      const optionMatch = line.match(/^(?:[A-D]|\([A-D]\))[\.\:\)]\s*(.*)/i);
      const answerMatch = line.match(/^(?:Answer|Correct Answer|Ans)[:\.\s]*(.*)/i);
      const marksMatch = line.match(/^(?:Marks|Points)[:\.\s]*(\d+)/i);
      const expMatch = line.match(/^(?:Explanation)[:\.\s]*(.*)/i);

      if (optionMatch) {
        options.push(optionMatch[1].trim());
      } else if (answerMatch) {
        correctAnswer = answerMatch[1].trim().toUpperCase();
        if (correctAnswer.startsWith('A')) correctAnswer = 'A';
        else if (correctAnswer.startsWith('B')) correctAnswer = 'B';
        else if (correctAnswer.startsWith('C')) correctAnswer = 'C';
        else if (correctAnswer.startsWith('D')) correctAnswer = 'D';
      } else if (marksMatch) {
        marks = parseInt(marksMatch[1], 10) || 1;
      } else if (expMatch) {
        explanation = expMatch[1].trim();
      } else if (options.length === 0) {
        questionText += ' ' + line;
      }
    }

    if (options.length < 2) {
      options = ['Option A', 'Option B', 'Option C', 'Option D'];
    }

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
      explanation: explanation || 'Refer to study material.'
    });
  });

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
