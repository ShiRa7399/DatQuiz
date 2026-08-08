import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, PlusCircle, Award } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Question Banks', path: '/question-banks', icon: BookOpen },
    { label: 'Create New Quiz', path: '/create-quiz', icon: PlusCircle },
  ];

  return (
    <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-orange-200 hidden md:block min-h-[calc(100vh-3.5rem)] p-4">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-brand-800 mb-2">
          Dat Quiz Portal
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-700 text-white shadow-md shadow-brand-700/20'
                    : 'text-slate-600 hover:text-brand-700 hover:bg-orange-100/50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-orange-100/50 border border-orange-200 rounded-2xl">
        <div className="flex items-center gap-2 text-brand-800 font-bold text-xs mb-1">
          <Award className="w-4 h-4 text-brand-700" /> Dat Quiz Proctored LMS
        </div>
        <p className="text-[11px] text-brand-900/80 leading-relaxed">
          Matches datquiz.web.app layout with 5-letter quiz join codes, deep link auto-bypass, and automated grading.
        </p>
      </div>
    </aside>
  );
}
