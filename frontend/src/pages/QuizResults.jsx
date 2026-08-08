import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { 
  Zap, Download, FileSpreadsheet, AlertTriangle, Trash2, 
  CheckCircle2, Users, RefreshCw, Eye, ShieldAlert, ArrowLeft 
} from 'lucide-react';

export default function QuizResults() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    fetchSubmissions();
  }, [code]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/submission/${code}`);
      setData(res.data);
    } catch (err) {
      console.error('Fetch submissions error:', err);
      setStatusMsg({ type: 'error', text: 'Failed to load submissions.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAttempt = async (regNo) => {
    if (!window.confirm(`Are you sure you want to revoke submission for registration ${regNo}?`)) {
      return;
    }

    setRevoking(regNo);
    try {
      await api.delete(`/submission/${code}/${encodeURIComponent(regNo)}`);
      setStatusMsg({ type: 'success', text: `Revoked submission for ${regNo}` });
      fetchSubmissions();
    } catch (err) {
      console.error('Revoke error:', err);
      setStatusMsg({ type: 'error', text: 'Failed to revoke submission.' });
    } finally {
      setRevoking(null);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await api.get(`/submission/${code}/export-csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${code}_Quiz_Results.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export error:', err);
      alert('Failed to export CSV file.');
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const res = await api.get(`/submission/${code}/export-excel`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${code}_Graded_Roster.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel export error:', err);
      alert('Failed to export Excel file.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Fetching submission records & anti-cheat flags...</p>
      </div>
    );
  }

  const submissions = data?.submissions || [];
  const totalSubmissions = data?.totalSubmissions || 0;
  const rosterCount = data?.rosterCount || 0;

  return (
    <div className="space-y-8">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-brand-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <Link to="/dashboard" className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-brand-700 text-white font-mono font-extrabold text-xs rounded-xl">
              CODE: {code}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quiz Results & Anti-Cheat Monitor</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time score tally, tab switch warnings, cheat flag highlighting, and intelligent auto-grading exports.
          </p>
        </div>

        {/* Download Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleDownloadCSV}
            className="px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold text-xs rounded-xl border border-brand-200 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-brand-600" /> Export Intelligent CSV
          </button>
          
          <button
            onClick={handleDownloadExcel}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download Auto-Graded Excel (.xlsx)
          </button>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl font-medium text-sm border flex items-center gap-2 ${
          statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          'bg-green-50 text-green-700 border-green-200'
        }`}>
          {statusMsg.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {statusMsg.text}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-brand-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Submissions Received</p>
            <p className="text-2xl font-extrabold text-slate-900">{totalSubmissions} / {rosterCount || totalSubmissions}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-brand-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Flagged / Suspicious</p>
            <p className="text-2xl font-extrabold text-red-600">
              {submissions.filter(s => s.cheatFlags && s.cheatFlags.length > 0).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-brand-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Clean Submissions</p>
            <p className="text-2xl font-extrabold text-emerald-700">
              {submissions.filter(s => !s.cheatFlags || s.cheatFlags.length === 0).length}
            </p>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-3xl border border-brand-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">Student Attempts & Cheat Warning Badges</h2>
          <span className="text-xs text-slate-400">Highlighted attempts indicate anti-cheat tab switch flags</span>
        </div>

        {submissions.length > 0 ? (
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-50/60 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-brand-100">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Registration No</th>
                  <th className="py-3 px-4">Score Obtained</th>
                  <th className="py-3 px-4">Proctor Status & Warnings</th>
                  <th className="py-3 px-4">Submission Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {submissions.map((sub) => {
                  const isFlagged = sub.cheatFlags && sub.cheatFlags.length > 0;
                  return (
                    <tr
                      key={sub.id}
                      className={`transition-colors ${
                        isFlagged ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-brand-50/30'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{sub.studentName}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-900">{sub.regNo}</td>
                      <td className="py-3.5 px-4 font-bold text-sm text-slate-900">
                        {sub.score} / {sub.totalPossible}
                        <span className="text-[10px] text-slate-400 ml-1 font-normal">
                          ({((sub.score / (sub.totalPossible || 1)) * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isFlagged ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 text-[10px] font-extrabold">
                              <ShieldAlert className="w-3 h-3 text-red-600" /> SUSPICIOUS ATTEMPT
                            </span>
                            <div className="text-[10px] text-red-700 font-semibold">
                              {sub.cheatFlags.join(' • ')}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Clean Attempt
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(sub.submittedAt).toLocaleTimeString()} ({new Date(sub.submittedAt).toLocaleDateString()})
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRevokeAttempt(sub.regNo)}
                          disabled={revoking === sub.regNo}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 border border-brand-200 border-dashed rounded-2xl">
            <Users className="w-10 h-10 text-brand-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Submissions Recorded Yet</p>
            <p className="text-[11px] text-slate-400 mt-1">Students completing the quiz will appear here in real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
