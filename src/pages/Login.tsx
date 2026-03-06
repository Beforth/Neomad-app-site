import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, AlertCircle, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { mockApi } from '../lib/mockApi';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot' | 'sent'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await mockApi.login(username, password);
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setView('sent');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-linear-to-br from-emerald-50 via-white to-blue-50">
      {/* Header / Logo */}
      <div className="pt-12 pb-8 px-6 flex flex-col items-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center text-white text-4xl font-extrabold shadow-2xl shadow-emerald-500/30 mb-6 rotate-3">
          M
        </motion.div>
        <h1 className="text-4xl font-black text-zinc-900 tracking-tighter">NEOMED</h1>
        <p className="text-xs font-bold text-zinc-400 mt-2 uppercase tracking-widest">Enterprise Delivery System</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-8 w-full max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Title Section */}
          <div className="text-center">
            <AnimatePresence mode="wait">
              {view === 'login' && (
                <motion.div key="lh" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h2 className="text-2xl font-bold text-zinc-900">Welcome Back</h2>
                  <p className="text-sm text-zinc-500 mt-1">Sign in to continue</p>
                </motion.div>
              )}
              {view === 'forgot' && (
                <motion.div key="fh" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h2 className="text-2xl font-bold text-zinc-900">Reset Password</h2>
                  <p className="text-sm text-zinc-500 mt-1">Enter your email to receive a reset link</p>
                </motion.div>
              )}
              {view === 'sent' && (
                <motion.div key="sh" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h2 className="text-2xl font-bold text-zinc-900">Check Your Email</h2>
                  <p className="text-sm text-zinc-500 mt-1">Reset link sent to <strong>{forgotEmail}</strong></p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.form key="lf" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} 
                onSubmit={handleSubmit} className="space-y-4">
                
                {error && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Test Credentials */}
                <div className="bg-white/80 backdrop-blur-sm border border-zinc-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Test Credentials</p>
                    <button type="button" onClick={async () => { await mockApi.seedDemoData(); alert('Demo data seeded!'); }}
                      className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors uppercase tracking-wide">
                      Seed Data
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-50 rounded-lg p-2">
                      <p className="text-[9px] text-zinc-400 font-medium uppercase">Admin</p>
                      <p className="text-[11px] font-bold text-zinc-900 mt-0.5">admin / admin123</p>
                    </div>
                    <div className="bg-zinc-50 rounded-lg p-2">
                      <p className="text-[9px] text-zinc-400 font-medium uppercase">Manager</p>
                      <p className="text-[11px] font-bold text-zinc-900 mt-0.5">manager / manager123</p>
                    </div>
                    <div className="bg-zinc-50 rounded-lg p-2">
                      <p className="text-[9px] text-zinc-400 font-medium uppercase">Delivery</p>
                      <p className="text-[11px] font-bold text-zinc-900 mt-0.5">delivery1 / boy123</p>
                    </div>
                    <div className="bg-zinc-50 rounded-lg p-2">
                      <p className="text-[9px] text-zinc-400 font-medium uppercase">Staff</p>
                      <p className="text-[11px] font-bold text-zinc-900 mt-0.5">staff1 / staff123</p>
                    </div>
                  </div>
                </div>

                {/* Username Input */}
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border-2 border-zinc-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none text-[15px]"
                    placeholder="Enter username" required />
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-zinc-700">Password</label>
                    <button type="button" onClick={() => setView('forgot')} 
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
                      Forgot?
                    </button>
                  </div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border-2 border-zinc-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none text-[15px]"
                    placeholder="Enter password" required />
                </div>

                {/* Submit Button */}
                <button type="submit" disabled={loading}
                  className="w-full bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] mt-6">
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><LogIn size={20} />Sign In</>
                  )}
                </button>
              </motion.form>
            )}

            {view === 'forgot' && (
              <motion.form key="ff" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} 
                onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-zinc-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none text-[15px]"
                      placeholder="your@email.com" required />
                  </div>
                </div>
                <button type="submit" 
                  className="w-full bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-[0.98]">
                  <Mail size={18} />Send Reset Link
                </button>
                <button type="button" onClick={() => setView('login')} 
                  className="w-full flex items-center justify-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 font-medium py-2">
                  <ArrowLeft size={16} />Back to login
                </button>
              </motion.form>
            )}

            {view === 'sent' && (
              <motion.div key="sf" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
                className="space-y-6 text-center py-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={40} className="text-emerald-600" />
                </div>
                <p className="text-sm text-zinc-600 px-4">If an account exists with that email, you'll receive a password reset link shortly.</p>
                <button onClick={() => { setView('login'); setForgotEmail(''); }} 
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 py-2">
                  <ArrowLeft size={16} />Back to login
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Developer Portal Link */}
          <div className="text-center pt-4">
            <a href="/dev" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors font-medium">
              Developer Portal →
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
