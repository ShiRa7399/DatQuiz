import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import BankSelectionModal from '../components/BankSelectionModal';
import AddManualQuestionModal from '../components/AddManualQuestionModal';
import { 
  ArrowLeft, Type, Plus, UploadCloud, Edit3, Trash2, 
  CheckCircle2, HelpCircle, Loader2, Sparkles 
} from 'lucide-react';

export default function CreateQuiz() {
  const navigate = useNavigate();
  const pdfInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);

  const [allBanks, setAllBanks] = useState([]);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [questionPool, setQuestionPool] = useState([]);

  const [showBankModal, setShowBankModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const res = await api.get('/question-bank/list');
      setAllBanks(res.data.banks || []);
    } catch (err) {
      console.error('Error fetching question banks:', err);
    }
  };

  // Re-calculate loaded question pool based on selected question banks + manual questions
  const updatePoolFromBanks = (bankIds, manualQuestions = []) => {
    let pool = [...manualQuestions];
    bankIds.forEach((bId) => {
      const bank = allBanks.find((b) => b.id === bId);
      if (bank && bank.questions) {
        // avoid duplicates
        bank.questions.forEach((q) => {
          if (!pool.some((item) => item.id === q.id)) {
            pool.push(q);
          }
        });
      }
    });
    setQuestionPool(pool);
  };

  const handleToggleBank = (bank) => {
    let updated;
    if (selectedBankIds.includes(bank.id)) {
      updated = selectedBankIds.filter((id) => id !== bank.id);
    } else {
      updated = [...selectedBankIds, bank.id];
    }
    setSelectedBankIds(updated);
    
    // Extract manual questions currently in pool
    const manualOnly = questionPool.filter((q) => q.id?.startsWith('q_manual_'));
    updatePoolFromBanks(updated, manualOnly);
  };

  // Direct PDF Upload inside Create Quiz
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPdf(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ""));

    try {
      const res = await api.post('/question-bank/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newBank = res.data.questionBank;

      // Add to bank list & automatically select it
      setAllBanks((prev) => [newBank, ...prev]);
      const updatedIds = [...selectedBankIds, newBank.id];
      setSelectedBankIds(updatedIds);

      const manualOnly = questionPool.filter((q) => q.id?.startsWith('q_manual_'));
      setQuestionPool((prev) => [...prev, ...(newBank.questions || [])]);

    } catch (err) {
      console.error('PDF parse upload error:', err);
      alert('Failed to parse file: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleAddManualQuestion = (newQ) => {
    setQuestionPool((prev) => [newQ, ...prev]);
  };

  const handleRemoveQuestionFromPool = (qId) => {
    setQuestionPool((prev) => prev.filter((q) => q.id !== qId));
  };

  // Submit Final Setup
  const handleFinalizeQuiz = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a Quiz Title.');
      return;
    }

    if (questionPool.length === 0) {
      setError('Your Question Pool is empty. Please select a bank, upload a PDF, or add questions manually.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || 'Standard Proctored Assessment',
        durationMinutes: Number(durationMinutes) || 30,
        marksPerQuestion: Number(marksPerQuestion) || 1,
        customQuestions: questionPool
      };

      await api.post('/quiz', payload);
      navigate('/dashboard');
    } catch (err) {
      console.error('Finalize quiz error:', err);
      setError(err.response?.data?.error || 'Failed to create quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6ebd8] flex flex-col select-none font-sans">
      
      {/* Hidden File Input for PDF */}
      <input
        type="file"
        ref={pdfInputRef}
        onChange={handlePdfUpload}
        accept=".pdf,.txt"
        className="hidden"
      />

      {/* Top Header Bar */}
      <header className="h-14 bg-[#e65c00] text-white px-6 flex items-center gap-3 shadow-none shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-1 hover:bg-orange-800/60 rounded-lg text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-white tracking-tight">Create Quiz</h1>
      </header>

      {/* Main Scaffold Grid */}
      <main className="p-6 bg-[#f6ebd8] flex-1 flex flex-col md:flex-row gap-6">
        
        {/* LEFT COLUMN: Quiz Configuration Card */}
        <div className="w-full md:w-[360px] lg:w-[400px] shrink-0 bg-white rounded-2xl p-6 shadow-sm border border-orange-200/50 space-y-5 flex flex-col">
          
          <h2 className="text-xl font-bold text-[#e65c00]">Quiz Configuration</h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleFinalizeQuiz} className="space-y-4 flex-1 flex flex-col">
            
            {/* Field 1: Quiz Title */}
            <div className="space-y-1">
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-[#e65c00] font-black text-lg pointer-events-none">
                  T
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Quiz Title"
                  required
                  className="w-full h-12 bg-white border border-gray-300 rounded-xl pl-10 pr-4 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#e65c00] focus:border-2"
                />
              </div>
            </div>

            {/* Field 2: Selected Banks Selector Box */}
            <div className="border border-gray-200 rounded-xl p-3 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-800">
                Selected Banks ({selectedBankIds.length})
              </span>
              <button
                type="button"
                onClick={() => setShowBankModal(true)}
                className="bg-[#1a2b4c] hover:bg-[#111e36] text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Select Banks
              </button>
            </div>

            {/* Field 3: Upload PDF (Saves to Bank) */}
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={uploadingPdf}
              className="w-full h-11 bg-[#fff8ee] hover:bg-orange-100/60 text-[#e65c00] border border-orange-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {uploadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading & Parsing...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" /> Upload PDF (Saves to Bank)
                </>
              )}
            </button>

            {/* Field 4: Add Question Manually */}
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="w-full h-11 bg-white hover:bg-orange-50 text-[#e65c00] border border-orange-400 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Edit3 className="w-4 h-4 text-[#e65c00]" /> Add Question Manually
            </button>

            <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Duration (Mins)
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full h-10 bg-white border border-gray-300 rounded-lg px-3 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Marks / Question
                </label>
                <input
                  type="number"
                  value={marksPerQuestion}
                  onChange={(e) => setMarksPerQuestion(e.target.value)}
                  className="w-full h-10 bg-white border border-gray-300 rounded-lg px-3 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Field 5: Finalize Button */}
            <div className="pt-4 mt-auto">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-[#38a169] hover:bg-[#2f855a] text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Finalizing Setup...' : 'Preview & Finalize Setup'}
              </button>
            </div>

          </form>

        </div>

        {/* RIGHT COLUMN: Total Loaded Pool (N) */}
        <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-orange-200/50 flex flex-col">
          
          <div className="border-b border-gray-100 pb-3 mb-4 shrink-0 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#e65c00]">
              Total Loaded Pool ({questionPool.length})
            </h2>
            {questionPool.length > 0 && (
              <button
                onClick={() => setQuestionPool([])}
                className="text-xs text-red-500 font-bold hover:underline"
              >
                Clear Pool
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {questionPool.length > 0 ? (
              questionPool.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 rounded-xl border border-gray-200 bg-slate-50/50 space-y-2 relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900 text-sm">
                      <span className="text-[#e65c00] font-extrabold mr-1.5">{idx + 1}.</span>
                      {q.question}
                    </h3>
                    <button
                      onClick={() => handleRemoveQuestionFromPool(q.id)}
                      title="Remove from Quiz Pool"
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options && q.options.map((opt, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isCorrect = q.correctAnswer === letter || opt.toLowerCase().startsWith(letter.toLowerCase());
                      return (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-lg border text-xs ${
                            isCorrect ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900' : 'bg-white border-gray-200 text-slate-700'
                          }`}
                        >
                          <span className="font-bold mr-1.5">{letter})</span> {opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
                <HelpCircle className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-slate-400">
                  No questions selected/added yet.
                </p>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Modals */}
      {showBankModal && (
        <BankSelectionModal
          banks={allBanks}
          selectedBankIds={selectedBankIds}
          onToggleBank={handleToggleBank}
          onClose={() => setShowBankModal(false)}
          onConfirm={() => setShowBankModal(false)}
        />
      )}

      {showManualModal && (
        <AddManualQuestionModal
          onAddQuestion={handleAddManualQuestion}
          onClose={() => setShowManualModal(false)}
        />
      )}

    </div>
  );
}
