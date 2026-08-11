import React, { useState } from 'react';
import { X, Save, Edit3 } from 'lucide-react';
import api from '../utils/api';

export default function EditQuestionModal({ bankId, question: initialQ, onClose, onSaveSuccess }) {
  const [questionText, setQuestionText] = useState(initialQ?.question || '');
  const [optA, setOptA] = useState(initialQ?.options?.[0] || '');
  const [optB, setOptB] = useState(initialQ?.options?.[1] || '');
  const [optC, setOptC] = useState(initialQ?.options?.[2] || '');
  const [optD, setOptD] = useState(initialQ?.options?.[3] || '');
  const [correctAnswer, setCorrectAnswer] = useState(initialQ?.correctAnswer || 'A');
  const [explanation, setExplanation] = useState(initialQ?.explanation || '');
  const [marks, setMarks] = useState(initialQ?.marks || 1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) return setError('Question text is required.');
    if (!optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      return setError('All 4 options (A, B, C, D) are required.');
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        question: questionText.trim(),
        options: [
          optA.trim().replace(/^[A-D][\.\:\)]\s*/i, ''),
          optB.trim().replace(/^[A-D][\.\:\)]\s*/i, ''),
          optC.trim().replace(/^[A-D][\.\:\)]\s*/i, ''),
          optD.trim().replace(/^[A-D][\.\:\)]\s*/i, '')
        ],
        correctAnswer: correctAnswer.toUpperCase(),
        explanation: explanation.trim(),
        marks: parseInt(marks, 10) || 1
      };

      if (bankId) {
        const res = await api.put(`/question-bank/${bankId}/question/${initialQ.id}`, payload);
        if (onSaveSuccess) onSaveSuccess(res.data.questionBank);
      } else {
        // Local state edit callback
        if (onSaveSuccess) onSaveSuccess({ ...initialQ, ...payload });
      }

      onClose();
    } catch (err) {
      console.error('Error saving question edit:', err);
      setError(err.response?.data?.error || 'Failed to update question.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
              <Edit3 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">Edit Question</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">
              {error}
            </div>
          )}

          {/* Question Text */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Question Text *
            </label>
            <textarea
              required
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Enter question prompt..."
            />
          </div>

          {/* Options grid */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-600 uppercase">
              Answer Options (A, B, C, D) *
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-extrabold text-orange-700 block mb-1">Option A</span>
                <input
                  type="text"
                  required
                  value={optA}
                  onChange={(e) => setOptA(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              <div>
                <span className="text-[11px] font-extrabold text-orange-700 block mb-1">Option B</span>
                <input
                  type="text"
                  required
                  value={optB}
                  onChange={(e) => setOptB(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              <div>
                <span className="text-[11px] font-extrabold text-orange-700 block mb-1">Option C</span>
                <input
                  type="text"
                  required
                  value={optC}
                  onChange={(e) => setOptC(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              <div>
                <span className="text-[11px] font-extrabold text-orange-700 block mb-1">Option D</span>
                <input
                  type="text"
                  required
                  value={optD}
                  onChange={(e) => setOptD(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
            </div>
          </div>

          {/* Correct Answer & Marks */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Correct Answer *
              </label>
              <select
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Marks
              </label>
              <input
                type="number"
                min="1"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Explanation (Optional)
            </label>
            <input
              type="text"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Explanation for students in practice mode..."
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Question'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
