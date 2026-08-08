import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  BookOpen, UploadCloud, FileText, Trash2, CheckCircle2, 
  Plus, AlertCircle, HelpCircle, Eye, Sparkles
} from 'lucide-react';

export default function QuestionBanks() {
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Manual Question state
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectAns, setNewCorrectAns] = useState('A');

  useEffect(() => {
    fetchQuestionBanks();
  }, []);

  const fetchQuestionBanks = async () => {
    try {
      const res = await api.get('/question-bank');
      const list = res.data.questionBanks || [];
      setBanks(list);
      if (list.length > 0 && !selectedBank) {
        setSelectedBank(list[0]);
      }
    } catch (err) {
      console.error('Error fetching question banks:', err);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatusMsg({ type: 'error', text: 'Please select a .pdf or .txt file first.' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Parsing document & extracting questions...' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name.replace(/\.[^/.]+$/, ""));
    formData.append('description', description || 'AI-Parsed Question Bank');

    try {
      const res = await api.post('/question-bank/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setStatusMsg({ type: 'success', text: `Successfully parsed ${res.data.questionBank.questions.length} questions!` });
      setFile(null);
      setTitle('');
      setDescription('');
      fetchQuestionBanks();
      setSelectedBank(res.data.questionBank);
    } catch (err) {
      console.error('File upload error:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Failed to parse file.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (bankId, qId) => {
    try {
      const res = await api.delete(`/question-bank/${bankId}/question/${qId}`);
      setSelectedBank(res.data.questionBank);
      fetchQuestionBanks();
      setStatusMsg({ type: 'success', text: 'Question removed.' });
    } catch (err) {
      console.error('Delete question error:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-brand-600" /> Question Banks & AI Parser
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload PDF or TXT documents to automatically generate JSON MCQs with answer verification.
        </p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl font-medium text-sm border flex items-center gap-2 ${
          statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
          'bg-brand-50 text-brand-800 border-brand-200'
        }`}>
          {statusMsg.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {statusMsg.text}
        </div>
      )}

      {/* Main Grid: Upload & Bank List / Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: File Uploader Card & Bank Selector */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-brand-200 p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-brand-600" /> Upload Document (.pdf / .txt)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Parses question blocks, options A-D, and correct answers automatically.
            </p>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Bank Title</label>
                <input
                  type="text"
                  placeholder="e.g., Operating Systems Quiz 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-brand-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-600 focus:bg-white"
                />
              </div>

              {/* Drag & Drop Box */}
              <div className="relative border-2 border-dashed border-brand-300 hover:border-brand-600 bg-brand-50/30 rounded-2xl p-6 text-center transition-colors cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileText className="w-8 h-8 text-brand-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {file ? file.name : 'Click or drag .pdf or .txt file here'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Supports standard text or question blocks</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'Processing Document...' : 'Parse & Extract Questions'}
              </button>
            </form>
          </div>

          {/* Question Banks List */}
          <div className="bg-white rounded-3xl border border-brand-100 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">Stored Question Banks</h3>
            {banks.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBank(b)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedBank?.id === b.id
                    ? 'border-brand-600 bg-brand-50/80 ring-2 ring-brand-600/20'
                    : 'border-slate-100 hover:border-brand-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{b.title}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                    {b.questions?.length || 0} Questions
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{b.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Question Preview & Inspector */}
        <div className="lg:col-span-2 space-y-6">
          {selectedBank ? (
            <div className="bg-white rounded-3xl border border-brand-100 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{selectedBank.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedBank.description}</p>
                </div>
                <span className="px-3 py-1 bg-brand-100 text-brand-800 rounded-full text-xs font-extrabold">
                  {selectedBank.questions?.length || 0} Questions
                </span>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {selectedBank.questions && selectedBank.questions.length > 0 ? (
                  selectedBank.questions.map((q, idx) => (
                    <div key={q.id || idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors relative group">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {idx + 1}. {q.question}
                        </h4>
                        <button
                          onClick={() => handleDeleteQuestion(selectedBank.id, q.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        {q.options?.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const isCorrect = q.correctAnswer === letter || opt.startsWith(letter);
                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl border text-xs font-medium ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-8">No questions in this bank yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-brand-200 border-dashed p-12 text-center">
              <BookOpen className="w-12 h-12 text-brand-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700 text-sm">Select or Upload a Question Bank</p>
              <p className="text-xs text-slate-400 mt-1">Questions will be displayed here for instant preview and editing.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
