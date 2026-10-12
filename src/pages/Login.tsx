import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Mail, ArrowLeft, CheckCircle2, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login as apiLogin, mapBackendRoleToFrontend, normalizeFetchError } from '../lib/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot' | 'sent'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiLogin(username.trim(), password);
      const role = mapBackendRoleToFrontend(data.user.role_codes);
      login(data.access_token, {
        id: data.user.id,
        email: data.user.email,
        username: data.user.full_name ?? data.user.email,
        role,
      });
    } catch (err: unknown) {
      setError(normalizeFetchError(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setView('sent');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-muted">
      <div className="flex-1 px-4 py-10 w-full max-w-sm mx-auto flex flex-col justify-center">
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/app_icon.png" alt="Neomed" className="size-14 rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]" />
          <span className="mt-3 text-xl font-semibold tracking-tight text-foreground">Neomed</span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Management</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-xl border bg-card text-card-foreground shadow-[0_1px_2px_rgb(0_0_0/0.03)] p-6">

          <div className="mb-5">
            <AnimatePresence mode="wait">
              {view === 'login' && (
                <motion.div key="lh" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <h2 className="text-lg font-semibold tracking-tight">Welcome back</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Sign in to continue</p>
                </motion.div>
              )}
              {view === 'forgot' && (
                <motion.div key="fh" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <h2 className="text-lg font-semibold tracking-tight">Reset password</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Enter your email to receive a reset link</p>
                </motion.div>
              )}
              {view === 'sent' && (
                <motion.div key="sh" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <h2 className="text-lg font-semibold tracking-tight">Check your email</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Reset link sent to <strong className="text-foreground">{forgotEmail}</strong></p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.form key="lf" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                onSubmit={handleSubmit} className="space-y-4">

                {error && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter email" required autoComplete="username" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <button type="button" onClick={() => setView('forgot')}
                      className="text-xs font-medium text-primary hover:underline underline-offset-4">
                      Forgot?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                    rightSlot={
                      <span className="flex items-center gap-0.5">
                        <button type="button" onClick={() => setPassword('')} title="Clear password" tabIndex={-1}
                          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                          <X size={16} />
                        </button>
                        <button type="button" onClick={() => setShowPassword((p) => !p)}
                          title={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}
                          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </span>
                    }
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" loading={loading} disabled={loading}>
                  Sign in
                </Button>
              </motion.form>
            )}

            {view === 'forgot' && (
              <motion.form key="ff" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">Email address</Label>
                  <Input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    leftIcon={<Mail />} placeholder="your@email.com" required />
                </div>
                <Button type="submit" size="lg" className="w-full">
                  <Mail />Send reset link
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setView('login')}>
                  <ArrowLeft />Back to login
                </Button>
              </motion.form>
            )}

            {view === 'sent' && (
              <motion.div key="sf" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 text-center py-4">
                <div className="size-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} className="text-success" />
                </div>
                <p className="text-sm text-muted-foreground px-2">If an account exists with that email, you'll receive a password reset link shortly.</p>
                <Button type="button" variant="ghost" className="w-full" onClick={() => { setView('login'); setForgotEmail(''); }}>
                  <ArrowLeft />Back to login
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <footer className="px-6 pb-8 text-center">
        <Link to="/privacy-policy" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
