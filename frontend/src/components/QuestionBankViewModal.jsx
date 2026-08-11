import React, { useState } from 'react';
import api from '../utils/api';
import { X, Trash2, FileText, CheckCircle2, HelpCircle, Edit3 } from 'lucide-react';
import EditQuestionModal from './EditQuestionModal';

export default function QuestionBankViewModal({ bank: initialBank, onClose, onRefresh }) {
  const [bank, setBank] = useState(initialBank);
  const [deletingId, setDeletingId] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question from the question bank?')) return;
    
    setDeletingId(questionId);
    try {
      const res = await api.delete(`/question-bank/${bank.id}/question/${questionId}`);
      setBank(res.data.questionBank);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to delete question:', err);
      alert('Failed to delete question.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveEditedQuestion = (updatedBank) => {
    if (updatedBank && updatedBank.questions) {
      setBank(updatedBank);
    }
    if (onRefresh) onRefresh();
  };

  if (!bank) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      {/* Modal Box */}
      <div className="max-w-[850px] w-full max-h-[700px] h-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-[#f6ebd8] px-6 py-4 flex justify-between items-center border-b border-orange-200/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 text-[#e65c00] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#e65c00]">{bank.name || bank.title}</h2>
              <p className="text-xs font-semibold text-slate-500">
                {bank.questions?.length || 0} Questions Parsed
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-orange-100/60 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Questions Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {bank.questions && bank.questions.length > 0 ? (
            bank.questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs relative space-y-3"
              >
                {/* Header: Question Number & Action Buttons */}
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    <span className="text-[#e65c00] font-extrabold mr-1.5">{idx + 1}.</span>
                    {q.question}
                  </h3>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingQuestion(q)}
                      title="Edit Question"
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      disabled={deletingId === q.id}
                      title="Delete Question"
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>


                {/* Options 2x2 Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options && q.options.map((opt, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const isCorrect = q.correctAnswer === letter || opt.toLowerCase().startsWith(letter.toLowerCase());

                    return (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-slate-50 border-gray-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-slate-600'
                        }`}>
                          {letter}
                        </span>
                        <span className="truncate">{opt}</span>
                        {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation / Marks Footer */}
                {q.explanation && (
                  <p className="text-[11px] text-slate-400 italic pt-1 border-t border-gray-100">
                    Explanation: {q.explanation}
                  </p>
                )}

              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
              <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Questions in this Bank</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-gray-200 flex justify-between items-center text-xs text-slate-500">
          <span>Click the pencil icon to edit or trash icon to delete any question.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#e65c00] text-white font-bold rounded-xl hover:bg-[#c85000] transition-colors"
          >
            Done
          </button>
        </div>

      </div>

      {editingQuestion && (
        <EditQuestionModal
          bankId={bank.id}
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaveSuccess={handleSaveEditedQuestion}
        />
      )}
    </div>
  );
}

