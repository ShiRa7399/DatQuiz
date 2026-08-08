import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import api from '../utils/api';
import { 
  Zap, Clock, ShieldAlert, CheckCircle2, ArrowRight, 
  ArrowLeft, Send, AlertTriangle, Lock
} from 'lucide-react';

export default function TakeQuiz() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(1800); // Default 30 mins
  
  // Anti-Cheat trackers
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenViolations, setFullscreenViolations] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningText, setWarningText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  const submissionLock = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('active_student');
    if (!raw) {
      navigate('/join');
      return;
    }
    const data = JSON.parse(raw);
    setStudentData(data);

    const quizDuration = (data.quiz?.durationMinutes || 30) * 60;
    setTimeLeft(quizDuration);
  }, [navigate]);

  // Anti-Cheat Event Listeners
  useEffect(() => {
    // Tab visibility change detector
    const handleVisibilityChange = () => {
      if (document.hidden && !submissionLock.current) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          setWarningText(`WARNING: Tab switch detected! (Violation #${next}). This incident is logged.`);
          setShowWarningModal(true);
          return next;
        });
      }
    };

    // Fullscreen change detector
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submissionLock.current) {
        setFullscreenViolations((prev) => {
          const next = prev + 1;
          setWarningText(`WARNING: You exited Fullscreen mode! Please re-enable fullscreen.`);
          setShowWarningModal(true);
          return next;
        });
      }
    };

    // Disable right click context menu & copy keybindings
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || // Ctrl+Shift+I/J
        (e.ctrlKey && (e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 85)) // Ctrl+C/V/U
      ) {
        e.preventDefault();
        setWarningText('WARNING: Inspect elements and copy-paste shortcuts are disabled.');
        setShowWarningModal(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    if (timeLeft <= 0 && !submissionLock.current && studentData) {
      handleFinalSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, studentData]);

  const handleOptionSelect = (qId, optionLetter) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: optionLetter
    }));
  };

  const handleFinalSubmit = async () => {
    if (submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);

    try {
      const payload = {
        quizCode: code,
        regNo: studentData.regNo,
        studentName: studentData.name,
        answers: userAnswers,
        tabSwitchCount,
        fullscreenViolations
      };

      const res = await api.post('/submission/submit', payload);
      setSubmittedResult(res.data.submission);

      // Trigger Confetti Celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Submission error:', err);
      // Fallback display if submission already exists
      setSubmittedResult({
        score: 0,
        totalPossible: studentData.quiz.questions.length * (studentData.quiz.marksPerQuestion || 1),
        status: 'Submitted'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!studentData) return null;

  const { quiz, name, regNo } = studentData;
  const questions = quiz.questions || [];
  const currentQ = questions[currentIdx];

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Completion / Submitted View
  if (submittedResult) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-brand-200 p-8 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Assessment Submitted!</h1>
            <p className="text-xs text-slate-500 mt-1">Thank you, {name} ({regNo}). Your response has been recorded.</p>
          </div>

          <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase">Your Score</p>
            <p className="text-3xl font-extrabold text-brand-800">
              {submittedResult.score} / {submittedResult.totalPossible}
            </p>
            <p className="text-[11px] text-brand-700 font-medium">
              {((submittedResult.score / (submittedResult.totalPossible || 1)) * 100).toFixed(1)}% Marks Obtained
            </p>
          </div>

          {tabSwitchCount > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
              ⚠️ {tabSwitchCount} Tab Switches recorded and flagged for faculty review.
            </div>
          )}

          <button
            onClick={() => {
              sessionStorage.clear();
              navigate('/join');
            }}
            className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
          >
            Exit Exam Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col select-none">
      
      {/* Top Proctored Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight">{quiz.title}</h1>
            <p className="text-[11px] text-slate-400">{name} ({regNo})</p>
          </div>
        </div>

        {/* Live Anti-Cheat & Timer Badge */}
        <div className="flex items-center gap-4">
          {tabSwitchCount > 0 && (
            <span className="hidden sm:flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" /> Switches: {tabSwitchCount}
            </span>
          )}

          <div className="flex items-center gap-2 px-4 py-1.5 bg-brand-600 text-white rounded-xl font-mono font-extrabold text-base shadow-inner">
            <Clock className="w-4 h-4 animate-pulse" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Main Quiz Body */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Question Player (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-brand-200 p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="px-3 py-1 bg-brand-100 text-brand-800 text-xs font-extrabold rounded-full">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {currentQ?.marks || quiz.marksPerQuestion || 1} Marks
              </span>
            </div>

            {/* Question Text */}
            <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
              {currentQ?.question}
            </h2>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {currentQ?.options?.map((opt, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const isSelected = userAnswers[currentQ.id] === letter;

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleOptionSelect(currentQ.id, letter)}
                    className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/30'
                        : 'bg-brand-50/40 text-slate-800 border-slate-200 hover:border-brand-400 hover:bg-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center font-extrabold ${
                        isSelected ? 'bg-white text-brand-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {letter}
                      </span>
                      {opt.replace(/^[A-D][\.\:\)]\s*/, '')}
                    </span>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </button>
                );
              })}
            </div>

            {/* Prev / Next Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  Next Question <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting...' : 'Finish & Submit Exam'}
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Question Palette (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-brand-200 p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
              Question Palette
            </h3>

            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!userAnswers[q.id];
                const isCurrent = currentIdx === idx;

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-10 rounded-xl font-bold text-xs transition-all ${
                      isCurrent
                        ? 'bg-slate-900 text-white ring-2 ring-brand-600'
                        : isAnswered
                        ? 'bg-brand-600 text-white'
                        : 'bg-brand-50 text-slate-600 hover:bg-brand-100 border border-brand-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-brand-600"></div> Answered
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-brand-50 border border-brand-200"></div> Unanswered
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-900"></div> Current
              </div>
            </div>

            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Submit Quiz Now
            </button>
          </div>
        </div>

      </div>

      {/* Warning Anti-Cheat Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border-2 border-red-500">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-slate-900">Proctoring Warning Flag</h3>
            <p className="text-xs text-red-700 font-medium leading-relaxed">{warningText}</p>
            <button
              onClick={() => {
                setShowWarningModal(false);
                // Re-request fullscreen
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              I Understand - Resume Exam
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
