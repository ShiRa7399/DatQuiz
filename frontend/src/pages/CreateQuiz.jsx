import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import BankSelectionModal from '../components/BankSelectionModal';
import AddManualQuestionModal from '../components/AddManualQuestionModal';
import EditQuestionModal from '../components/EditQuestionModal';
import { 
  ArrowLeft, Type, Plus, UploadCloud, Edit3, Trash2, 
  CheckCircle2, HelpCircle, Loader2, Sparkles, Pencil 
} from 'lucide-react';


export default function CreateQuiz() {
  const navigate = useNavigate();
  const pdfInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);
  const [maxTabSwitches, setMaxTabSwitches] = useState(3);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [showMarksToStudents, setShowMarksToStudents] = useState(false);



  const [allBanks, setAllBanks] = useState([]);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [questionPool, setQuestionPool] = useState([]);

  const [showBankModal, setShowBankModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Config state
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [bankPickCounts, setBankPickCounts] = useState({});

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
            pool.push({ ...q, _bankId: bank.id, _bankTitle: bank.title });
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

      const parsedQuestions = (newBank.questions || []).map(q => ({
        ...q, 
        _bankId: newBank.id, 
        _bankTitle: newBank.title 
      }));
      setQuestionPool((prev) => [...prev, ...parsedQuestions]);

    } catch (err) {
      console.error('PDF parse upload error:', err);
      alert('Failed to parse file: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleAddManualQuestion = (newQ) => {
    setQuestionPool((prev) => [{ ...newQ, _bankId: 'manual', _bankTitle: 'Manual Questions' }, ...prev]);
  };

  const handleRemoveQuestionFromPool = (qId) => {
    setQuestionPool((prev) => prev.filter((q) => q.id !== qId));
  };

  // Submit Final Setup
  const handleFinalizeQuiz = async (e) => {
    e.preventDefault();
    setError('');

    setSubmitting(true);
    try {
      // Pick questions based on bankPickCounts
      let finalQuestions = [];
      
      // Group pool by bank
      const grouped = {};
      questionPool.forEach(q => {
        const bId = q._bankId || 'unknown';
        if (!grouped[bId]) grouped[bId] = [];
        grouped[bId].push(q);
      });

      // For each group, shuffle and slice
      Object.keys(grouped).forEach(bId => {
        const pickCount = bankPickCounts[bId] ?? grouped[bId].length; // default to all if not set
        // Shuffle array (Fisher-Yates)
        let array = [...grouped[bId]];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        // Slice
        finalQuestions.push(...array.slice(0, pickCount));
      });

      if (finalQuestions.length === 0) {
        setError('Zero questions were selected for this quiz.');
        setSubmitting(false);
        return;
      }

      // Cleanup our internal fields
      finalQuestions = finalQuestions.map(q => {
        const { _bankId, _bankTitle, ...rest } = q;
        return rest;
      });

      const payload = {
        title: title.trim(),
        description: description.trim() || 'Standard Proctored Assessment',
        durationMinutes: Number(durationMinutes) || 30,
        marksPerQuestion: Number(marksPerQuestion) || 1,
        maxTabSwitches: Number(maxTabSwitches) >= 0 ? Number(maxTabSwitches) : 3,
        startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
        isPracticeMode: !!isPracticeMode,
        showMarksToStudents: !!showMarksToStudents,
        customQuestions: finalQuestions
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

  const handleOpenConfig = (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('Please enter a Quiz Title.');
    if (questionPool.length === 0) return setError('Your Question Pool is empty. Please select a bank or add questions.');
    
    // Initialize pick counts to maximum available per bank
    const grouped = {};
    questionPool.forEach(q => {
      const bId = q._bankId || 'unknown';
      grouped[bId] = (grouped[bId] || 0) + 1;
    });
    setBankPickCounts(grouped);
    
    setShowConfigModal(true);
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

          <form onSubmit={handleOpenConfig} className="space-y-4 flex-1 flex flex-col">
            
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
            <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between bg-slate-50/50">
              <span className="text-sm font-bold text-slate-800">
                Selected Banks ({selectedBankIds.length})
              </span>
              <button
                type="button"
                onClick={() => setShowBankModal(true)}
                className="bg-[#1a2b4c] hover:bg-[#111e36] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Select Banks
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

            <div className="pt-4 mt-auto">
              <button
                type="submit"
                className="w-full h-12 bg-[#e65c00] hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                Configure Quiz Details
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
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded mr-2">
                        {q._bankTitle}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">
                        <span className="text-[#e65c00] font-extrabold mr-1.5">{idx + 1}.</span>
                        {q.question}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 p-1.5 rounded-lg transition-colors"
                        title="Edit Question"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveQuestionFromPool(q.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {q.options && q.options.length > 0 && (
                    <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {q.options.map((opt, i) => {
                        const isCorrect = opt === q.correctAnswer;
                        return (
                          <div
                            key={i}
                            className={`text-xs px-3 py-2 rounded-lg border ${
                              isCorrect
                                ? 'bg-green-50 border-green-200 text-green-800 font-bold'
                                : 'bg-white border-gray-200 text-slate-600'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No questions loaded</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Select a question bank from the left, upload a PDF, or add questions manually to start building your pool.
                </p>
              </div>
            )}
          </div>

        </div>

      </main>



      {/* Modal 2: Final Configuration */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <h2 className="text-xl font-black text-slate-800">Final Quiz Configuration</h2>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-2 text-xl leading-none">&times;</button>
            </div>
            
            <form id="finalConfigForm" onSubmit={handleFinalizeQuiz} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* General Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Duration (Mins)</label>
                  <input type="number" min="1" required value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg h-11 px-3 text-sm font-bold focus:outline-none focus:border-[#e65c00]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Marks per Question</label>
                  <input type="number" step="any" min="0" required value={marksPerQuestion} onChange={(e) => setMarksPerQuestion(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg h-11 px-3 text-sm font-bold focus:outline-none focus:border-[#e65c00]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Allowed Tab Switches</label>
                  <input type="number" min="0" required value={maxTabSwitches} onChange={(e) => setMaxTabSwitches(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg h-11 px-3 text-sm font-bold focus:outline-none focus:border-[#e65c00]" />
                  <span className="text-[10px] text-slate-400 font-medium">Default: 3 (4th auto-submits)</span>
                </div>
              </div>


              {/* Time Window */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Start Time (Optional)</label>
                  <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg h-11 px-3 text-sm font-medium focus:outline-none focus:border-[#e65c00]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">End Time (Optional)</label>
                  <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg h-11 px-3 text-sm font-medium focus:outline-none focus:border-[#e65c00]" />
                </div>
              </div>

              {/* Assessment Mode Options */}
              <div className="space-y-3 bg-orange-50/50 border border-orange-100 p-4 rounded-2xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPracticeMode}
                    onChange={(e) => setIsPracticeMode(e.target.checked)}
                    className="w-4 h-4 text-[#e65c00] rounded focus:ring-orange-500 accent-[#e65c00]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Enable Practice Mode</span>
                    <span className="text-[11px] text-slate-500 block">Shows immediate correct answer & explanation right after selecting each option.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-orange-100/80">
                  <input
                    type="checkbox"
                    checked={showMarksToStudents}
                    onChange={(e) => setShowMarksToStudents(e.target.checked)}
                    className="w-4 h-4 text-[#e65c00] rounded focus:ring-orange-500 accent-[#e65c00]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Show Marks to Students After Exam (Default: Off)</span>
                    <span className="text-[11px] text-slate-500 block">If enabled, displays total score obtained on the final completion screen.</span>
                  </div>
                </label>
              </div>

              <hr className="border-slate-100" />


              {/* Question Sampling by Bank */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">Questions per Bank</h3>
                <p className="text-xs text-slate-500 mb-4">Choose how many questions to randomly pick from each bank.</p>
                <div className="space-y-3">
                  {Object.keys(bankPickCounts).length > 0 ? (
                    Object.keys(bankPickCounts).map((bId) => {
                      const bankTitle = questionPool.find(q => q._bankId === bId)?._bankTitle || 'Unknown';
                      const maxAvailable = questionPool.filter(q => q._bankId === bId).length;
                      
                      return (
                        <div key={bId} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                          <span className="text-sm font-bold text-slate-700 truncate mr-3">{bankTitle} (Max: {maxAvailable})</span>
                          <input 
                            type="number" 
                            min="0" 
                            max={maxAvailable} 
                            value={bankPickCounts[bId]} 
                            onChange={(e) => setBankPickCounts({ ...bankPickCounts, [bId]: parseInt(e.target.value) || 0 })}
                            className="w-20 bg-white border border-slate-300 rounded-lg h-9 px-2 text-sm font-bold text-center focus:outline-none focus:border-[#e65c00]"
                          />
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-sm text-red-500 font-bold">No questions available to pick.</div>
                  )}
                </div>
                <div className="mt-4 text-right">
                  <span className="text-xs font-bold text-slate-500">Total Quiz Questions: </span>
                  <span className="text-lg font-black text-[#e65c00]">{Object.values(bankPickCounts).reduce((a, b) => a + (parseInt(b) || 0), 0)}</span>
                </div>
              </div>

            </form>

            <div className="px-6 py-5 border-t border-slate-100 shrink-0 flex justify-end gap-3 bg-white">
              <button onClick={() => setShowConfigModal(false)} className="px-6 py-2.5 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" form="finalConfigForm" disabled={submitting || Object.values(bankPickCounts).reduce((a, b) => a + (parseInt(b) || 0), 0) === 0} className="px-6 py-2.5 rounded-xl bg-[#e65c00] text-white font-bold text-sm shadow-md hover:bg-orange-700 transition-colors disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaveSuccess={(updatedQ) => {
            setQuestionPool(prev => prev.map(item => item.id === updatedQ.id ? { ...item, ...updatedQ } : item));
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
}
