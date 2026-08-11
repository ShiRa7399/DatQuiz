import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { ArrowLeft, ShieldCheck, Mail, Lock, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loginWithGoogle, loading } = useAuth();
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

  const handleGoogleSignIn = async () => {
    setError('');
    const res = await loginWithGoogle();
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error || 'Google Sign-In failed.');
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

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs text-slate-400 font-medium absolute uppercase tracking-wider">
              or
            </span>
          </div>

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

