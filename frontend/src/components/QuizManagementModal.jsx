import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import PrimaryButton from './PrimaryButton';
import TextField from './TextField';
import { 
  X, QrCode, Copy, UploadCloud, FileSpreadsheet, Mail, 
  Send, Trash2, ShieldAlert, CheckCircle2, RefreshCw, Eye, Download 
} from 'lucide-react';

export default function QuizManagementModal({ quiz: initialQuiz, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('Code'); // 'Code' | 'Settings' | 'Results'
  const [quiz, setQuiz] = useState(initialQuiz);
  const [submissions, setSubmissions] = useState([]);
  const [rosterFile, setRosterFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (quiz?.quizCode) {
      fetchSubmissions();
    }
  }, [quiz?.quizCode]);

  const fetchSubmissions = async () => {
    try {
      const res = await api.get(`/submission/${quiz.quizCode}`);
      setSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  };

  const handleRosterUpload = async (e) => {
    e.preventDefault();
    if (!rosterFile) return;

    setStatusMsg({ type: 'info', text: 'Parsing Excel roster...' });
    const formData = new FormData();
    formData.append('file', rosterFile);

    try {
      const res = await api.post(`/quiz/${quiz.quizCode}/roster`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatusMsg({ type: 'success', text: res.data.message });
      setRosterFile(null);
      const updated = await api.get(`/quiz/${quiz.quizCode}`);
      setQuiz(updated.data.quiz);
      if (onRefresh) onRefresh();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to upload roster.' });
    }
  };

  const handleSendInvites = async () => {
    setDispatching(true);
    setStatusMsg({ type: 'info', text: 'Dispatching Nodemailer emails...' });
    try {
      const res = await api.post('/quiz/send-invites', {
        quizCode: quiz.quizCode,
        facultyEmail: 'faculty@quizgenius.edu',
        frontendUrl: window.location.origin
      });
      setStatusMsg({ type: 'success', text: `Sent ${res.data.results.sent} individual magic link emails!` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to send bulk invites.' });
    } finally {
      setDispatching(false);
    }
  };

  const handleRevoke = async (regNo) => {
    if (!window.confirm(`Revoke attempt for student ${regNo}?`)) return;
    try {
      await api.delete(`/submission/${quiz.quizCode}/${encodeURIComponent(regNo)}`);
      fetchSubmissions();
    } catch (err) {
      console.error('Revoke error:', err);
    }
  };

  const joinLink = `${window.location.origin}/#/join?code=${quiz?.quizCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(joinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!quiz) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      {/* Modal Container: max-w-[900px], max-h-[700px], bg-gray-50, rounded-3xl */}
      <div className="max-w-[900px] w-full max-h-[700px] h-full bg-gray-50 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-white px-6 py-4 rounded-t-3xl flex justify-between items-center border-b border-gray-200 shrink-0">
          <h2 className="text-2xl font-bold text-orange-700 truncate">{quiz.title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white px-6 border-b border-gray-200 flex gap-8 shrink-0">
          {['Code', 'Settings', 'Results'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3.5 px-2 text-base transition-all ${
                activeTab === tab
                  ? 'text-orange-700 font-bold border-b-2 border-orange-700'
                  : 'text-gray-500 font-medium hover:text-gray-800'
              }`}
            >
              {tab === 'Code' ? 'Quiz Code' : tab}
            </button>
          ))}
        </div>

        {/* Status Alert Banner */}
        {statusMsg.text && (
          <div className={`px-6 py-2 text-xs font-medium border-b ${
            statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            'bg-orange-50 text-orange-800 border-orange-200'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Tab Contents Scrollable Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          
          {/* TAB 1: Quiz Code */}
          {activeTab === 'Code' && (
            <div className="space-y-6 max-w-xl mx-auto">
              
              {/* Giant Typography for Join Code */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Student Join Code</p>
                <h1 className="text-[64px] font-bold text-orange-700 tracking-[8px] text-center leading-none">
                  {quiz.quizCode}
                </h1>
                
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={copyLink}
                    className="px-4 py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 font-bold text-xs rounded-lg border border-orange-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-4 h-4" /> {copied ? 'Copied Magic Link!' : 'Copy Magic Link'}
                  </button>
                </div>
              </div>

              {/* QR Code and Roster Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 text-center flex flex-col items-center justify-center">
                  <QRCodeSVG value={joinLink} size={140} level="H" />
                  <p className="text-xs font-bold text-gray-500 mt-3">Scan to Join</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-orange-700" /> Excel Roster (.xlsx)
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {quiz.roster?.length || 0} Students Uploaded
                    </p>
                  </div>

                  <form onSubmit={handleRosterUpload} className="space-y-2">
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => setRosterFile(e.target.files[0])}
                      className="text-xs w-full"
                    />
                    <button
                      type="submit"
                      disabled={!rosterFile}
                      className="w-full py-2 bg-orange-700 text-white rounded-lg font-bold text-xs hover:bg-orange-800 disabled:opacity-40"
                    >
                      Upload Roster
                    </button>
                  </form>

                  <button
                    onClick={handleSendInvites}
                    disabled={dispatching || !quiz.roster || quiz.roster.length === 0}
                    className="w-full py-2.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg font-bold text-xs hover:bg-orange-100 flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-4 h-4" /> Send Nodemailer Invites
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Settings */}
          {activeTab === 'Settings' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4 max-w-lg mx-auto">
              <h3 className="text-xl font-bold text-orange-700 border-b border-gray-200 pb-3">Quiz Settings</h3>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Quiz Title</label>
                <p className="text-base font-bold text-slate-900 mt-0.5">{quiz.title}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Instructions</label>
                <p className="text-xs text-slate-600 mt-0.5">{quiz.description || 'No special instructions.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Duration</label>
                  <p className="text-lg font-bold text-orange-700">{quiz.durationMinutes || 30} Mins</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Marks Per Qn</label>
                  <p className="text-lg font-bold text-orange-700">{quiz.marksPerQuestion || 1} Marks</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Results */}
          {activeTab === 'Results' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-orange-700">Submissions & Anti-Cheat Tally</h3>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.get(`/submission/${quiz.quizCode}/export-csv`, { responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `${quiz.quizCode}_Quiz_Results.csv`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        alert('Failed to export CSV.');
                      }
                    }}
                    className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-bold hover:bg-orange-100 inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                  
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.get(`/submission/${quiz.quizCode}/export-excel`, { responseType: 'blob' });
                        const url = window.URL.createObjectURL(
                          new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                        );
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `${quiz.quizCode}_Graded_Roster.xlsx`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        alert('Failed to export Excel file.');
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 inline-flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Download Graded .xlsx
                  </button>
                </div>
              </div>

              {submissions.length > 0 ? (
                <div className="space-y-2">
                  {submissions.map((sub) => {
                    const isFlagged = sub.cheatFlags && sub.cheatFlags.length > 0;
                    return (
                      <div
                        key={sub.id}
                        className={`p-4 rounded-lg border flex items-center justify-between ${
                          isFlagged ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Leading Circle Avatar: bg-red-500 text-white if flagged */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            isFlagged ? 'bg-red-500 text-white' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {sub.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">{sub.studentName}</h4>
                              <span className="text-xs font-mono font-bold text-orange-700">({sub.regNo})</span>
                            </div>
                            {isFlagged ? (
                              <p className="text-xs font-bold text-red-600 mt-0.5">
                                ⚠️ Flagged: {sub.cheatFlags.join('; ')}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500">Submitted Clean</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Score text: text-red-600 font-bold if flagged */}
                          <span className={`text-base ${isFlagged ? 'text-red-600 font-bold' : 'font-bold text-slate-900'}`}>
                            {sub.score} / {sub.totalPossible}
                          </span>

                          <button
                            onClick={() => handleRevoke(sub.regNo)}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-md font-bold text-xs hover:bg-red-700 transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Revoke
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white p-8 text-center rounded-2xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-400">No submissions recorded yet for this quiz.</p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
