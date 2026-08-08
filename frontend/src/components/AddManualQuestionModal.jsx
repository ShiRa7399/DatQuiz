import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import TextField from './TextField';
import PrimaryButton from './PrimaryButton';

export default function AddManualQuestionModal({ onAddQuestion, onClose }) {
  const [questionText, setQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!questionText.trim()) return alert('Question text is required.');
    if (!optA.trim() || !optB.trim()) return alert('At least Options A and B are required.');

    const newQ = {
      id: `q_manual_${Date.now()}`,
      question: questionText.trim(),
      options: [
        optA.trim(),
        optB.trim(),
        optC.trim() || 'Option C',
        optD.trim() || 'Option D'
      ],
      correctAnswer,
      marks: 1,
      explanation: 'Manually added question.'
    };

    onAddQuestion(newQ);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-[550px] w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        <div className="bg-[#f6ebd8] px-6 py-4 flex justify-between items-center border-b border-orange-200/60 shrink-0">
          <h2 className="text-xl font-bold text-[#e65c00]">Add Question Manually</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Question Text *
            </label>
            <textarea
              rows={2}
              required
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g. What is the complexity of binary search?"
              className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-[#e65c00] focus:border-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Option A *" value={optA} onChange={setOptA} placeholder="e.g. O(log N)" required />
            <TextField label="Option B *" value={optB} onChange={setOptB} placeholder="e.g. O(N)" required />
            <TextField label="Option C" value={optC} onChange={setOptC} placeholder="e.g. O(N^2)" />
            <TextField label="Option D" value={optD} onChange={setOptD} placeholder="e.g. O(1)" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Correct Answer *
            </label>
            <select
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="w-full h-12 bg-white border border-gray-300 rounded-xl px-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e65c00]"
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </div>

          <div className="pt-2">
            <PrimaryButton type="submit" icon={PlusCircle}>
              Add to Quiz Pool
            </PrimaryButton>
          </div>
        </form>

      </div>
    </div>
  );
}
