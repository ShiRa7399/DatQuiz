import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import { 
  Zap, UploadCloud, Mail, QrCode, FileSpreadsheet, Users, 
  CheckCircle2, AlertCircle, Copy, ExternalLink, RefreshCw, Send, Eye
} from 'lucide-react';

export default function QuizDetail() {
  const { code } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [activeTab, setActiveTab] = useState('code');
  const [rosterFile, setRosterFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    durationMinutes: '',
    marksPerQuestion: '',
    startTime: '',
    endTime: ''
  });

  useEffect(() => {
    fetchQuiz();
  }, [code]);

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/quiz/${code}`);
      const q = res.data.quiz;
      setQuiz(q);
      setSettingsForm({
        durationMinutes: q.durationMinutes || '',
        marksPerQuestion: q.marksPerQuestion || '',
        startTime: q.startTime ? q.startTime.substring(0, 16) : '',
        endTime: q.endTime ? q.endTime.substring(0, 16) : ''
      });
    } catch (err) {
      console.error('Fetch quiz detail error:', err);
      setStatusMsg({ type: 'error', text: 'Failed to load quiz details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setUpdatingSettings(true);
    try {
      const payload = {
        durationMinutes: settingsForm.durationMinutes,
        marksPerQuestion: settingsForm.marksPerQuestion,
        startTime: settingsForm.startTime ? new Date(settingsForm.startTime).toISOString() : null,
        endTime: settingsForm.endTime ? new Date(settingsForm.endTime).toISOString() : null,
      };
      const res = await api.put(`/quiz/${code}`, payload);
      setStatusMsg({ type: 'success', text: 'Settings updated successfully!' });
      fetchQuiz();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update settings.' });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleRosterUpload = async (e) => {
    e.preventDefault();
    if (!rosterFile) {
      setStatusMsg({ type: 'error', text: 'Please select an Excel (.xlsx) file.' });
      return;
    }

    setStatusMsg({ type: 'info', text: 'Parsing Excel roster columns (Reg No, Name, Email)...' });

    const formData = new FormData();
    formData.append('file', rosterFile);

    try {
      const res = await api.post(`/quiz/${code}/roster`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatusMsg({ type: 'success', text: res.data.message });
      setRosterFile(null);
      fetchQuiz();
    } catch (err) {
      console.error('Roster upload error:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Failed to upload roster.' });
    }
  };

  const handleSendInvites = async () => {
    setDispatching(true);
    setStatusMsg({ type: 'info', text: 'Looping through roster and dispatching bulk Nodemailer magic link emails...' });

    try {
      const res = await api.post('/quiz/send-invites', {
        quizCode: quiz.quizCode,
        facultyEmail: 'faculty@quizgenius.edu',
        frontendUrl: window.location.origin
      });

      setStatusMsg({
        type: 'success',
        text: `Bulk Email Dispatch Complete! Sent ${res.data.results.sent} individual magic link emails + 1 Faculty Receipt summary.`
      });
    } catch (err) {
      console.error('Dispatch error:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Failed to send bulk invites.' });
    } finally {
      setDispatching(false);
    }
  };

  const baseJoinUrl = `${window.location.origin}/#/join?code=${quiz?.quizCode}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(baseJoinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading assessment workspace...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-brand-200 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h2 className="font-bold text-lg text-slate-800">Quiz Code Not Found</h2>
        <Link to="/dashboard" className="text-xs font-bold text-brand-700 hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Dynamic Tabs Navigation */}
      <div className="flex items-center gap-6 border-b-2 border-slate-200">
        <button 
          onClick={() => setActiveTab('code')}
          className={`pb-3 text-lg font-extrabold transition-all border-b-4 ${activeTab === 'code' ? 'border-[#e65c00] text-[#e65c00]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Quiz Code
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-lg font-extrabold transition-all border-b-4 ${activeTab === 'settings' ? 'border-[#e65c00] text-[#e65c00]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Settings
        </button>
        <Link 
          to={`/quiz/${quiz.quizCode}/results`}
          className="pb-3 text-lg font-extrabold transition-all border-b-4 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2"
        >
          Results <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl font-medium text-sm border flex items-center gap-2 ${
          statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
          'bg-brand-50 text-brand-800 border-brand-200'
        }`}>
          {statusMsg.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {statusMsg.text}
        </div>
      )}

      {/* TOP HEADER SUMMARY */}
      <div className="bg-white rounded-3xl border border-brand-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{quiz.title}</h1>
          <p className="text-xs text-slate-500 mt-1">{quiz.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-full bg-brand-100 text-brand-800 text-sm font-bold shadow-sm">
            {quiz.durationMinutes} Minutes
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-bold shadow-sm">
            {quiz.questions?.length || 0} Questions
          </span>
        </div>
      </div>

      {/* QUIZ CODE VIEW */}
      {activeTab === 'code' && (
        <div className="bg-white rounded-3xl border border-brand-200 p-12 shadow-sm text-center flex flex-col items-center justify-center min-h-[500px]">
          <h2 className="text-3xl font-black text-slate-900 mb-2">Student Scan & Join</h2>
          <p className="text-sm font-medium text-slate-500 mb-10 max-w-md mx-auto">
            Students can scan this QR code to join instantly, or they can navigate to your portal and enter the code below.
          </p>
          
          <div className="p-6 bg-brand-50 rounded-[32px] inline-block border-4 border-brand-100 mb-8 shadow-xl hover:scale-105 transition-transform">
            <QRCodeSVG value={baseJoinUrl} size={300} level="H" className="mx-auto" />
          </div>
          
          <div className="text-6xl font-black font-mono text-[#e65c00] tracking-[0.2em] mb-8">
            {quiz.quizCode}
          </div>
          
          <button
            onClick={copyShareLink}
            className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-lg transition-colors flex items-center gap-3"
          >
            <Copy className="w-5 h-5" /> {copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Link'}
          </button>
        </div>
      )}

      {/* SETTINGS VIEW */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Settings Left Column: Roster & Nodemailer Email Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-brand-200 p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-brand-600" /> Excel Roster Uploader (.xlsx)
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Upload class roster. Express backend auto-detects columns: <strong>Registration no, name, email</strong>.
              </p>

              <form onSubmit={handleRosterUpload} className="space-y-4">
                <div className="relative border-2 border-dashed border-brand-300 hover:border-brand-600 bg-brand-50/40 rounded-2xl p-6 text-center transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setRosterFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="w-8 h-8 text-brand-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    {rosterFile ? rosterFile.name : 'Click or Drag & Drop Excel Roster here'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Requires 3 headers: Reg No, Name, Email</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" /> Upload & Parse Roster
                </button>
              </form>
            </div>

            {/* Bulk Email Trigger Box */}
            <div className="bg-gradient-to-br from-brand-900 to-brand-800 text-white rounded-3xl p-6 shadow-lg shadow-brand-900/20 space-y-4">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand-300" /> Bulk Nodemailer Invitations
              </h3>
              <p className="text-xs text-brand-100/90 leading-relaxed">
                Loops through uploaded student emails and sends individual HTML magic links (`/#/join?code=...`) + receipt email to faculty.
              </p>

              <button
                onClick={handleSendInvites}
                disabled={dispatching || !quiz.roster || quiz.roster.length === 0}
                className="w-full py-3 bg-white text-brand-900 hover:bg-brand-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-brand-700" />
                {dispatching ? 'Sending Bulk Emails...' : `Dispatch Invites to ${quiz.roster?.length || 0} Students`}
              </button>
            </div>
            
            <div className="bg-white rounded-3xl border border-brand-100 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-600" /> Uploaded Student Roster
                </h2>
                <span className="px-3 py-1 bg-brand-100 text-brand-800 text-xs font-bold rounded-full">
                  {quiz.roster?.length || 0} Registered
                </span>
              </div>
              {quiz.roster && quiz.roster.length > 0 ? (
                <p className="text-sm font-bold text-green-700">Roster uploaded and ready.</p>
              ) : (
                <p className="text-sm font-bold text-red-500">No Roster Uploaded Yet</p>
              )}
            </div>
          </div>

          {/* Settings Right Column: Quiz Configurations */}
          <div className="bg-white rounded-3xl border border-brand-200 p-8 shadow-sm flex flex-col">
            <h2 className="text-xl font-extrabold text-slate-900 mb-6">Quiz Configurations</h2>
            
            <form onSubmit={handleUpdateSettings} className="space-y-6 flex-1 flex flex-col">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Duration (Minutes)</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={settingsForm.durationMinutes} 
                  onChange={(e) => setSettingsForm({...settingsForm, durationMinutes: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-sm font-bold focus:outline-none focus:border-[#e65c00]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Marks per Question</label>
                <input 
                  type="number" 
                  step="any" 
                  min="0" 
                  required 
                  value={settingsForm.marksPerQuestion} 
                  onChange={(e) => setSettingsForm({...settingsForm, marksPerQuestion: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-sm font-bold focus:outline-none focus:border-[#e65c00]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Start Time (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={settingsForm.startTime} 
                  onChange={(e) => setSettingsForm({...settingsForm, startTime: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-sm font-medium focus:outline-none focus:border-[#e65c00]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">End Time (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={settingsForm.endTime} 
                  onChange={(e) => setSettingsForm({...settingsForm, endTime: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-sm font-medium focus:outline-none focus:border-[#e65c00]" 
                />
              </div>

              <div className="pt-6 mt-auto">
                <button
                  type="submit"
                  disabled={updatingSettings}
                  className="w-full py-4 bg-[#e65c00] hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {updatingSettings ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
