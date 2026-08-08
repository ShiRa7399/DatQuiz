import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import api from '../utils/api';
import ListTileCard from '../components/ListTileCard';
import QuizManagementModal from '../components/QuizManagementModal';
import QuestionBankViewModal from '../components/QuestionBankViewModal';
import { 
  LogOut, Plus, FileText, RefreshCw, Layers, BookOpen, UploadCloud, Loader2 
} from 'lucide-react';

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [quizzes, setQuizzes] = useState([]);
  const [questionBanks, setQuestionBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [location.key]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [quizRes, qbRes] = await Promise.all([
        api.get('/quiz'),
        api.get('/question-bank/list')
      ]);
      const sortedQuizzes = (quizRes.data.quizzes || []).sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      setQuizzes(sortedQuizzes);
      setQuestionBanks(qbRes.data.banks || qbRes.data.questionBanks || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Direct PDF/TXT Upload for "Add Bank"
  const handleAddBankClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ""));

    try {
      await api.post('/question-bank/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchDashboardData();
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to parse document: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteQuiz = async (code, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete quiz code ${code}?`)) return;
    try {
      await api.delete(`/quiz/${code}`);
      fetchDashboardData();
    } catch (err) {
      console.error('Delete quiz error:', err);
    }
  };

  const handleDeleteQb = async (bankId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this question bank?')) return;
    try {
      await api.delete(`/question-bank/${bankId}`);
      fetchDashboardData();
    } catch (err) {
      console.error('Delete bank error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6ebd8] flex flex-col select-none font-sans">
      
      {/* Hidden File Input for PDF/TXT Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt"
        className="hidden"
      />

      {/* Top App Bar */}
      <header className="h-14 bg-[#e65c00] text-white px-6 flex items-center justify-between shadow-none shrink-0">
        <h1 className="text-xl font-bold text-white tracking-tight">Faculty Dashboard</h1>

        <button
          onClick={handleLogout}
          title="Logout"
          className="p-1.5 hover:bg-orange-800/60 rounded-lg text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Body Grid */}
      <main className="p-6 bg-[#f6ebd8] flex-1 flex flex-col">
        
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-[#e65c00] animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Loading Faculty Dashboard...</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
            
            {/* Left Panel: Active & Past Quizzes (approx 60% width) */}
            <div className="lg:w-[60%] flex-[3] bg-white rounded-2xl p-6 shadow-sm border border-orange-200/50 flex flex-col">
              
              <div className="border-b border-gray-100 pb-3 mb-5 shrink-0">
                <h2 className="text-xl font-bold text-[#e65c00]">Active & Past Quizzes</h2>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-1">
                {quizzes.length > 0 ? (
                  quizzes.map((quiz) => (
                    <ListTileCard
                      key={quiz.id}
                      type="quiz"
                      title={quiz.title}
                      code={quiz.quizCode}
                      onManage={() => setSelectedQuiz(quiz)}
                      onDelete={(e) => handleDeleteQuiz(quiz.quizCode, e)}
                    />
                  ))
                ) : (
                  <div className="text-center py-16 border-2 border-dashed border-orange-200/70 rounded-2xl">
                    <Layers className="w-10 h-10 text-orange-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No Quizzes Created Yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click '+ Create Quiz' on the bottom right to start.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Right Panel: My Question Banks (approx 40% width) */}
            <div className="lg:w-[40%] flex-[2] bg-white rounded-2xl p-6 shadow-sm border border-orange-200/50 flex flex-col">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5 shrink-0">
                <h2 className="text-xl font-bold text-[#e65c00]">My Question Banks</h2>
                
                <button
                  onClick={handleAddBankClick}
                  disabled={uploading}
                  className="text-xs font-bold text-slate-700 hover:text-[#e65c00] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 text-[#e65c00] animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 text-[#e65c00]" /> Add Bank
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-1">
                {questionBanks.length > 0 ? (
                  questionBanks.map((qb) => (
                    <div
                      key={qb.id}
                      onClick={() => setSelectedBank(qb)}
                      className="cursor-pointer"
                    >
                      <ListTileCard
                        type="bank"
                        title={qb.name || qb.title}
                        subtitle={`${qb.questions?.length || 0} Questions`}
                        onDelete={(e) => handleDeleteQb(qb.id, e)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                    <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No Question Banks</p>
                    <p className="text-xs text-gray-400 mt-1">Click 'Add Bank' above to upload PDF/TXT documents.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Floating Action Button (+ Create Quiz) */}
      <button
        onClick={() => navigate('/create-quiz')}
        className="fixed bottom-6 right-8 z-40 bg-[#e65c00] hover:bg-[#c85000] text-white px-5 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105"
      >
        <Plus className="w-5 h-5 stroke-[3]" />
        Create Quiz
      </button>

      {/* Quiz Management Dialog (Modal) */}
      {selectedQuiz && (
        <QuizManagementModal
          quiz={selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
          onRefresh={fetchDashboardData}
        />
      )}

      {/* Question Bank View & Delete Popup Modal */}
      {selectedBank && (
        <QuestionBankViewModal
          bank={selectedBank}
          onClose={() => setSelectedBank(null)}
          onRefresh={fetchDashboardData}
        />
      )}

    </div>
  );
}
