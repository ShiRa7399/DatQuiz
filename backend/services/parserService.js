const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * Retrieves Gemini API Key from:
 * 1. Explicit parameter / header
 * 2. backend/config/geminiConfig.json
 * 3. process.env.GEMINI_API_KEY
 */
function getGeminiApiKey(customApiKey) {
  if (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 5) {
    return customApiKey.trim();
  }

  try {
    const configPath = path.join(__dirname, '../config/geminiConfig.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && typeof parsed.apiKey === 'string' && parsed.apiKey.trim().length > 5) {
        return parsed.apiKey.trim();
      }
    }
  } catch (err) {
    console.warn('⚠️ Note reading geminiConfig.json:', err.message);
  }

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5) {
    return process.env.GEMINI_API_KEY.trim();
  }

  return null;
}

/**
 * Parses raw text or PDF buffer into structured JSON questions array.
 * Uses Gemini API (from config/geminiConfig.json or env) with automatic fallback to pdf-parse + regex.
 */
async function parseQuestionsFromBuffer(buffer, mimeType, originalName, requestApiKey = null) {
  const apiKey = getGeminiApiKey(requestApiKey);

  if (apiKey) {
    try {
      console.log('🤖 Forwarding PDF buffer to Gemini AI. Testing models: gemini-3.8-flash, gemini-3.7-flash, gemini-3.6-flash, gemini-3.5-flash-lite...');
      const result = await parseWithGeminiAI(buffer, mimeType, originalName, apiKey);
      if (result && result.questions && result.questions.length > 0) {
        console.log(`✨ Gemini AI (${result.modelUsed}) successfully extracted ${result.questions.length} distinct questions!`);
        return result;
      }
    } catch (err) {
      console.warn('⚠️ Gemini AI extraction failed across model chain:', err.message);
    }
  } else {
    console.log('ℹ️ Gemini API key not found in backend/config/geminiConfig.json or env. Using local parser fallback.');
  }

  // Local fallback parser
  const localQuestions = await parseLocalFallback(buffer, mimeType, originalName);
  return {
    questions: localQuestions,
    modelUsed: 'Local Regex Parser'
  };
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
  * AI-powered PDF & document parser using Gemini Flash & Lite models
  */
async function parseWithGeminiAI(buffer, mimeType, originalName, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // List of Gemini model versions prioritized as requested by user
  const modelNames = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
  ];
  let lastErr;

  const isPdf = mimeType === 'application/pdf' || (originalName && originalName.endsWith('.pdf'));
  const effectiveMimeType = isPdf ? 'application/pdf' : 'text/plain';
  const base64Data = buffer.toString('base64');

  // Pre-extract text from PDF if possible so Gemini receives text AND/OR binary inline data
  let pdfText = '';
  if (isPdf) {
    try {
      const pdfData = await pdfParse(buffer);
      pdfText = pdfData.text || '';
    } catch (err) {
      console.log('ℹ️ PDF text pre-extraction note:', err.message);
    }
  } else {
    pdfText = buffer.toString('utf-8');
  }

  const prompt = `You are an expert exam creator and document parser. Extract ALL distinct multiple-choice questions (MCQs) from this uploaded document.
CRITICAL INSTRUCTIONS:
1. IGNORE cover page titles, header banners, university/school names, dates, course codes, exam instructions, total marks headers, and page footers. DO NOT extract document title as a question!
2. Extract ALL unique multiple-choice test questions from Question 1 through to the end of the document. Parse every single question in full!
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
      console.log(`🤖 Attempting Gemini extraction with model: ${mName}...`);
      let text = '';

      // Prepare payload content parts (Text + Binary inline data if PDF)
      const contentsParts = [];
      if (pdfText && pdfText.trim().length > 30) {
        contentsParts.push({ text: `DOCUMENT EXTRACTED TEXT:\n${pdfText.slice(0, 80000)}` });
      }
      if (isPdf && base64Data) {
        contentsParts.push({
          inlineData: {
            data: base64Data,
            mimeType: effectiveMimeType
          }
        });
      }
      contentsParts.push({ text: prompt });

      try {
        const model = genAI.getGenerativeModel({ model: mName });
        const result = await model.generateContent(contentsParts);
        text = result.response.text();
      } catch (sdkErr) {
        console.log(`ℹ️ SDK call for ${mName} note (${sdkErr.message}). Trying text-only SDK prompt...`);
        // Retry SDK call with text-only if binary inlineData failed on this model
        try {
          const model = genAI.getGenerativeModel({ model: mName });
          const textOnlyParts = pdfText ? [{ text: `DOCUMENT TEXT:\n${pdfText.slice(0, 80000)}` }, { text: prompt }] : [prompt];
          const result = await model.generateContent(textOnlyParts);
          text = result.response.text();
        } catch (textSdkErr) {
          console.log(`ℹ️ Text-only SDK call for ${mName} note (${textSdkErr.message}). Trying REST API...`);
          // REST API fallback
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${apiKey}`;
          const restParts = pdfText 
            ? [{ text: `DOCUMENT TEXT:\n${pdfText.slice(0, 80000)}` }, { text: prompt }]
            : [{ inline_data: { mime_type: effectiveMimeType, data: base64Data } }, { text: prompt }];

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: restParts }] })
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini REST API error ${res.status}: ${errText}`);
          }
          const resData = await res.json();
          text = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      }

      if (!text) continue;

      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const seenKeys = new Set();
        const results = [];

        parsed.forEach((q, idx) => {
          const qText = String(q.question || '').trim();
          const normKey = qText.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normKey && seenKeys.has(normKey)) return;
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
            explanation: q.explanation || 'Refer to study material.',
            parsedBy: `Gemini AI (${mName})`
          });
        });

        console.log(`✅ Model ${mName} successfully extracted ${results.length} questions!`);
        return {
          questions: results,
          modelUsed: `Gemini AI (${mName})`
        };
      }
    } catch (err) {
      lastErr = err;
      console.warn(`Model ${mName} attempt note:`, err.message);
    }
  }

  if (lastErr) throw lastErr;
  return null;
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

  const cleanedText = text
    .replace(/%PDF-[\s\S]*?%%EOF/gi, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Match question boundary markers anywhere: e.g. "1.", " 2.", "\n3.", "Question 4:", "Q5."
  const qRegex = /(?:^|\s+|\n)(?:Q\s*|Question\s*)?(\d+)[\.\:\)]\s+/gi;

  const matches = [];
  let match;
  while ((match = qRegex.exec(cleanedText)) !== null) {
    const qNum = parseInt(match[1], 10);
    if (qNum > 0 && qNum <= 500) {
      matches.push({
        num: qNum,
        index: match.index,
        matchLength: match[0].length
      });
    }
  }

  const blocks = [];
  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = (i < matches.length - 1) ? matches[i + 1].index : cleanedText.length;
      const blockText = cleanedText.slice(start, end).trim();
      if (blockText.length > 5) {
        blocks.push(blockText);
      }
    }
  } else {
    cleanedText.split(/\n\s*\n/).forEach(b => {
      if (b.trim().length > 10) blocks.push(b.trim());
    });
  }

  const seenQuestionTexts = new Set();

  blocks.forEach((block, index) => {
    let content = block.replace(/^(?:^|\s*)(?:Q\s*|Question\s*)?\d+[\.\:\)]\s*/i, '').trim();

    if (!content || content.length < 4) return;

    const lowerContent = content.toLowerCase();
    if (
      lowerContent.startsWith('midterm') ||
      lowerContent.startsWith('final exam') ||
      lowerContent.startsWith('total marks') ||
      lowerContent.startsWith('university')
    ) {
      return;
    }

    let questionText = content;
    let rawOptions = [];
    let correctAnswer = 'A';
    let explanation = 'Refer to study material.';

    // Extract options A., B., C., D. inside content block
    const optRegex = /(?:^|\s+|\n)([A-D])[\.\:\)]\s+/gi;
    const optMatches = [];
    let oMatch;
    while ((oMatch = optRegex.exec(content)) !== null) {
      optMatches.push({
        letter: oMatch[1].toUpperCase(),
        index: oMatch.index,
        matchLength: oMatch[0].length
      });
    }

    if (optMatches.length >= 2) {
      questionText = content.slice(0, optMatches[0].index).trim();

      for (let i = 0; i < optMatches.length; i++) {
        const start = optMatches[i].index + optMatches[i].matchLength;
        const end = (i < optMatches.length - 1) ? optMatches[i + 1].index : content.length;
        let optText = content.slice(start, end).trim();

        const ansCheck = optText.match(/^(.*?)(?:\s+(?:Ans|Answer|Correct Answer)[:\.\s]*(.*))$/i);
        if (ansCheck) {
          optText = ansCheck[1].trim();
          const ansStr = ansCheck[2].trim().toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(ansStr.charAt(0))) {
            correctAnswer = ansStr.charAt(0);
          }
        }

        if (optText) rawOptions.push(optText);
      }
    } else {
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        questionText = lines[0];
        for (let i = 1; i < lines.length; i++) {
          const l = lines[i];
          const m = l.match(/^(?:[A-D]|\([A-D]\))[\.\:\)]\s*(.*)/i);
          if (m) {
            rawOptions.push(m[1].trim());
          } else {
            questionText += ' ' + l;
          }
        }
      }
    }

    questionText = questionText.replace(/\s+/g, ' ').trim();
    if (!questionText || questionText.length < 3) return;

    const normKey = questionText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenQuestionTexts.has(normKey)) return;
    seenQuestionTexts.add(normKey);

    const cleanOptions = unbundleOptions(rawOptions);

    questions.push({
      id: `q_${Date.now()}_${questions.length + 1}_${Math.random().toString(36).substr(2, 4)}`,
      question: questionText,
      options: cleanOptions,
      correctAnswer,
      marks: 1,
      explanation
    });
  });

  return questions;
}

module.exports = {
  parseQuestionsFromBuffer,
  parseTextToQuestions,
  unbundleOptions
};
