import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { ArrowLeft, ShieldCheck, Mail, Lock, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error || 'Failed to login.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6ebd8] flex flex-col">
      
      {/* Dat Quiz Orange App Bar */}
      <header className="bg-[#e65c00] text-white h-14 px-4 flex items-center gap-4 shadow-sm">
        <Link to="/" className="p-1 hover:bg-orange-800 rounded-lg transition-colors" title="Back to Home">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-extrabold text-lg tracking-tight">Faculty Login</h1>
      </header>

      {/* Main Form Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-orange-100 shadow-xl p-8 space-y-6">
          
          {/* Shield Icon Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-100/80 text-[#e65c00] mx-auto flex items-center justify-center mb-3">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Faculty Login</h2>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e65c00] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e65c00] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="text-right">
              <button type="button" className="text-xs text-brand-700 font-bold hover:underline">
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-center text-xs font-medium text-brand-700 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold underline">
              Sign Up
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}
