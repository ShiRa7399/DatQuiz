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
  const [rosterFile, setRosterFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [code]);

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/quiz/${code}`);
      setQuiz(res.data.quiz);
    } catch (err) {
      console.error('Fetch quiz detail error:', err);
      setStatusMsg({ type: 'error', text: 'Failed to load quiz details.' });
    } finally {
      setLoading(false);
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
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-brand-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="px-3 py-1 rounded-xl bg-brand-700 text-white text-xs font-mono font-extrabold tracking-wider">
              CODE: {quiz.quizCode}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">
              {quiz.durationMinutes} Minutes
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              {quiz.questions?.length || 0} Questions
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{quiz.title}</h1>
          <p className="text-xs text-slate-500 mt-1">{quiz.description}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowQRModal(true)}
            className="px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold text-xs rounded-xl border border-brand-200 transition-colors flex items-center gap-2"
          >
            <QrCode className="w-4 h-4 text-brand-600" /> QR Code
          </button>
          
          <button
            onClick={copyShareLink}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> {copiedLink ? 'Copied Link!' : 'Copy Direct Link'}
          </button>

          <Link
            to={`/quiz/${quiz.quizCode}/results`}
            className="px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> View Submissions & Anti-Cheat
          </Link>
        </div>
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

      {/* Roster & Nodemailer Email Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Drag and Drop Excel Uploader */}
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
              Loops through uploaded student emails and sends individual HTML magic links (`/#/join?code=...&reg=...&name=...`) + receipt email to faculty.
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
        </div>

        {/* Right Column: Student Roster Table */}
        <div className="lg:col-span-2">
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
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-50/60 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-brand-100">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Registration No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Magic Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {quiz.roster.map((s, idx) => {
                      const link = `${window.location.origin}/#/join?code=${encodeURIComponent(quiz.quizCode)}&reg=${encodeURIComponent(s.regNo)}&name=${encodeURIComponent(s.name)}`;
                      return (
                        <tr key={idx} className="hover:bg-brand-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-brand-900">{s.regNo}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                          <td className="py-3 px-4 text-slate-500">{s.email}</td>
                          <td className="py-3 px-4">
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-brand-700 font-bold hover:underline"
                            >
                              Auto-Bypass &rarr;
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border border-brand-200 border-dashed rounded-2xl">
                <FileSpreadsheet className="w-10 h-10 text-brand-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No Roster Uploaded Yet</p>
                <p className="text-[11px] text-slate-400 mt-1">Upload an Excel file (.xlsx) to populate student emails for magic link dispatch.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 mx-auto flex items-center justify-center font-bold">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Student Scan & Join QR Code</h3>
              <p className="text-xs text-slate-500 mt-0.5">Scan to open the Student Join Portal instantly</p>
            </div>

            <div className="p-4 bg-brand-50 rounded-2xl inline-block border border-brand-200">
              <QRCodeSVG value={baseJoinUrl} size={180} level="H" />
            </div>

            <div className="bg-slate-100 p-2.5 rounded-xl font-mono text-xs text-slate-700 font-bold">
              CODE: {quiz.quizCode}
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
            >
              Close QR Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
