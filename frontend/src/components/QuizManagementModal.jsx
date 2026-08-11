import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import { 
  X, Copy, UploadCloud, FileSpreadsheet, Mail, 
  Trash2, Download, Save, Clock, Calendar, Award, 
  HelpCircle, ShieldAlert, CheckCircle2, OctagonX 
} from 'lucide-react';

export default function QuizManagementModal({ quiz: initialQuiz, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('Code'); // 'Code' | 'Settings' | 'Results'
  const [quiz, setQuiz] = useState(initialQuiz);
  const [submissions, setSubmissions] = useState([]);
  const [dispatching, setDispatching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  // Editable settings state
  const [durationMinutes, setDurationMinutes] = useState(initialQuiz?.durationMinutes || 30);
  const [startTime, setStartTime] = useState(
    initialQuiz?.startTime ? new Date(initialQuiz.startTime).toISOString().slice(0, 16) : ''
  );
  const [endTime, setEndTime] = useState(
    initialQuiz?.endTime ? new Date(initialQuiz.endTime).toISOString().slice(0, 16) : ''
  );
  const [marksPerQuestion, setMarksPerQuestion] = useState(initialQuiz?.marksPerQuestion || 1);
  const [questionCount, setQuestionCount] = useState(
    initialQuiz?.questionCount || (initialQuiz?.questions ? initialQuiz.questions.length : 10)
  );
  const [maxTabSwitches, setMaxTabSwitches] = useState(initialQuiz?.maxTabSwitches ?? 0);
  const [isPracticeMode, setIsPracticeMode] = useState(initialQuiz?.isPracticeMode || false);
  const [showMarksToStudents, setShowMarksToStudents] = useState(initialQuiz?.showMarksToStudents || false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (quiz?.quizCode) {
      fetchSubmissions();
    }
  }, [quiz?.quizCode]);

  // Real-time auto-polling when Results tab is active
  useEffect(() => {
    let interval;
    if (activeTab === 'Results' && quiz?.quizCode) {
      fetchSubmissions();
      interval = setInterval(() => {
        fetchSubmissions();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, quiz?.quizCode]);

  useEffect(() => {
    if (quiz) {
      setDurationMinutes(quiz.durationMinutes || 30);
      setStartTime(quiz.startTime ? new Date(quiz.startTime).toISOString().slice(0, 16) : '');
      setEndTime(quiz.endTime ? new Date(quiz.endTime).toISOString().slice(0, 16) : '');
      setMarksPerQuestion(quiz.marksPerQuestion || 1);
      setQuestionCount(quiz.questionCount || (quiz.questions ? quiz.questions.length : 10));
      setMaxTabSwitches(quiz.maxTabSwitches ?? 0);
      setIsPracticeMode(!!quiz.isPracticeMode);
      setShowMarksToStudents(!!quiz.showMarksToStudents);
    }
  }, [quiz]);



  const fetchSubmissions = async () => {
    try {
      const res = await api.get(`/submission/${quiz.quizCode}`);
      setSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  };

  const handleStopQuiz = async () => {
    if (!window.confirm(`Are you sure you want to force end quiz ${quiz.quizCode}? Students will no longer be able to join or attempt.`)) return;

    setStatusMsg({ type: 'info', text: 'Stopping quiz...' });
    try {
      const res = await api.post(`/quiz/${quiz.quizCode}/stop`);
      setQuiz(res.data.quiz);
      setStatusMsg({ type: 'success', text: 'Quiz has been force ended by faculty.' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Stop quiz error:', err);
      setStatusMsg({ type: 'error', text: 'Failed to stop quiz.' });
    }
  };


  // Instant dialog trigger & auto-upload for Excel Roster
  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRosterFileSelected = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setStatusMsg({ type: 'info', text: 'Parsing Excel roster...' });
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post(`/quiz/${quiz.quizCode}/roster`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatusMsg({ type: 'success', text: res.data.message });
      const updated = await api.get(`/quiz/${quiz.quizCode}`);
      setQuiz(updated.data.quiz);
      if (onRefresh) onRefresh();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to upload roster.' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setStatusMsg({ type: 'info', text: 'Saving quiz settings...' });

    try {
      const payload = {
        durationMinutes: parseInt(durationMinutes, 10),
        startTime: startTime ? new Date(startTime).toISOString() : quiz.startTime,
        endTime: endTime ? new Date(endTime).toISOString() : quiz.endTime,
        marksPerQuestion: parseFloat(marksPerQuestion),
        questionCount: parseInt(questionCount, 10),
        maxTabSwitches: parseInt(maxTabSwitches, 10),
        isPracticeMode: !!isPracticeMode,
        showMarksToStudents: !!showMarksToStudents
      };


      const res = await api.put(`/quiz/${quiz.quizCode}`, payload);
      setQuiz(res.data.quiz);
      setStatusMsg({ type: 'success', text: 'Quiz settings updated successfully!' });
      if (onRefresh) onRefresh();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to update quiz settings.' });
    } finally {
      setIsSavingSettings(false);
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
      
      {/* Hidden File Input for Dialog Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls,.csv"
        onChange={handleRosterFileSelected}
        className="hidden"
      />

      {/* Modal Container: max-w-[900px], max-h-[750px], bg-gray-50, rounded-3xl */}
      <div className="max-w-[900px] w-full max-h-[750px] h-full bg-gray-50 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
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
          <div className={`px-6 py-2 text-xs font-medium border-b shrink-0 ${
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
            <div className="space-y-6 max-w-md mx-auto py-4">
              
              {/* Bigger QR Code with Join Code & Copy Link underneath */}
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-md text-center flex flex-col items-center justify-center">
                
                {/* Bigger QR Code (220px) */}
                <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-inner mb-4">
                  <QRCodeSVG value={joinLink} size={220} level="H" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Scan to Join</p>
                
                {/* Join Code placed under QR code, a bit smaller */}
                <div className="my-2">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Quiz Code</p>
                  <h2 className="text-3xl font-extrabold text-orange-700 tracking-[6px] uppercase">
                    {quiz.quizCode}
                  </h2>
                </div>

                <div className="mt-4">
                  <button
                    onClick={copyLink}
                    className="px-5 py-2.5 bg-orange-50 text-orange-700 hover:bg-orange-100 font-bold text-xs rounded-xl border border-orange-200 flex items-center gap-2 transition-all shadow-sm active:scale-95"
                  >
                    <Copy className="w-4 h-4" /> {copied ? 'Copied Magic Link!' : 'Copy Magic Link'}
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Settings (Includes Stop Quiz Button at Top, Excel Roster & Editable Quiz Options) */}
          {activeTab === 'Settings' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              
              {/* TOP ACTION BAR: Stop Quiz & Status Badge */}
              <div className="bg-white p-5 rounded-2xl border border-red-200/80 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3.5 py-1 text-xs font-extrabold rounded-full border ${
                    quiz.isStopped || (quiz.endTime && new Date(quiz.endTime) < new Date())
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {quiz.isStopped || (quiz.endTime && new Date(quiz.endTime) < new Date()) ? '🔴 QUIZ ENDED' : '🟢 QUIZ ACTIVE'}
                  </span>
                  <p className="text-xs text-slate-500 font-semibold hidden sm:block">
                    {quiz.isStopped ? 'This quiz was force ended by faculty.' : 'Active & open for student responses.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStopQuiz}
                  disabled={quiz.isStopped}
                  className="py-2.5 px-5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <OctagonX className="w-4 h-4 stroke-[2.5]" />
                  {quiz.isStopped ? 'Quiz Already Stopped' : 'Stop Quiz Now'}
                </button>
              </div>

              {/* Excel Roster Management Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">

                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-orange-100/80 text-orange-700">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Excel Student Roster</h3>
                      <p className="text-xs text-gray-500">
                        {quiz.roster?.length || 0} Students currently uploaded
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-orange-50 text-orange-700 font-bold text-xs rounded-full border border-orange-200">
                    {quiz.roster?.length || 0} Registered
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenFileDialog}
                    className="flex-1 py-3 px-4 bg-orange-700 hover:bg-orange-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <UploadCloud className="w-4 h-4" /> Upload Excel Roster (.xlsx)
                  </button>

                  <button
                    type="button"
                    onClick={handleSendInvites}
                    disabled={dispatching || !quiz.roster || quiz.roster.length === 0}
                    className="py-3 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs rounded-xl border border-orange-200 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Mail className="w-4 h-4" /> {dispatching ? 'Sending...' : 'Send Bulk Invites'}
                  </button>
                </div>
              </div>

              {/* Editable Quiz Settings Form */}
              <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Quiz Configurations</h3>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="py-2 px-4 bg-orange-700 hover:bg-orange-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-orange-700" /> Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>

                  {/* Marks Per Question */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-orange-700" /> Marks Per Question
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      value={marksPerQuestion}
                      onChange={(e) => setMarksPerQuestion(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>

                  {/* How Many Questions */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-orange-700" /> Total Question Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={questionCount}
                      onChange={(e) => setQuestionCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>

                  {/* Allowed Tab Switches */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-orange-700" /> Allowed Tab Switches
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={maxTabSwitches}
                      onChange={(e) => setMaxTabSwitches(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                    <span className="text-[11px] text-gray-400 font-medium">0 = Zero tolerance (Strict)</span>
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-orange-700" /> Start Window / Date Time
                    </label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-orange-700" /> End Window / Date Time
                    </label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>

                </div>

                {/* Mode Options */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <label className="flex items-start gap-3 p-3 bg-orange-50/60 rounded-xl border border-orange-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPracticeMode}
                      onChange={(e) => setIsPracticeMode(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-orange-700 rounded focus:ring-orange-600 accent-orange-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Enable Practice Mode</span>
                      <span className="text-[11px] text-slate-500 block">Shows immediate correct answer feedback & explanations after each question attempt.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-orange-50/60 rounded-xl border border-orange-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMarksToStudents}
                      onChange={(e) => setShowMarksToStudents(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-orange-700 rounded focus:ring-orange-600 accent-orange-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Show Marks to Students After Exam (Default: OFF)</span>
                      <span className="text-[11px] text-slate-500 block">If disabled (default), student score is hidden on final submission screen.</span>
                    </div>
                  </label>
                </div>

              </form>


            </div>
          )}

          {/* TAB 3: Results */}
          {activeTab === 'Results' && (
            <div className="space-y-6">
              
              {/* REAL-TIME ATTENDANCE TRACKER BANNER */}
              <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 rounded-3xl p-6 text-white shadow-lg space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-orange-100">
                      Real-Time Attendance Tracker
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-xs">
                    🔴 LIVE POLLING
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">
                      {quiz.roster && quiz.roster.length > 0 
                        ? `${submissions.length} / ${quiz.roster.length}`
                        : `${submissions.length}`}
                    </h2>
                    <p className="text-xs font-bold text-orange-100 mt-1">
                      {quiz.roster && quiz.roster.length > 0
                        ? `Students Attended Out Of ${quiz.roster.length} Uploaded (${((submissions.length / (quiz.roster.length || 1)) * 100).toFixed(0)}% Attendance)`
                        : `Total Students Attended So Far`}
                    </p>
                  </div>
                </div>

                {quiz.roster && quiz.roster.length > 0 && (
                  <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden p-0.5 border border-white/20 mt-2">
                    <div 
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${Math.min(100, (submissions.length / quiz.roster.length) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <h3 className="text-base font-extrabold text-slate-900">Submissions & Anti-Cheat Log</h3>
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
