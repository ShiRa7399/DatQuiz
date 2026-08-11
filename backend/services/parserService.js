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
      console.log('🤖 Attempting AI PDF extraction via Gemini AI...');
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
 * AI-powered PDF & document parser using Gemini Flash AI
 */
async function parseWithGeminiAI(buffer, mimeType, originalName, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try standard model names
  let model;
  const modelNames = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
  let lastErr;

  const isPdf = mimeType === 'application/pdf' || (originalName && originalName.endsWith('.pdf'));
  const effectiveMimeType = isPdf ? 'application/pdf' : 'text/plain';
  const base64Data = buffer.toString('base64');

  const prompt = `You are an expert exam creator and document parser. Extract ALL multiple-choice questions (MCQs) from this uploaded document.
CRITICAL INSTRUCTIONS:
1. IGNORE cover page titles, header banners, university/school names, dates, course codes, exam instructions, total marks headers, and page footers. DO NOT extract document title as a question!
2. Extract ONLY actual multiple-choice test questions.
3. "options" must be an array of 4 clean choice text strings WITHOUT prefixing "A)" or "Option A". E.g.: ["Choice 1", "Choice 2", "Choice 3", "Choice 4"].
4. "correctAnswer" must be a single uppercase letter: "A", "B", "C", or "D".
5. Return ONLY a valid JSON array of question objects matching this exact format:

[
  {
    "id": "q_1",
    "question": "Which protocol is used for secure web browsing?",
    "options": [
      "HTTP",
      "HTTPS",
      "FTP",
      "SMTP"
    ],
    "correctAnswer": "B",
    "marks": 1,
    "explanation": "HTTPS provides SSL/TLS encryption for web traffic."
  }
]

Return ONLY raw valid JSON array inside \`\`\`json \`\`\` codeblock or plain text without surrounding commentary.`;

  for (const mName of modelNames) {
    try {
      model = genAI.getGenerativeModel({ model: mName });
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
        return parsed.map((q, idx) => {
          const rawOpts = Array.isArray(q.options) ? q.options : [];
          const cleanOpts = rawOpts.map((opt, oIdx) => {
            const str = String(opt || '').trim();
            return str.replace(/^(?:[A-D]|\([A-D]\)|Option\s*[A-D])[\.\:\)]\s*/i, '').trim() || `Option ${String.fromCharCode(65 + oIdx)}`;
          });

          while (cleanOpts.length < 4) {
            cleanOpts.push(`Option ${String.fromCharCode(65 + cleanOpts.length)}`);
          }

          let ansLetter = (q.correctAnswer || 'A').toString().trim().toUpperCase().charAt(0);
          if (!['A', 'B', 'C', 'D'].includes(ansLetter)) ansLetter = 'A';

          return {
            id: q.id || `q_gemini_${Date.now()}_${idx}`,
            question: q.question || `Question ${idx + 1}`,
            options: cleanOpts.slice(0, 4),
            correctAnswer: ansLetter,
            marks: parseInt(q.marks, 10) || 1,
            explanation: q.explanation || 'Refer to study material.'
          };
        });
      }
    } catch (err) {
      lastErr = err;
      console.warn(`Model ${mName} attempt note:`, err.message);
    }
  }

  if (lastErr) throw lastErr;
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

  // Skip document header block if present
  let lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Filter out top header noise lines before Question 1
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.match(/^(?:Q\d+|Question\s*\d+|\d+[\.\)])\s*/i)) {
      startIndex = i;
      break;
    }
  }

  const remainingText = lines.slice(startIndex).join('\n');
  const blocks = remainingText.split(/(?=\n(?:Q\d+|Question\d+|\d+[\.\)])\s*)/i).filter(b => b.trim().length > 0);

  blocks.forEach((block, index) => {
    const blockLines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (blockLines.length === 0) return;

    let questionText = blockLines[0];
    questionText = questionText.replace(/^(?:Q\d+[:\.]?|Question\s*\d+[:\.]?|\d+[\.\)])\s*/i, '').trim();

    // Ignore if question text looks like a document title or header banner
    if (
      questionText.toLowerCase().includes('midterm') || 
      questionText.toLowerCase().includes('final exam') || 
      questionText.toLowerCase().includes('university') ||
      questionText.toLowerCase().includes('total marks') ||
      questionText.length < 5
    ) {
      return;
    }

    let rawOptions = [];
    let correctAnswer = '';
    let explanation = '';
    let marks = 1;

    for (let i = 1; i < blockLines.length; i++) {
      const line = blockLines[i];

      const optionMatch = line.match(/^(?:[A-D]|\([A-D]\)|Option\s*[A-D])[\.\:\)]\s*(.*)/i);
      const answerMatch = line.match(/^(?:Answer|Correct Answer|Ans)[:\.\s]*(.*)/i);
      const marksMatch = line.match(/^(?:Marks|Points)[:\.\s]*(\d+)/i);
      const expMatch = line.match(/^(?:Explanation)[:\.\s]*(.*)/i);

      if (optionMatch) {
        rawOptions.push(optionMatch[1].trim());
      } else if (answerMatch) {
        correctAnswer = answerMatch[1].trim().toUpperCase();
        if (correctAnswer.includes('A')) correctAnswer = 'A';
        else if (correctAnswer.includes('B')) correctAnswer = 'B';
        else if (correctAnswer.includes('C')) correctAnswer = 'C';
        else if (correctAnswer.includes('D')) correctAnswer = 'D';
      } else if (marksMatch) {
        marks = parseInt(marksMatch[1], 10) || 1;
      } else if (expMatch) {
        explanation = expMatch[1].trim();
      } else if (rawOptions.length === 0) {
        questionText += ' ' + line;
      }
    }

    const cleanOptions = rawOptions.map((opt, oIdx) => {
      const str = String(opt || '').trim();
      return str.replace(/^(?:[A-D]|\([A-D]\)|Option\s*[A-D])[\.\:\)]\s*/i, '').trim() || `Option ${String.fromCharCode(65 + oIdx)}`;
    });

    while (cleanOptions.length < 4) {
      cleanOptions.push(`Option ${String.fromCharCode(65 + cleanOptions.length)}`);
    }

    if (!correctAnswer || !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      correctAnswer = 'A';
    }

    questions.push({
      id: `q_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
      question: questionText || `Question ${index + 1}`,
      options: cleanOptions.slice(0, 4),
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
        "Managing courses & assessment",
        "Operating system kernel",
        "Database indexer",
        "Hardware firmware"
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
