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
      console.log('🤖 Forwarding PDF buffer directly to Gemini AI for multi-question extraction...');
      const questions = await parseWithGeminiAI(buffer, mimeType, originalName, apiKey);
      if (questions && questions.length > 0) {
        console.log(`✨ Gemini AI successfully extracted ${questions.length} distinct questions!`);
        return questions;
      }
    } catch (err) {
      console.warn('⚠️ Gemini AI extraction note, using local parser fallback:', err.message);
    }
  } else {
    console.log('ℹ️ GEMINI_API_KEY not set in env, using local pdf-parse + regex parser.');
  }

  // Local fallback parser
  return parseLocalFallback(buffer, mimeType, originalName);
}

/**
 * Helper to unbundle inline options if a single string contains embedded "A. ... B. ... C. ... D. ..."
 */
function unbundleOptions(optionsArray) {
  if (!Array.isArray(optionsArray) || optionsArray.length === 0) {
    return ["Option A", "Option B", "Option C", "Option D"];
  }

  const fullText = optionsArray.join(' ');
  const regex = /(?:^|\s+|\b)([A-D])[\.\:\)]\s*/gi;

  const positions = [];
  let match;
  while ((match = regex.exec(fullText)) !== null) {
    positions.push({
      letter: match[1].toUpperCase(),
      index: match.index,
      length: match[0].length
    });
  }

  if (positions.length >= 2) {
    const extracted = [];
    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].index + positions[i].length;
      const end = i < positions.length - 1 ? positions[i + 1].index : fullText.length;
      const optStr = fullText.slice(start, end).trim();
      if (optStr) {
        extracted.push(optStr);
      }
    }
    if (extracted.length >= 2) {
      while (extracted.length < 4) {
        extracted.push(`Option ${String.fromCharCode(65 + extracted.length)}`);
      }
      return extracted.slice(0, 4);
    }
  }

  // Standard cleanup
  const clean = optionsArray.map((opt, idx) => {
    const str = String(opt || '').trim();
    return str.replace(/^(?:[A-D]|\([A-D]\)|Option\s*[A-D])[\.\:\)]\s*/i, '').trim() || `Option ${String.fromCharCode(65 + idx)}`;
  });

  while (clean.length < 4) {
    clean.push(`Option ${String.fromCharCode(65 + clean.length)}`);
  }
  return clean.slice(0, 4);
}

/**
 * AI-powered PDF & document parser using Gemini Flash AI
 */
async function parseWithGeminiAI(buffer, mimeType, originalName, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  let model;
  const modelNames = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-1.5-flash"
  ];

  let lastErr;

  const isPdf = mimeType === 'application/pdf' || (originalName && originalName.endsWith('.pdf'));
  const effectiveMimeType = isPdf ? 'application/pdf' : 'text/plain';
  const base64Data = buffer.toString('base64');

  const prompt = `You are an expert exam creator and document parser. Extract ALL distinct multiple-choice questions (MCQs) from this uploaded document.
CRITICAL INSTRUCTIONS:
1. IGNORE cover page titles, header banners, university/school names, dates, course codes, exam instructions, total marks headers, and page footers. DO NOT extract document title as a question!
2. Extract ALL unique multiple-choice test questions from Question 1 through to the end of the document. DO NOT repeat the same question!
3. OPTIONS UNBUNDLING:
   - Options can be printed on separate lines OR on a single inline line (e.g., "A. Encapsulation B. Assembly Language C. Binary Search D. CPU Scheduling").
   - You MUST unbundle and separate every option into an individual string element in the "options" array: ["Option A text", "Option B text", "Option C text", "Option D text"].
   - DO NOT combine multiple options into a single string!
4. "correctAnswer" must be a single uppercase letter: "A", "B", "C", or "D".
5. Return ONLY a valid JSON array of question objects matching this exact format:

[
  {
    "id": "q_1",
    "question": "Which concept is most closely related to object-oriented analysis and design?",
    "options": [
      "Encapsulation",
      "Assembly Language",
      "Binary Search",
      "CPU Scheduling"
    ],
    "correctAnswer": "A",
    "marks": 1,
    "explanation": "Encapsulation is a core concept of OOAD."
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
        const seenKeys = new Set();
        const results = [];

        parsed.forEach((q, idx) => {
          const qText = String(q.question || '').trim();
          const normKey = qText.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normKey && seenKeys.has(normKey)) return; // Skip duplicate
          if (normKey) seenKeys.add(normKey);

          const rawOpts = Array.isArray(q.options) ? q.options : [];
          const cleanOpts = unbundleOptions(rawOpts);

          let ansLetter = (q.correctAnswer || 'A').toString().trim().toUpperCase().charAt(0);
          if (!['A', 'B', 'C', 'D'].includes(ansLetter)) ansLetter = 'A';

          results.push({
            id: q.id || `q_gemini_${Date.now()}_${idx}`,
            question: qText || `Question ${idx + 1}`,
            options: cleanOpts,
            correctAnswer: ansLetter,
            marks: parseInt(q.marks, 10) || 1,
            explanation: q.explanation || 'Refer to study material.'
          });
        });

        return results;
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

  // Split on question boundaries: e.g. "1.", "2)", "Q1:", "Question 3.", etc.
  const questionBoundaryRegex = /(?:^|\n)\s*(?:Q?\d+[\.\:\)]|Question\s*\d+[\.\:\)])\s+/gi;

  const matches = [];
  let match;
  while ((match = questionBoundaryRegex.exec(cleanedText)) !== null) {
    matches.push({ index: match.index, length: match[0].length, header: match[0] });
  }

  const blocks = [];
  if (matches.length >= 1) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i < matches.length - 1 ? matches[i + 1].index : cleanedText.length;
      const blockStr = cleanedText.slice(start, end).trim();
      if (blockStr) blocks.push(blockStr);
    }
  } else {
    // If no numbered markers found, fallback to double-newline paragraph blocks
    cleanedText.split(/\n\s*\n/).forEach(b => {
      if (b.trim().length > 10) blocks.push(b.trim());
    });
  }

  const seenQuestionTexts = new Set();

  blocks.forEach((block, index) => {
    const blockLines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (blockLines.length === 0) return;

    let questionText = blockLines[0];
    questionText = questionText.replace(/^(?:Q?\d+[\.\:\)]|Question\s*\d+[\.\:\)])\s*/i, '').trim();

    // Skip headers, footers, cover titles, and total marks headers
    if (
      questionText.toLowerCase().includes('midterm') || 
      questionText.toLowerCase().includes('final exam') || 
      questionText.toLowerCase().includes('university') ||
      questionText.toLowerCase().includes('total marks') ||
      questionText.length < 4
    ) {
      return;
    }

    // Deduplicate identical question texts so 1 question NEVER repeats 100 times!
    const normalizedKey = questionText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenQuestionTexts.has(normalizedKey)) {
      return; // Skip duplicate!
    }
    seenQuestionTexts.add(normalizedKey);

    let rawOptions = [];
    let correctAnswer = '';
    let explanation = '';
    let marks = 1;

    for (let i = 1; i < blockLines.length; i++) {
      const line = blockLines[i];

      const answerMatch = line.match(/^(?:Answer|Correct Answer|Ans)[:\.\s]*(.*)/i);
      const marksMatch = line.match(/^(?:Marks|Points)[:\.\s]*(\d+)/i);
      const expMatch = line.match(/^(?:Explanation)[:\.\s]*(.*)/i);

      if (answerMatch) {
        correctAnswer = answerMatch[1].trim().toUpperCase();
        if (correctAnswer.includes('A')) correctAnswer = 'A';
        else if (correctAnswer.includes('B')) correctAnswer = 'B';
        else if (correctAnswer.includes('C')) correctAnswer = 'C';
        else if (correctAnswer.includes('D')) correctAnswer = 'D';
      } else if (marksMatch) {
        marks = parseInt(marksMatch[1], 10) || 1;
      } else if (expMatch) {
        explanation = expMatch[1].trim();
      } else {
        const inlineMatches = line.split(/(?=\b[A-D][\.\:\)]\s+)/i);
        if (inlineMatches.length > 1) {
          inlineMatches.forEach(optStr => {
            const m = optStr.trim().match(/^(?:[A-D]|\([A-D]\)|Option\s*[A-D])[\.\:\)]\s*(.*)/i);
            if (m && m[1].trim()) {
              rawOptions.push(m[1].trim());
            }
          });
        } else {
          const optionMatch = line.match(/^(?:[A-D]|\([A-D]\)|Option\s*[A-D])[\.\:\)]\s*(.*)/i);
          if (optionMatch) {
            rawOptions.push(optionMatch[1].trim());
          } else if (rawOptions.length === 0) {
            questionText += ' ' + line;
          }
        }
      }
    }

    const cleanOptions = unbundleOptions(rawOptions);

    if (!correctAnswer || !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      correctAnswer = 'A';
    }

    questions.push({
      id: `q_${Date.now()}_${questions.length + 1}_${Math.random().toString(36).substr(2, 4)}`,
      question: questionText || `Question ${questions.length + 1}`,
      options: cleanOptions,
      correctAnswer,
      marks,
      explanation: explanation || 'Refer to study material.'
    });
  });

  return questions;
}

module.exports = {
  parseQuestionsFromBuffer,
  parseTextToQuestions,
  unbundleOptions
};
