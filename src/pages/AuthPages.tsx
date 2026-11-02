import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EventraLogo } from '../components/EventraLogo';
import { Sparkles, Loader2, AlertCircle, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, quickDemoLogin, isSupabase } = useAuth();

  const [email, setEmail] = useState('alex.morgan@eventra.io');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn(email, password);
    if (!res.success) {
      setError(res.error || 'Failed to sign in.');
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  const handleQuickDemo = () => {
    quickDemoLogin();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <Link to="/" className="inline-block">
          <EventraLogo variant="with-tagline" size="lg" />
        </Link>
        <h2 className="mt-5 text-xl font-bold text-[#111126]">Sign In to Workspace</h2>
        <p className="text-xs text-[#73788A] mt-1">Access your organisation campaigns and attendee flyers</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E9E8F0] rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#73788A] uppercase tracking-wider mb-1">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#73788A] uppercase tracking-wider">
                  Password
                </label>
                <Link to="/reset-password" className="text-[11px] font-semibold text-[#6425E8] hover:underline">
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In to Eventra</span>}
            </button>
          </form>

          {/* Quick Demo Test Access Button */}
          <div className="mt-5 pt-5 border-t border-[#E9E8F0]">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2.5 bg-[#F8F8FC] hover:bg-[#ECECF3] border border-[#E9E8F0] text-[#111126] text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-[#6425E8]" />
              <span>Instant Test Sign-In (Alex Morgan · Elevate Group)</span>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[#73788A]">
            Don't have an organiser account?{' '}
            <Link to="/register" className="font-semibold text-[#6425E8] hover:underline">
              Register Organisation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signUp(email, password, fullName);
    if (!res.success) {
      setError(res.error || 'Failed to create account.');
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <Link to="/" className="inline-block">
          <EventraLogo variant="with-tagline" size="lg" />
        </Link>
        <h2 className="mt-5 text-xl font-bold text-[#111126]">Create Eventra Organisation</h2>
        <p className="text-xs text-[#73788A] mt-1">Start managing events, attendee flyers, and campaigns</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E9E8F0] rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#73788A] uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#73788A] uppercase tracking-wider mb-1">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jordan@company.com"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#73788A] uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Organisation Account</span>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#73788A]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#6425E8] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export const PasswordReset: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <Link to="/" className="inline-block">
          <EventraLogo variant="with-tagline" size="lg" />
        </Link>
        <h2 className="mt-5 text-xl font-bold text-[#111126]">Reset Account Password</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E9E8F0] rounded-2xl sm:px-10">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#73788A]">
                Enter your registered work email and we will dispatch password recovery instructions.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-[#73788A] uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E9E8F0] rounded-xl text-xs text-[#111126] focus:outline-none focus:ring-2 focus:ring-[#6425E8]/20 focus:border-[#6425E8]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#6425E8] hover:bg-[#4214B8] text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                Send Password Reset Link
              </button>
            </form>
          ) : (
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-sm text-[#111126]">Recovery Email Dispatched</h3>
              <p className="text-xs text-[#73788A]">
                We have sent reset instructions to <strong>{email}</strong>.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-block text-xs font-semibold text-[#6425E8] hover:underline"
              >
                Return to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
