import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import api from '../utils/api';
import { safeStorage } from '../utils/safeStorage';
import { 
  Zap, Clock, ShieldAlert, CheckCircle2, XCircle, ArrowRight, 
  ArrowLeft, Send, AlertTriangle, Lock, HelpCircle
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

  // Practice mode state
  const [revealedQuestions, setRevealedQuestions] = useState({});

  useEffect(() => {

    const raw = safeStorage.getItem('active_student');
    if (!raw) {
      navigate('/join');
      return;
    }
    try {
      const data = JSON.parse(raw);
      setStudentData(data);

      const quizDuration = (data.quiz?.durationMinutes || 30) * 60;
      setTimeLeft(quizDuration);
    } catch (e) {
      navigate('/join');
    }
  }, [navigate]);

  // Anti-Cheat Event Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submissionLock.current) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          const maxAllowed = studentData?.quiz?.maxTabSwitches !== undefined 
            ? parseInt(studentData.quiz.maxTabSwitches, 10) 
            : 3;

          if (next > maxAllowed) {
            setWarningText(`CRITICAL ALERT: You exceeded the allowed ${maxAllowed} tab switches! Your exam is being automatically submitted now.`);
            setShowWarningModal(true);
            setTimeout(() => {
              handleFinalSubmit();
            }, 1200);
          } else {
            setWarningText(`WARNING: Tab switch detected! (Violation #${next} of ${maxAllowed} allowed). Further switches will trigger automatic exam submission.`);
            setShowWarningModal(true);
          }
          return next;
        });
      }
    };

    const handleFullscreenChange = () => {
      const isFullscreenSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);

      if (isFullscreenSupported && !isFullscreen && !submissionLock.current) {
        setFullscreenViolations((prev) => {
          const next = prev + 1;
          setWarningText(`WARNING: You exited Fullscreen mode! Please re-enable fullscreen.`);
          setShowWarningModal(true);
          return next;
        });
      }
    };

    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
        (e.ctrlKey && (e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 85))
      ) {
        e.preventDefault();
        setWarningText('WARNING: Inspect elements and copy-paste shortcuts are disabled.');
        setShowWarningModal(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [studentData]);


  // Timer Countdown
  useEffect(() => {
    if (!studentData || timeLeft <= 0) {
      if (timeLeft === 0 && !submissionLock.current) {
        handleFinalSubmit();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, studentData]);

  const handleOptionSelect = (qId, optionLetter) => {
    // If practice mode and already revealed, prevent changing option
    if (studentData?.quiz?.isPracticeMode && revealedQuestions[qId]) return;

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

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore confetti errors if canvas unavailable
      }
    } catch (err) {
      console.error('Submission error:', err);
      if (err.response?.data?.alreadySubmitted) {
        setSubmittedResult(err.response.data.submission);
      } else {
        alert(err.response?.data?.error || 'Failed to submit exam.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!studentData) return null;

  const { quiz, name, regNo } = studentData;
  const questions = quiz.questions || [];
  const currentQ = questions[currentIdx];
  const isPracticeMode = !!quiz.isPracticeMode;
  const isRevealed = isPracticeMode && !!revealedQuestions[currentQ?.id];
  const selectedOpt = userAnswers[currentQ?.id];
  const isCorrectAnswer = selectedOpt === currentQ?.correctAnswer;
  const showMarksOnSubmitted = isPracticeMode || !!quiz.showMarksToStudents;

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

          {showMarksOnSubmitted ? (
            <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase">Your Score</p>
              <p className="text-3xl font-extrabold text-brand-800">
                {submittedResult.score} / {submittedResult.totalPossible}
              </p>
              <p className="text-[11px] text-brand-700 font-medium">
                {((submittedResult.score / (submittedResult.totalPossible || 1)) * 100).toFixed(1)}% Marks Obtained
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Assessment Submitted</p>
              <p className="text-sm font-bold text-slate-800">Your answers have been recorded for faculty review.</p>
              <p className="text-[11px] text-slate-400">Marks will be published by your faculty.</p>
            </div>
          )}

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
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm tracking-tight">{quiz.title}</h1>
              {isPracticeMode && (
                <span className="px-2 py-0.5 bg-orange-500/30 text-orange-300 border border-orange-400/40 rounded text-[10px] font-extrabold uppercase">
                  Practice Mode
                </span>
              )}
            </div>
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
                const isSelected = selectedOpt === letter;
                const isCorrect = letter === currentQ?.correctAnswer;
                const cleanOptText = opt.replace(/^[A-D][\.\:\)]\s*/i, '');

                let buttonClass = 'bg-brand-50/40 text-slate-800 border-slate-200 hover:border-brand-400 hover:bg-white';
                let letterClass = 'bg-slate-200 text-slate-700';

                if (isPracticeMode && isRevealed) {
                  if (isCorrect) {
                    buttonClass = 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-md';
                    letterClass = 'bg-white text-emerald-700 font-extrabold';
                  } else if (isSelected && !isCorrect) {
                    buttonClass = 'bg-red-500 text-white border-red-500 font-bold shadow-md';
                    letterClass = 'bg-white text-red-700 font-extrabold';
                  } else {
                    buttonClass = 'bg-slate-50 text-slate-400 border-slate-200 opacity-50';
                    letterClass = 'bg-slate-200 text-slate-400';
                  }
                } else if (isSelected) {
                  buttonClass = 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/30';
                  letterClass = 'bg-white text-brand-700 font-extrabold';
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleOptionSelect(currentQ.id, letter)}
                    disabled={isPracticeMode && isRevealed}
                    className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between ${buttonClass}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center font-extrabold ${letterClass}`}>
                        {letter}
                      </span>
                      <span>{cleanOptText}</span>
                    </span>

                    {isPracticeMode && isRevealed ? (
                      isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : isSelected ? (
                        <XCircle className="w-5 h-5 text-white" />
                      ) : null
                    ) : (
                      isSelected && <CheckCircle2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Practice Mode Immediate Feedback & Explanation Container */}
            {isPracticeMode && isRevealed && (
              <div className={`p-4 rounded-2xl border ${
                isCorrectAnswer 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-red-50 border-red-200 text-red-900'
              } space-y-2 animate-in fade-in duration-200`}>
                <div className="flex items-center gap-2 font-extrabold text-sm">
                  {isCorrectAnswer ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Correct Answer! (+{currentQ?.marks || quiz.marksPerQuestion || 1} Marks)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <span>Incorrect. Correct answer is Option {currentQ?.correctAnswer}</span>
                    </>
                  )}
                </div>

                {currentQ?.explanation && (
                  <p className="text-xs text-slate-700 font-medium italic border-t border-slate-200/60 pt-2 mt-1">
                    💡 <span className="font-bold">Explanation:</span> {currentQ.explanation}
                  </p>
                )}
              </div>
            )}

            {/* Prev / Next Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>

              {isPracticeMode ? (
                !isRevealed ? (
                  <button
                    onClick={() => {
                      if (!selectedOpt) return alert('Please select an option first.');
                      setRevealedQuestions((prev) => ({ ...prev, [currentQ.id]: true }));
                    }}
                    disabled={!selectedOpt}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    Check Answer <CheckCircle2 className="w-4 h-4" />
                  </button>
                ) : currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    Continue to Next Question <ArrowRight className="w-4 h-4" />
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
                )
              ) : currentIdx < questions.length - 1 ? (
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
                const isSkipped = !isAnswered && idx < currentIdx;

                let paletteColor = 'bg-white text-slate-700 border border-slate-300'; // White = Not Visited
                if (isAnswered) {
                  paletteColor = 'bg-blue-600 text-white border-blue-600 shadow-sm'; // Blue = Answered
                } else if (isSkipped) {
                  paletteColor = 'bg-red-500 text-white border-red-500 shadow-sm'; // Red = Skipped
                }

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-10 rounded-xl font-bold text-xs transition-all ${paletteColor} ${
                      isCurrent ? 'ring-2 ring-slate-900 font-extrabold scale-105' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-blue-600 shrink-0"></div>
                <span>Blue = Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-white border border-slate-300 shrink-0"></div>
                <span>White = Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-red-500 shrink-0"></div>
                <span>Red = Skipped</span>
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Anti-cheat Alert Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 border border-red-200 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Security Warning</h3>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">{warningText}</p>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              I Understand & Acknowledge
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
