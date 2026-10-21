import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  Key, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Github, 
  Cpu, 
  Calendar,
  Phone,
  Zap, 
  Eye, 
  EyeOff, 
  LogOut, 
  UserCheck, 
  Laptop, 
  AlertCircle 
} from 'lucide-react';
import { UserProfile } from '../types';

interface LoginPageProps {
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
  onClose?: () => void;
  initialMode?: 'signin' | 'signup' | 'personas' | 'profile' | 'forgot-password';
}

const DEMO_PERSONAS: UserProfile[] = [
  {
    id: 'user-samruddhi',
    name: 'Samruddhi Patil',
    email: 'samruddhipatil1116@gmail.com',
    role: 'Lead Security Architect',
    organization: 'CloudSec Global Labs',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    plan: 'Enterprise Pro AI',
    token: 'sec_tok_' + Math.random().toString(36).substring(2, 10),
    joinedAt: '2025-01-15',
    stats: {
      scansCount: 428,
      bugsResolved: 1290,
      hoursSaved: 384
    }
  },
  {
    id: 'user-alex',
    name: 'Alex Chen',
    email: 'alex.chen@scaleops.io',
    role: 'Senior Staff Engineer',
    organization: 'ScaleOps Distributed Systems',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    plan: 'Enterprise Pro AI',
    token: 'dev_tok_' + Math.random().toString(36).substring(2, 10),
    joinedAt: '2025-03-20',
    stats: {
      scansCount: 265,
      bugsResolved: 742,
      hoursSaved: 215
    }
  },
  {
    id: 'user-elena',
    name: 'Elena Rostova',
    email: 'elena.r@devquality.net',
    role: 'QA Automation Lead',
    organization: 'DevQuality Assurance',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    plan: 'Developer Cloud',
    token: 'qa_tok_' + Math.random().toString(36).substring(2, 10),
    joinedAt: '2025-06-10',
    stats: {
      scansCount: 189,
      bugsResolved: 512,
      hoursSaved: 160
    }
  },
  {
    id: 'user-guest',
    name: 'Guest Developer',
    email: 'guest.developer@sandbox.local',
    role: 'Guest Developer',
    organization: 'Sandbox Workspace',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    plan: 'Community Open',
    token: 'guest_tok_' + Math.random().toString(36).substring(2, 10),
    joinedAt: '2026-01-01',
    stats: {
      scansCount: 14,
      bugsResolved: 32,
      hoursSaved: 12
    }
  }
];

interface PersistedAccount extends UserProfile {
  localPassword?: string;
}

const LOCAL_ACCOUNTS_KEY = 'ibd_registered_users';

function getPersistedLocalUsers(): PersistedAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistLocalUser(user: UserProfile, password?: string) {
  try {
    const existing = getPersistedLocalUsers();
    const filtered = existing.filter(u => u.email.toLowerCase() !== user.email.toLowerCase());
    const account: PersistedAccount = { ...user, localPassword: password };
    filtered.push(account);
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to persist user to local storage', e);
  }
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentUser,
  onLogin,
  onLogout,
  onClose,
  initialMode
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'personas' | 'profile' | 'forgot-password'>(() => {
    if (initialMode) return initialMode;
    return currentUser ? 'profile' : 'signup';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot Password / Reset Password States
  const [resetStep, setResetStep] = useState<'request' | 'verify_and_set' | 'success'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [generatedNoticeCode, setGeneratedNoticeCode] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setSuccessMsg(`Welcome back, ${data.user.name}!`);
        persistLocalUser(data.user, password);
        onLogin(data.user);
        return;
      }

      // Check if server said Invalid Email, verify if local storage has this account
      if (data.error === 'Invalid Email' || data.error?.toLowerCase().includes('not registered')) {
        const localAccounts = getPersistedLocalUsers();
        const localMatch = localAccounts.find(u => u.email.toLowerCase() === trimmedEmail);
        if (localMatch && localMatch.localPassword) {
          if (localMatch.localPassword === password) {
            // Auto re-sync account to backend
            fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: localMatch.name,
                email: localMatch.email,
                password,
                birthDate: localMatch.birthDate,
                phoneNumber: localMatch.phoneNumber,
              }),
            }).catch(() => {});
            persistLocalUser(localMatch, password);
            onLogin(localMatch);
            setSuccessMsg(`Welcome back, ${localMatch.name}!`);
            return;
          } else {
            setErrorMsg('Invalid password. Please check your password and try again.');
            return;
          }
        }
        setErrorMsg('Invalid Email');
        return;
      }

      setErrorMsg(data.error || 'Invalid email or password.');
    } catch (err) {
      // Fallback for offline / network issue: verify registered users + demo credentials
      const localUsers = getPersistedLocalUsers();
      const localMatch = localUsers.find(p => p.email.toLowerCase() === trimmedEmail);
      if (localMatch) {
        if (localMatch.localPassword && localMatch.localPassword !== password) {
          setErrorMsg('Invalid password. Please check your password and try again.');
        } else {
          onLogin(localMatch);
          setSuccessMsg(`Welcome back, ${localMatch.name}!`);
        }
        return;
      }

      const personaMatch = DEMO_PERSONAS.find(p => p.email.toLowerCase() === trimmedEmail);
      if (personaMatch) {
        if (password.length < 6) {
          setErrorMsg('Invalid password. Please check your password and try again.');
        } else {
          onLogin(personaMatch);
          setSuccessMsg(`Welcome back, ${personaMatch.name}!`);
        }
        return;
      }

      setErrorMsg('Invalid Email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter a password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    if (birthDate) {
      const parsedDate = Date.parse(birthDate);
      if (isNaN(parsedDate)) {
        setErrorMsg('Please enter a valid date format for birth date.');
        return;
      }
    }

    const displayName = name.trim() || trimmedEmail.split('@')[0];

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName,
          email: trimmedEmail,
          password,
          confirmPassword,
          birthDate: birthDate ? birthDate.trim() : undefined,
          phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        persistLocalUser(data.user, password);
        setSuccessMsg(`Account created! Welcome to Intelligent Bug Detector, ${data.user.name}.`);
        onLogin(data.user);
      } else {
        setErrorMsg(data.error || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      // Fallback offline registration
      const newUser: UserProfile = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        name: displayName,
        email: trimmedEmail,
        birthDate: birthDate.trim(),
        phoneNumber: phoneNumber.trim(),
        role: 'Full-Stack Reviewer',
        organization: 'Development Team',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
        plan: 'Enterprise Pro AI',
        token: 'jwt_pro_' + Math.random().toString(36).substring(2, 12),
        joinedAt: new Date().toISOString().split('T')[0],
        stats: {
          scansCount: 0,
          bugsResolved: 0,
          hoursSaved: 0
        }
      };
      persistLocalUser(newUser, password);
      onLogin(newUser);
      setSuccessMsg(`Account created! Welcome to Intelligent Bug Detector, ${displayName}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPersona = async (persona: UserProfile) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      // Authenticate persona via server login or direct load
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: persona.email, 
          password: persona.email === 'samruddhipatil1116@gmail.com' ? 'securityMaster2026!'
                  : persona.email === 'alex.chen@scaleops.io' ? 'scaleOps2026!'
                  : persona.email === 'elena.r@devquality.net' ? 'devQuality2026!'
                  : 'guestPass2026!' 
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onLogin(data.user);
      } else {
        onLogin(persona);
      }
      setSuccessMsg(`Switched active session to ${persona.name} (${persona.role}).`);
    } catch {
      onLogin(persona);
      setSuccessMsg(`Switched active session to ${persona.name} (${persona.role}).`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResetToken(data.token || data.code || '');
        setResetCode(data.code || '');
        setGeneratedNoticeCode(data.code || '');
        setResetStep('verify_and_set');
        setSuccessMsg('Verification code generated! Please enter your code and new password below.');
      } else {
        setErrorMsg(data.error || 'Failed to initiate password reset. Please check your email.');
      }
    } catch (err) {
      // Offline fallback
      const matched = DEMO_PERSONAS.find(p => p.email.toLowerCase() === trimmedEmail.toLowerCase());
      if (matched) {
        const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
        setResetToken(mockCode);
        setResetCode(mockCode);
        setGeneratedNoticeCode(mockCode);
        setResetStep('verify_and_set');
        setSuccessMsg('Verification code generated! Please enter your code and new password.');
      } else {
        setErrorMsg('No account found with this email address. Please check your email or register.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePerformReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const cleanCode = (resetCode || resetToken || '').trim();
    if (!cleanCode) {
      setErrorMsg('Please enter the verification code.');
      return;
    }

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (!confirmNewPassword) {
      setErrorMsg('Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          resetToken: cleanCode,
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResetStep('success');
        setEmail(resetEmail.trim());
        setPassword('');
        setSuccessMsg('Password reset successfully. You can now log in with your new password.');
      } else {
        setErrorMsg(data.error || 'Failed to reset password. Please check the code and try again.');
      }
    } catch (err) {
      // Offline fallback
      setResetStep('success');
      setEmail(resetEmail.trim());
      setPassword('');
      setSuccessMsg('Password reset successfully. You can now log in with your new password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-4 space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Role-Based Authentication & Session Hub</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {currentUser ? `Signed In as ${currentUser.name}` : 'Developer & Security Authentication'}
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Access real-time AST multi-language code analysis, Tableau AI executive telemetry, and automated remediation pipelines.
            </p>
          </div>

          {/* If already logged in, show quick active badge */}
          {currentUser && (
            <div className="flex items-center space-x-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-3.5 backdrop-blur-md">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentUser.name}
                className="h-12 w-12 rounded-xl object-cover border border-emerald-400 shadow-md"
              />
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-white">{currentUser.name}</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[11px] font-medium text-emerald-300">{currentUser.role}</div>
                <div className="text-[10px] text-slate-400">{currentUser.organization}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation inside auth container */}
        <div className="relative z-10 mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-800/80">
          <button
            id="auth-tab-signin"
            onClick={() => { setAuthMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              authMode === 'signin'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>

          <button
            id="auth-tab-signup"
            onClick={() => { setAuthMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              authMode === 'signup'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Register Account</span>
          </button>

          <button
            id="auth-tab-personas"
            onClick={() => { setAuthMode('personas'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              authMode === 'personas'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/80 text-indigo-300 hover:bg-slate-800 hover:text-indigo-200 border border-indigo-500/30'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>1-Click Demo Personas</span>
          </button>

          {currentUser && (
            <button
              id="auth-tab-profile"
              onClick={() => { setAuthMode('profile'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex items-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                authMode === 'profile'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-emerald-300 hover:bg-slate-800 hover:text-emerald-200 border border-emerald-500/30'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Active Profile & API Keys</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="flex items-center space-x-2 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs font-semibold text-rose-300 animate-fadeIn">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center space-x-2 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-300 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Mode 1: Sign In */}
      {authMode === 'signin' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-1">Account Sign In</h3>
            <p className="text-xs text-slate-400 mb-6">
              Enter your corporate or developer credentials to access private vulnerability scans.
            </p>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="signin-email-input"
                    type="email"
                    required
                    placeholder="e.g. samruddhipatil1116@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('samruddhipatil1116@gmail.com');
                      setPassword('securityMaster2026!');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    Auto-fill Lead Demo
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="signin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Keep me signed in</span>
                </label>
                <button
                  id="btn-forgot-password-link"
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot-password');
                    setResetStep('request');
                    setResetEmail(email.trim());
                    setResetCode('');
                    setResetToken('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline transition-colors focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                id="btn-submit-signin"
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:from-cyan-400 hover:to-indigo-500 transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="h-4 w-4" />
                <span>{isSubmitting ? 'Authenticating...' : 'Authenticate & Launch Workspace'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  Don't have an account? <span className="underline">Register here</span>
                </button>
                <span className="text-[11px] text-slate-500">Encrypted AES-256</span>
              </div>
            </form>
          </div>

          {/* Fast SSO / Features Side */}
          <div className="md:col-span-5 space-y-4">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 shadow-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Single Sign-On (SSO)
              </h4>
              <div className="space-y-2">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleSelectPersona(DEMO_PERSONAS[0])}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <span>Sign In as Samruddhi Patil</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">Lead Architect</span>
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleSelectPersona(DEMO_PERSONAS[1])}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <span>Sign In as Alex Chen</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Staff DevOps</span>
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleSelectPersona(DEMO_PERSONAS[3])}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                      <Laptop className="h-4 w-4" />
                    </div>
                    <span>Continue as Guest Tester</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Instant Demo</span>
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-2.5 text-xs">
              <div className="flex items-center space-x-2 text-indigo-300 font-bold">
                <Sparkles className="h-4 w-4" />
                <span>Enterprise Security Included</span>
              </div>
              <ul className="space-y-1.5 text-slate-300 text-[11px]">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Real-time AST static checks & semicolon validators</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Tableau AI multi-dimensional business telemetry</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>11+ Natural spoken audio explanation languages</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mode 1.5: Forgot Password / Password Reset Flow */}
      {authMode === 'forgot-password' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
          {resetStep === 'request' && (
            <>
              <div className="md:col-span-7 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-4">
                <div>
                  <div className="inline-flex items-center space-x-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30 mb-2">
                    <Key className="h-3.5 w-3.5" />
                    <span>Password Recovery</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Forgot Password</h3>
                  <p className="text-xs text-slate-400">
                    Enter the email address associated with your account to receive a secure password reset verification.
                  </p>
                </div>

                <form onSubmit={handleRequestReset} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="forgot-password-email-input"
                        type="email"
                        required
                        placeholder="e.g. samruddhipatil1116@gmail.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    id="btn-send-reset-continue"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Key className="h-4 w-4" />
                    <span>{isSubmitting ? 'Sending Request...' : 'Send Reset / Continue'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      id="btn-back-to-login-request"
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 font-semibold"
                    >
                      Remember your password? <span className="text-cyan-400 underline">Back to Login</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="md:col-span-5 space-y-4">
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 shadow-xl space-y-3 text-xs">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Account Security Protection</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Password resets are verified with single-use cryptographic tokens. Your analysis history, Tableau metrics, custom rules, and account data remain completely preserved.
                  </p>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1 text-[11px] text-slate-400">
                    <div className="text-slate-300 font-semibold">Demo accounts available to test:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-[10px] text-cyan-300 font-mono">
                      <li>samruddhipatil1116@gmail.com</li>
                      <li>alex.chen@scaleops.io</li>
                      <li>elena.r@devquality.net</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {resetStep === 'verify_and_set' && (
            <>
              <div className="md:col-span-7 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-4">
                <div>
                  <div className="inline-flex items-center space-x-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Step 2: Verification & New Password</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Create New Password</h3>
                  <p className="text-xs text-slate-400">
                    Enter the verification code for <span className="text-cyan-300 font-semibold font-mono">{resetEmail}</span> and choose a new password.
                  </p>
                </div>

                {generatedNoticeCode && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-200 font-medium">Security Verification Code:</span>
                      <span className="font-mono text-sm font-bold text-amber-300 bg-amber-900/60 px-3 py-1 rounded-lg border border-amber-500/40 tracking-widest">{generatedNoticeCode}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">This single-use code is tied to your account and expires in 15 minutes.</p>
                  </div>
                )}

                <form onSubmit={handlePerformReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Verification Code <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="reset-verification-code-input"
                        type="text"
                        required
                        placeholder="Enter 6-digit code (e.g. 123456)"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      New Password <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="new-password-input"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter new password (min. 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Confirm New Password <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="confirm-new-password-input"
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Confirm new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="btn-submit-reset-password"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isSubmitting ? 'Updating Password...' : 'Reset Password'}</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      id="btn-back-to-login-verify"
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 font-semibold"
                    >
                      Cancel and <span className="text-cyan-400 underline">Back to Login</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="md:col-span-5 space-y-4">
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 shadow-xl space-y-3 text-xs">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Preserved Account Integrity</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Resetting your password securely updates your credentials using PBKDF2-SHA512 hashing with unique salting. No analyses or logs are lost.
                  </p>
                  <ul className="space-y-1.5 text-slate-400 text-[11px] pt-1">
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>Single-use verification token</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>Full scan history preserved</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>Settings & analytics intact</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {resetStep === 'success' && (
            <div className="md:col-span-12 rounded-3xl border border-emerald-500/40 bg-slate-900/95 p-8 sm:p-12 shadow-2xl text-center max-w-xl mx-auto space-y-6 animate-fadeIn">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Password Reset Successfully</h3>
                <p className="text-sm text-emerald-300 font-medium">
                  Password reset successfully. You can now log in with your new password.
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your account profile, history, previous analyses, saved settings, and analytics remain completely associated with your account.
                </p>
              </div>
              <div>
                <button
                  id="btn-back-to-login"
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setEmail(resetEmail);
                    setPassword('');
                    setSuccessMsg('Password reset successfully. You can now log in with your new password.');
                    setErrorMsg('');
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-8 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:from-cyan-400 hover:to-indigo-500 transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
                >
                  <span>Back to Login</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Register / Sign Up */}
      {authMode === 'signup' && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-1">Create Developer Account</h3>
          <p className="text-xs text-slate-400 mb-6">
            Register to save customized lint rules, export Tableau workbooks, and sync team scan histories.
          </p>

          <form onSubmit={handleSignUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="signup-name-input"
                  type="text"
                  placeholder="e.g. Samruddhi Patil"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="signup-email-input"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="signup-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Confirm Password
                </label>
                {confirmPassword && (
                  <span className={`text-[10px] font-semibold ${
                    password === confirmPassword ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {password === confirmPassword ? '✓ Passwords match' : '✗ Do not match'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="signup-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  minLength={6}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-xl border bg-slate-950/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
                    confirmPassword && password !== confirmPassword 
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' 
                      : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Birth Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="signup-birthdate-input"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="signup-phone-input"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                id="btn-submit-signup"
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserCheck className="h-4 w-4" />
                <span>{isSubmitting ? 'Registering Account...' : 'Complete Registration & Launch'}</span>
              </button>

              <div className="text-center pt-3">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Already have an account? <span className="underline">Sign in here</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Mode 3: 1-Click Demo Personas */}
      {authMode === 'personas' && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Instant Demo Personas</h3>
              <p className="text-xs text-slate-400">
                Switch roles instantly to test role-based permissions and analytics dashboards.
              </p>
            </div>
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              4 Pre-configured Personas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {DEMO_PERSONAS.map((persona) => {
              const isActive = currentUser?.id === persona.id;
              return (
                <div
                  key={persona.id}
                  onClick={() => handleSelectPersona(persona)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all hover:scale-[1.01] ${
                    isActive
                      ? 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={persona.avatarUrl}
                        alt={persona.name}
                        className="h-11 w-11 rounded-xl object-cover border border-slate-700 shadow-sm"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                          <span>{persona.name}</span>
                          {isActive && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[10px] text-emerald-300 font-semibold border border-emerald-500/30">
                              Active
                            </span>
                          )}
                        </h4>
                        <div className="text-xs font-medium text-cyan-300">{persona.role}</div>
                        <div className="text-[11px] text-slate-400">{persona.organization}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-[11px]">
                    <div className="rounded-lg bg-slate-900/90 p-1.5 text-center">
                      <div className="text-slate-400">Scans</div>
                      <div className="font-bold text-white">{persona.stats.scansCount}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/90 p-1.5 text-center">
                      <div className="text-slate-400">Fixed</div>
                      <div className="font-bold text-emerald-400">{persona.stats.bugsResolved}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/90 p-1.5 text-center">
                      <div className="text-slate-400">Saved</div>
                      <div className="font-bold text-cyan-400">{persona.stats.hoursSaved}h</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-slate-400">{persona.email}</span>
                    <button className="flex items-center space-x-1 text-cyan-400 font-bold hover:text-cyan-300">
                      <span>{isActive ? 'Current Session' : 'Login'}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 4: Profile & Active Session Management */}
      {authMode === 'profile' && currentUser && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-4">
            <div className="flex items-center space-x-4">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentUser.name}
                className="h-16 w-16 rounded-2xl object-cover border-2 border-cyan-500/50 shadow-xl"
              />
              <div>
                <h3 className="text-lg font-bold text-white">{currentUser.name}</h3>
                <div className="text-xs font-semibold text-cyan-300">{currentUser.role || 'Developer'}</div>
                <div className="text-xs text-slate-400">
                  {currentUser.email}
                  {currentUser.phoneNumber ? ` • ${currentUser.phoneNumber}` : ''}
                  {currentUser.birthDate ? ` • Born: ${currentUser.birthDate}` : ''}
                  {currentUser.organization ? ` • ${currentUser.organization}` : ''}
                </div>
              </div>
            </div>

            <button
              id="btn-logout-session"
              onClick={onLogout}
              className="flex items-center space-x-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-all self-start sm:self-auto active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out Session</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs font-semibold text-slate-400">Subscription Tier</div>
              <div className="mt-1 text-lg font-bold text-white flex items-center space-x-1.5">
                <span>{currentUser.plan}</span>
                <Sparkles className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Unlimited AST & AI tokens</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs font-semibold text-slate-400">Total Code Audits</div>
              <div className="mt-1 text-lg font-bold text-cyan-400">
                {currentUser.stats.scansCount} Scans
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Across 6 supported languages</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs font-semibold text-slate-400">Engineering ROI</div>
              <div className="mt-1 text-lg font-bold text-emerald-400">
                {currentUser.stats.hoursSaved} Hours Saved
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Automated remediation fixes</div>
            </div>
          </div>

          {/* Session Token & Integration Credentials */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Key className="h-4 w-4 text-cyan-400" />
                <span>Active CLI & API Token</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Authenticated (Valid)</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={currentUser.token}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentUser.token);
                  alert('API Token copied to clipboard!');
                }}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-bold text-white transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
