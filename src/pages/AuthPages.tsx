import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, saveStoredAccount, setAuthSession } from '../lib/storage-and-db';
import { EventraLogo } from '../components/EventraLogo';
import { 
  Loader2, AlertCircle, Eye, EyeOff, 
  ArrowLeft, Building, Mail, Lock, User, Sparkles
} from 'lucide-react';

export const Login: React.FC = () => {
  return <AuthContainer initialMode="signin" />;
};

export const Register: React.FC = () => {
  return <AuthContainer initialMode="signup" />;
};

interface AuthContainerProps {
  initialMode: 'signin' | 'signup';
}

const AuthContainer: React.FC<AuthContainerProps> = ({ initialMode }) => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db.recordVisit(window.location.pathname);
  }, []);

  const handleOwnerSignIn = () => {
    saveStoredAccount({
      id: 'usr_owner_marv',
      email: 'marvglobalbuild@eventra.io',
      full_name: 'Marvelous Ndukwe (Owner)',
      org_id: 'org_owner_marv',
      org_name: 'Eventra Global Workspace',
      created_at: new Date().toISOString(),
    });
    setAuthSession('marvglobalbuild@eventra.io');
    window.location.href = '/admin';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'signin') {
      const res = await signIn(email, password);
      if (!res.success) {
        setError(res.error || 'Failed to sign in. Please check your email and password.');
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    } else {
      const res = await signUp(email, password, fullName, orgName);
      if (!res.success) {
        setError(res.error || 'Failed to create your account.');
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#6425E8]/20 selection:text-[#6425E8]">
      {/* Top Brand Anchor */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <Link to="/" className="inline-block transition hover:opacity-90">
          <EventraLogo variant="with-tagline" size="lg" />
        </Link>
        <h2 className="mt-6 text-xl sm:text-2xl font-extrabold text-[#111126] tracking-tight">
          {mode === 'signin' ? 'Sign in to your Workspace' : 'Create your Eventra Account'}
        </h2>
        <p className="text-xs text-[#73738A] mt-1.5 max-w-xs">
          {mode === 'signin' 
            ? 'Sign in to access your dashboard, monitor flyer downloads, and view participant registrations.'
            : 'Register your workspace to upload flyer designs and generate personalised attendee links.'
          }
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Software Owner Portal Link */}
        <div className="mb-4 bg-gradient-to-r from-purple-50 via-sky-50 to-indigo-50 border border-[#6425E8]/20 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="text-left">
              <span className="text-xs font-bold text-[#111126] block">Platform Owner (marvglobalbuild)?</span>
              <span className="text-[11px] text-[#73738A]">View live visitors, users & CRM directly</span>
            </div>
          </div>
          <Link
            to="/admin"
            className="px-3.5 py-1.5 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-bold rounded-xl shadow-xs transition whitespace-nowrap"
          >
            Open CMS & CRM →
          </Link>
        </div>

        <div className="bg-white py-8 px-6 shadow-xs border border-[#E9E8F0] rounded-2xl sm:px-10">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-[#F8F8FC] p-1 rounded-xl mb-6 border border-[#E9E8F0]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 'signin'
                  ? 'bg-white text-[#111126] shadow-xs'
                  : 'text-[#73738A] hover:text-[#111126]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 'signup'
                  ? 'bg-white text-[#111126] shadow-xs'
                  : 'text-[#73738A] hover:text-[#111126]'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marvelous Ndukwe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                    Organisation / Brand Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Pilgrims Pentecostal Ministries"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider">
                  Password
                </label>
                {mode === 'signin' && (
                  <Link
                    to="/reset-password"
                    className="text-[11px] text-[#6425E8] hover:underline font-semibold"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-[#111126]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-[10px] text-[#73738A] mt-1">Must be at least 6 characters long</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
              )}
            </button>
          </form>

          {/* Toggle between modes */}
          <div className="mt-6 pt-5 border-t border-[#E9E8F0] text-center">
            {mode === 'signin' ? (
              <p className="text-xs text-[#73738A]">
                Don't have an account yet?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="font-bold text-[#6425E8] hover:underline"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#73738A]">
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="font-bold text-[#6425E8] hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          {/* Platform Owner 1-Click Access */}
          <div className="mt-4 pt-4 border-t border-[#E9E8F0]">
            <button
              type="button"
              onClick={handleOwnerSignIn}
              className="w-full py-2 px-3 bg-[#6425E8]/10 hover:bg-[#6425E8]/20 text-[#6425E8] border border-[#6425E8]/20 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Click Owner Sign In (marvglobalbuild)</span>
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-xs font-semibold text-[#73738A] hover:text-[#111126] inline-flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Eventra Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export const PasswordReset: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <Link to="/">
          <EventraLogo variant="with-tagline" size="md" />
        </Link>
        <h2 className="mt-6 text-xl font-bold text-[#111126]">Reset your Password</h2>
        <p className="text-xs text-[#73738A] mt-1">Enter your registered work email to receive reset instructions</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-[#E9E8F0] rounded-2xl sm:px-10">
          {submitted ? (
            <div className="text-center py-4 space-y-3">
              <h3 className="text-sm font-bold text-[#111126]">Reset Instructions Sent</h3>
              <p className="text-xs text-[#73738A] max-w-xs mx-auto">
                If an account exists for <strong>{email}</strong>, you will receive password reset instructions.
              </p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-block py-2 px-4 bg-[#6425E8] text-white text-xs font-semibold rounded-xl"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#73738A] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:border-[#6425E8]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#6425E8] hover:bg-[#501bc5] text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Send Reset Link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
