import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeStorage } from '../utils/safeStorage';
import { ShieldAlert, ArrowRight, Maximize } from 'lucide-react';

export default function Instructions() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const raw = safeStorage.getItem('active_student');
    if (!raw) {
      navigate('/join');
      return;
    }
    try {
      setStudent(JSON.parse(raw));
    } catch (e) {
      navigate('/join');
    }
  }, [navigate]);

  if (!student) return null;

  const { quiz, name, regNo, quizCode } = student;

  const handleStartExam = () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } catch (err) {
      // Fullscreen not supported on iOS Mobile Safari - safely proceed
    }
    navigate(`/take-quiz/${quizCode}`);
  };


  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-brand-200 p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="px-3 py-1 bg-brand-100 text-brand-800 text-xs font-mono font-extrabold rounded-full">
              QUIZ CODE: {quizCode}
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">{quiz.title}</h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">Student: <strong>{name}</strong> ({regNo})</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase">Duration</p>
            <p className="text-xl font-extrabold text-brand-700">{quiz.durationMinutes || 30} Mins</p>
          </div>
        </div>

        {/* Tab Switching Notice */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-900">
          <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
          <p className="text-xs font-extrabold leading-snug">
            ⚠️ Tab switching is strictly NOT allowed during the exam. Any attempt to switch tabs or minimize the window will log violation alerts for faculty review.
          </p>
        </div>

        {/* Question Status Palette Legend */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            Question Palette Status Legend
          </h3>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl">
              <span className="w-5 h-5 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <span className="text-xs font-extrabold text-slate-900 block">Blue</span>
                <span className="text-[10px] text-slate-500 block font-medium">Answered</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl">
              <span className="w-5 h-5 rounded-lg bg-white border border-slate-300 text-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <span className="text-xs font-extrabold text-slate-900 block">White</span>
                <span className="text-[10px] text-slate-500 block font-medium">Not Visited</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl">
              <span className="w-5 h-5 rounded-lg bg-red-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <span className="text-xs font-extrabold text-slate-900 block">Red</span>
                <span className="text-[10px] text-slate-500 block font-medium">Skipped</span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-2">
          <button
            onClick={handleStartExam}
            className="w-full py-4 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 hover:from-brand-900 hover:to-brand-700 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-brand-700/20 transition-all flex items-center justify-center gap-3 group"
          >
            <Maximize className="w-5 h-5" />
            Start Exam Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
}
