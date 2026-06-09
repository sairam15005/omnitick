import React, { useState } from 'react';
import { Ticket as TicketIcon, Mail, Lock, User as UserIcon, ArrowRight, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';
import { User, UserRole } from '../types';

interface AuthPageProps {
  onAuth: (user: User, token: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('User');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(false);
    setErrorText(null);
    setSuccessText(null);
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password } 
        : { name: formData.name, email: formData.email, password: formData.password, role };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Authenication failed in OmniTick nodes.');
      }

      setSuccessText(isLogin ? "Namaste! Access granted, syncing secure keys..." : "Account registered successfully!");
      
      setTimeout(() => {
        setIsLoading(false);
        // Save token and pass User object back
        sessionStorage.setItem('omni_jwt', result.token);
        sessionStorage.setItem('omni_user_data', JSON.stringify(result.user));
        localStorage.setItem('omni_jwt', result.token);
        localStorage.setItem('omni_user_data', JSON.stringify(result.user));
        onAuth(result.user, result.token);
      }, 1000);

    } catch (err: any) {
      setErrorText(err.message || 'An unexpected connection issue occurred, Bhai.');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (email: string, roleName: string) => {
    setIsLoading(true);
    setErrorText(null);
    setSuccessText(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'admin123' })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Quick login failed.');
      }
      setSuccessText(`Namaste! Quick logged in as ${roleName}, syncing keys...`);
      setTimeout(() => {
        setIsLoading(false);
        sessionStorage.setItem('omni_jwt', result.token);
        sessionStorage.setItem('omni_user_data', JSON.stringify(result.user));
        localStorage.setItem('omni_jwt', result.token);
        localStorage.setItem('omni_user_data', JSON.stringify(result.user));
        onAuth(result.user, result.token);
      }, 800);
    } catch (err: any) {
      setErrorText(err.message || 'Quick login failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="mandala-bg animate-pulse" />
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg z-10">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="p-4 bg-gradient-to-br from-[#FF9933] to-[#138808] rounded-3xl shadow-2xl shadow-orange-500/30 mb-4 scale-110">
            <TicketIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">OmniTick <span className="text-saffron">Bharat</span></h1>
          <p className="text-slate-400 text-sm max-w-[320px]">
            Enterprise-Grade Universal Pass Platform with cryptographic ledger audits and location-aware recommendations.
          </p>
        </div>

        <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 border-slate-800/60 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-saffron via-white to-india-green" />

          {showForgot ? (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Reset Passphrase</h3>
              <p className="text-xs text-slate-400">Provide your verified email. Saffron ML nodes will dispatch a cryptographically hashed reset pathway link.</p>
              
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 focus-within:text-saffron" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-saffron/25 focus:border-saffron/50 outline-none text-slate-100 transition-all text-sm font-medium"
                      placeholder="naam@domain.in"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-saffron hover:bg-orange-500 text-white font-bold text-sm rounded-2xl transition-all"
                  >
                    Send Hashed Pathway
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="px-6 py-4 bg-slate-900 border border-slate-800 text-slate-300 font-bold text-sm rounded-2xl hover:bg-slate-800 transition-all"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Login / Register Toggle */}
              <div className="flex gap-2 p-1.5 bg-slate-900/50 border border-slate-800 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setErrorText(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isLogin ? 'bg-saffron text-white shadow-lg shadow-orange-600/20' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setErrorText(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    !isLogin ? 'bg-saffron text-white shadow-lg shadow-orange-600/20' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {errorText && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-semibold leading-relaxed">
                  ⚠️ {errorText}
                </div>
              )}

              {successText && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle size={16} /> {successText}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-saffron transition-colors" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-saffron/20 focus:border-saffron/50 outline-none text-slate-100 transition-all text-sm font-medium"
                        placeholder="Vijay Shekhar"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-saffron transition-colors" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-saffron/20 focus:border-saffron/50 outline-none text-slate-100 transition-all text-sm font-medium"
                      placeholder="vijay@omnitick.in"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Password</label>
                    {isLogin && (
                      <button 
                        type="button" 
                        onClick={() => setShowForgot(true)}
                        className="text-[10px] text-saffron font-bold hover:text-orange-300"
                      >
                        Forgot Passphrase?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-saffron transition-colors" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-saffron/20 focus:border-saffron/50 outline-none text-slate-100 transition-all text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>



                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 py-4 bg-saffron hover:bg-orange-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-orange-950/20 active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Authenticate Access' : 'Register Secure Profile'}
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {isLogin && (
                <div className="mt-6 space-y-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono text-center font-bold">
                    ⚡ Quick Demo Sessions
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('SAIRAM1592005@gmail.com', 'Admin')}
                      className="py-2.5 px-2 bg-saffron/10 border border-saffron/20 hover:bg-saffron hover:text-white rounded-xl text-[10px] font-black text-saffron transition-all uppercase tracking-wider text-center cursor-pointer"
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('organizer@omnitick.in', 'Organizer')}
                      className="py-2.5 px-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-xl text-[10px] font-black text-emerald-400 transition-all uppercase tracking-wider text-center cursor-pointer"
                    >
                      Organizer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('aarav@gmail.com', 'Attendee')}
                      className="py-2.5 px-2 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500 hover:text-white rounded-xl text-[10px] font-black text-blue-400 transition-all uppercase tracking-wider text-center cursor-pointer"
                    >
                      User
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-500" />
            SHA-256 Verified
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Sparkles size={12} className="text-orange-500" />
            Gemini Pro AI Assisted
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
