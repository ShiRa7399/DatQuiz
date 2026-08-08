import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, GraduationCap, User, Play, PlusCircle } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f6ebd8] flex flex-col justify-between p-4 sm:p-6">
      
      {/* Top Header Pill Action */}
      <div className="w-full flex justify-end">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#e65c00] text-[#e65c00] bg-white/70 hover:bg-white text-sm font-semibold transition-all shadow-sm"
        >
          <LogIn className="w-4 h-4" /> Faculty Login
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl w-full mx-auto my-auto text-center space-y-8 py-8">
        
        {/* Center Logo & Branding */}
        <div className="space-y-3">
          <div className="inline-block relative">
            {/* Stacked square icon matching datquiz logo */}
            <div className="w-20 h-20 bg-[#e65c00] rounded-2xl flex items-center justify-center text-white text-4xl font-extrabold shadow-lg shadow-orange-700/30 transform -rotate-3 hover:rotate-0 transition-transform">
              ?
            </div>
            <div className="w-20 h-20 bg-[#e65c00]/20 rounded-2xl absolute -bottom-2 -left-2 -z-10"></div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#e65c00] tracking-tight">
            Dat Quiz
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium">
            Da Quiz platform you wish you knew sooner!
          </p>
        </div>

        {/* Dual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-4">
          
          {/* Student Card */}
          <div className="bg-white rounded-[24px] border border-orange-200/80 p-8 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-100/80 flex items-center justify-center text-[#e65c00]">
              <GraduationCap className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Student</h2>
              <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                Enter a code to join your classroom's live quiz.
              </p>
            </div>

            <Link
              to="/join"
              className="w-full py-3.5 px-6 bg-[#e65c00] hover:bg-[#d85000] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
            >
              <Play className="w-4 h-4 fill-current group-hover:translate-x-0.5 transition-transform" />
              Join Quiz
            </Link>
          </div>

          {/* Faculty Card */}
          <div className="bg-white rounded-[24px] border border-orange-200/80 p-8 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-100/80 flex items-center justify-center text-[#e65c00]">
              <User className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Faculty</h2>
              <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                Create and manage quizzes for your students.
              </p>
            </div>

            <Link
              to="/dashboard"
              className="w-full py-3.5 px-6 bg-white hover:bg-orange-50/80 text-[#e65c00] border-2 border-[#e65c00] font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              Create a Quiz
            </Link>
          </div>

        </div>

      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4">
        Dat Quiz LMS Platform &bull; Production Ready Assessment Engine
      </footer>

    </div>
  );
}
