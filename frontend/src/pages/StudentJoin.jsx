import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { safeStorage } from '../utils/safeStorage';
import PrimaryButton from '../components/PrimaryButton';
import TextField from '../components/TextField';
import { 
  DoorOpen, Key, User, FileText, Loader2, AlertCircle, 
  ShieldCheck, CheckCircle2, ArrowLeft 
} from 'lucide-react';


export default function StudentJoin() {
  const navigate = useNavigate();
  const location = useLocation();

  // 2-Step State: 1 = Code Verification, 2 = Student Registration & Name
  const [step, setStep] = useState(1);

  const [code, setCode] = useState('');
  const [verifiedQuiz, setVerifiedQuiz] = useState(null);
  
  const [regNo, setRegNo] = useState('');
  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false);
  const [verifyingMsg, setVerifyingMsg] = useState('');
  const [error, setError] = useState('');

  // Auto-Bypass if URL contains code, reg, and name
  useEffect(() => {
    let searchString = location.search;
    if (!searchString && window.location.hash.includes('?')) {
      searchString = '?' + window.location.hash.split('?')[1];
    }

    const searchParams = new URLSearchParams(searchString);
    const codeParam = searchParams.get('code');
    const regParam = searchParams.get('reg');
    const nameParam = searchParams.get('name');

    if (codeParam) setCode(codeParam.toUpperCase());
    if (regParam) setRegNo(regParam);
    if (nameParam) setName(nameParam);

    if (codeParam && regParam && nameParam) {
      executeAutoBypass(codeParam.toUpperCase(), regParam, nameParam);
    }
  }, [location]);

  const executeAutoBypass = async (quizCode, registrationNo, studentName) => {
    setLoading(true);
    setVerifyingMsg(`Auto-verifying ${quizCode} for ${studentName}...`);

    try {
      const quizRes = await api.get(`/quiz/${quizCode}`);
      const quiz = quizRes.data.quiz;

      if (!quiz) throw new Error(`Quiz code ${quizCode} does not exist.`);

      const statusRes = await api.get(`/submission/check-status?code=${quizCode}&regNo=${encodeURIComponent(registrationNo)}`);
      
      if (statusRes.data.submitted) {
        throw new Error(`Student registration ${registrationNo} has already completed this quiz.`);
      }

      sessionStorage.setItem('active_student', JSON.stringify({
        quizCode,
        regNo: registrationNo,
        name: studentName,
        quiz
      }));

      setVerifyingMsg('Verification complete! Redirecting...');
      setTimeout(() => navigate('/instructions'), 600);
    } catch (err) {
      console.error('Auto-bypass error:', err);
      setError(err.response?.data?.error || err.message || 'Verification failed.');
      setLoading(false);
    }
  };

  // STEP 1: Verify Quiz Code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!code || code.trim().length !== 5) {
      setError('Please enter a valid 5-letter quiz code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/quiz/${code.toUpperCase()}`);
      const quiz = res.data.quiz;

      if (!quiz) {
        throw new Error(`Quiz code '${code.toUpperCase()}' not found.`);
      }

      if (quiz.isStopped || (quiz.endTime && new Date(quiz.endTime) < new Date())) {
        throw new Error(`This quiz has been stopped / force ended by the faculty.`);
      }

      setVerifiedQuiz(quiz);
      setStep(2); // Proceed to Step 2: Student Details

    } catch (err) {
      console.error('Code verification error:', err);
      setError(err.response?.data?.error || `Quiz code '${code.toUpperCase()}' does not exist.`);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify Student Registration & Enter Quiz
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!regNo.trim()) {
      setError('Please enter your Registration Number (e.g. 24MIS7351).');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your Full Name.');
      return;
    }

    setLoading(true);
    try {
      const statusRes = await api.get(`/submission/check-status?code=${code.toUpperCase()}&regNo=${encodeURIComponent(regNo.trim())}`);

      if (statusRes.data.submitted) {
        throw new Error(`Registration '${regNo.trim()}' has already submitted this exam.`);
      }

      safeStorage.setItem('active_student', JSON.stringify({
        quizCode: code.toUpperCase(),
        regNo: regNo.trim(),
        name: name.trim(),
        quiz: verifiedQuiz
      }));

      navigate('/instructions');


    } catch (err) {
      console.error('Student registration submission error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to verify registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-6">
      
      {/* Main Container Card */}
      <div
        className="max-w-[450px] w-full bg-white rounded-2xl border-2 border-orange-200 p-8 relative"
        style={{ boxShadow: '0px 4px 10px rgba(255, 165, 0, 0.1)' }}
      >
        
        {/* Top Circular Icon */}
        <div className="bg-orange-50 h-24 w-24 rounded-full flex items-center justify-center border border-orange-100 text-orange-700 mx-auto mb-6">
          <DoorOpen className="w-12 h-12 text-orange-700" />
        </div>

        {loading ? (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-orange-700 animate-spin mx-auto" />
            <p className="font-bold text-sm text-slate-800">Verifying Credentials</p>
            <p className="text-xs text-orange-700 font-medium">{verifyingMsg || 'Connecting to quiz server...'}</p>
          </div>
        ) : (
          <>
            {/* STEP 1: VERIFY CODE FIRST */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-center text-orange-700 mb-1">Student Join Portal</h1>
                  <p className="text-xs text-center text-gray-500">
                    Enter your 5-letter code to verify your classroom assessment.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <TextField
                    label="5-Letter Quiz Code"
                    value={code}
                    onChange={setCode}
                    placeholder="e.g. QZ87X"
                    icon={Key}
                    maxLength={5}
                    uppercase={true}
                    maxLengthIndicator={true}
                    required={true}
                  />

                  <div className="pt-2">
                    <PrimaryButton type="submit" disabled={loading}>
                      Verify Code
                    </PrimaryButton>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: ASK FOR REGISTRATION NUMBER & NAME AFTER VERIFICATION */}
            {step === 2 && verifiedQuiz && (
              <div className="space-y-6">
                
                {/* Verified Quiz Header Badge */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center space-y-1">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setStep(1);
                        setError('');
                      }}
                      className="text-xs font-bold text-orange-700 hover:underline flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Change Code
                    </button>
                    <span className="px-2.5 py-0.5 rounded bg-orange-700 text-white font-mono font-bold text-xs">
                      {verifiedQuiz.quizCode}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 pt-1">{verifiedQuiz.title}</h2>
                  <p className="text-[11px] text-gray-500">
                    Duration: {verifiedQuiz.durationMinutes || 30} Mins | Questions: {verifiedQuiz.questions?.length || 0}
                  </p>
                </div>

                <div>
                  <h1 className="text-xl font-bold text-center text-orange-700 mb-1">Student Details</h1>
                  <p className="text-xs text-center text-gray-500">
                    Enter your Registration Number and Name to begin.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleStudentSubmit} className="space-y-4">
                  <TextField
                    label="Registration Number"
                    value={regNo}
                    onChange={setRegNo}
                    placeholder="e.g. 24MIS7351"
                    icon={FileText}
                    required={true}
                  />

                  <TextField
                    label="Full Name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Alex Johnson"
                    icon={User}
                    required={true}
                  />

                  <div className="pt-2">
                    <PrimaryButton type="submit" disabled={loading}>
                      Start Exam Now
                    </PrimaryButton>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* Card Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-700" /> Quiz Genius LMS
          </span>
          <span>Step {step} of 2</span>
        </div>

      </div>
    </div>
  );
}
