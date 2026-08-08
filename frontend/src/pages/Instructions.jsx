import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, ShieldAlert, Clock, CheckCircle2, ArrowRight, Maximize } from 'lucide-react';

export default function Instructions() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('active_student');
    if (!raw) {
      navigate('/join');
      return;
    }
    setStudent(JSON.parse(raw));
  }, [navigate]);

  if (!student) return null;

  const { quiz, name, regNo, quizCode } = student;

  const handleStartExam = () => {
    // Request fullscreen mode for anti-cheat
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request bypassed:', err);
      });
    }
    navigate(`/take-quiz/${quizCode}`);
  };

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-brand-200 p-8 shadow-xl shadow-brand-500/10 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="px-3 py-1 bg-brand-100 text-brand-800 text-xs font-mono font-extrabold rounded-full">
              QUIZ CODE: {quizCode}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">{quiz.title}</h1>
            <p className="text-xs text-slate-500 mt-1">Assessment Candidate: <strong>{name}</strong> ({regNo})</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase">Duration</p>
            <p className="text-xl font-extrabold text-brand-700">{quiz.durationMinutes || 30} Mins</p>
          </div>
        </div>

        {/* Quiz Metadata */}
        <div className="grid grid-cols-3 gap-3 bg-brand-50/50 p-4 rounded-2xl border border-brand-100 text-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Questions</p>
            <p className="text-lg font-extrabold text-slate-800">{quiz.questions?.length || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Marks Per Qn</p>
            <p className="text-lg font-extrabold text-slate-800">{quiz.marksPerQuestion || 1}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Possible</p>
            <p className="text-lg font-extrabold text-brand-800">
              {(quiz.questions?.length || 0) * (quiz.marksPerQuestion || 1)} Marks
            </p>
          </div>
        </div>

        {/* Anti-Cheat Rules Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <h3 className="font-extrabold text-sm text-amber-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" /> Anti-Cheat & Exam Rules
          </h3>
          <ul className="text-xs text-amber-900/80 space-y-2 list-disc list-inside font-medium leading-relaxed">
            <li><strong>Full Screen Enforced:</strong> The exam will enter full screen mode upon starting. Exiting full screen records a penalty flag.</li>
            <li><strong>Tab Switching Monitored:</strong> Navigating away from this tab or window will trigger active cheat counters visible to faculty.</li>
            <li><strong>No Copy-Pasting:</strong> Context menu, text selection, and keyboard shortcuts (Ctrl+C, Ctrl+V, F12) are disabled.</li>
            <li><strong>Auto-Submit Timer:</strong> When the countdown timer reaches 00:00, your exam will auto-submit instantly.</li>
          </ul>
        </div>

        {/* Start Action Button */}
        <div className="pt-2">
          <button
            onClick={handleStartExam}
            className="w-full py-4 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 hover:from-brand-900 hover:to-brand-700 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-brand-700/25 transition-all flex items-center justify-center gap-3 group"
          >
            <Maximize className="w-5 h-5" />
            Enter Fullscreen & Begin Assessment Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
}
