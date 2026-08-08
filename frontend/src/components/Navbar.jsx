import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { LogOut, PlusCircle, ExternalLink } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-brand-700 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        {/* Dat Quiz Brand Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-white text-brand-700 flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
            ?
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            Dat Quiz <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand-800 text-orange-100 border border-brand-600">LMS</span>
          </span>
        </Link>

        {/* Quick Nav Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/join"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-800 hover:bg-brand-900 border border-brand-600 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Student Portal
          </Link>

          <Link
            to="/create-quiz"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-brand-700 bg-white hover:bg-orange-50 rounded-lg shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Create Quiz
          </Link>

          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-brand-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-800 text-white border border-brand-600 flex items-center justify-center font-bold text-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'F'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold leading-none">{user.name}</p>
                  <p className="text-[10px] text-orange-200 truncate max-w-[120px]">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 text-orange-200 hover:text-white hover:bg-brand-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
