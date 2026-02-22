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
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-zinc-200/50 p-8"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">M</div>
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.div key="lh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold text-zinc-900">Welcome Back</h1>
                <p className="text-zinc-500 mt-2">Sign in to your account to continue</p>
              </motion.div>
            )}
            {view === 'forgot' && (
              <motion.div key="fh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold text-zinc-900">Reset Password</h1>
                <p className="text-zinc-500 mt-2">Enter your email to receive a reset link</p>
              </motion.div>
            )}
            {view === 'sent' && (
              <motion.div key="sh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold text-zinc-900">Check Your Email</h1>
                <p className="text-zinc-500 mt-2">Reset link sent to <strong>{forgotEmail}</strong></p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {view === 'login' && (
            <motion.form key="lf" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Test Credentials</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-medium">Admin</p>
                    <p className="text-xs font-bold text-zinc-900">admin / admin123</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-medium">Manager</p>
                    <p className="text-xs font-bold text-zinc-900">manager / manager123</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-medium">Delivery Boy</p>
                    <p className="text-xs font-bold text-zinc-900">delivery1 / boy123</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="Enter your username" required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Password</label>
                  <button type="button" onClick={() => setView('forgot')} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    Forgot password?
                  </button>
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'Signing in...' : <><LogIn size={20} />Sign In</>}
              </button>
            </motion.form>
          )}

          {view === 'forgot' && (
            <motion.form key="ff" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleForgot} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    placeholder="admin@example.com" required />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                <Mail size={18} />Send Reset Link
              </button>
              <button type="button" onClick={() => setView('login')} className="w-full flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-700">
                <ArrowLeft size={14} />Back to login
              </button>
            </motion.form>
          )}

          {view === 'sent' && (
            <motion.div key="sf" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <p className="text-sm text-zinc-500">If an account with that email exists, you'll receive a password reset link shortly.</p>
              <button onClick={() => { setView('login'); setForgotEmail(''); }} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                <ArrowLeft size={14} />Back to login
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 pt-4 border-t border-zinc-100 text-center">
          <a href="/dev" className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors font-mono">
            Developer Portal →
          </a>
        </div>
      </motion.div>
    </div>
  );
}
