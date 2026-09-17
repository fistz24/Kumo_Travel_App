import React, { useState } from 'react';
import {
  Mail, Eye, EyeOff, LogIn, UserPlus, Cloud,
  CircleCheck, TriangleAlert, LoaderCircle,
} from 'lucide-react';
import { Modal, Btn, inputStyle } from './ui';
import {
  loginUser, registerUser, loginWithGoogle, sendReset,
  BUILTIN_FIREBASE_CONFIG, BUILTIN_FIREBASE_CONFIG_RAW,
} from '../lib/cloudSync';

function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)' }}>
      {label}
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{ position: 'absolute', right: 10, top: 9, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--kumo-text-soft)', padding: 0 }}
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

function friendlyAuthError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked. Allow pop-ups for this site and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled yet. Try another option.';
    default:
      return code ? `Something went wrong (${code}).` : 'Something went wrong. Please try again.';
  }
}

/**
 * Consumer-facing sign-in modal.
 * Firebase is pre-configured — users never see config, setup guides, or developer jargon.
 */
export default function AuthModal({ onConnected, onClose }) {
  const [mode, setMode] = useState('login'); // login | register | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const config = BUILTIN_FIREBASE_CONFIG;
  const configRaw = BUILTIN_FIREBASE_CONFIG_RAW;

  const finish = (user) => {
    onConnected({ user, config, configRaw });
  };

  const handleGoogle = async () => {
    setBusy(true); setErr('');
    try {
      const user = await loginWithGoogle(config);
      finish(user);
    } catch (e) {
      setErr(friendlyAuthError(e.code) || e.message);
    } finally { setBusy(false); }
  };

  const handleLogin = async () => {
    if (!email || !password) { setErr('Enter your email and password.'); return; }
    setBusy(true); setErr('');
    try {
      const user = await loginUser(config, email, password);
      finish(user);
    } catch (e) {
      setErr(friendlyAuthError(e.code));
    } finally { setBusy(false); }
  };

  const handleRegister = async () => {
    if (!email || !password) { setErr('Enter your email and a password.'); return; }
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    setBusy(true); setErr('');
    try {
      const user = await registerUser(config, email, password);
      finish(user);
    } catch (e) {
      setErr(friendlyAuthError(e.code));
    } finally { setBusy(false); }
  };

  const handleReset = async () => {
    if (!email) { setErr('Enter your email address.'); return; }
    setBusy(true); setErr('');
    try {
      await sendReset(config, email);
      setResetSent(true);
    } catch (e) {
      setErr(friendlyAuthError(e.code));
    } finally { setBusy(false); }
  };

  return (
    <Modal title={mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset password' : 'Sign in to Kumo'} onClose={onClose} width={420}>
      {mode === 'login' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--kumo-text-soft)', lineHeight: 1.6 }}>
            Sign in to sync your trips across phone, tablet, and computer. Your data stays private to your account.
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '12px 16px', borderRadius: 14, cursor: busy ? 'wait' : 'pointer',
              background: '#fff', color: '#1C1917', border: '1.5px solid #E7E5E4',
              fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: 14.5,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {busy ? 'Signing in…' : 'Continue with Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#E7E5E4' }} />
            <span style={{ fontSize: 12, color: 'var(--kumo-text-soft)', fontWeight: 700 }}>or email</span>
            <div style={{ flex: 1, height: 1, background: '#E7E5E4' }} />
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)' }}>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} autoComplete="email" />
          </label>
          <PasswordInput label="Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />

          {err && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#C75C4A' }}>
              <TriangleAlert size={14} /> {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn icon={busy ? LoaderCircle : LogIn} onClick={handleLogin} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Btn>
            <Btn variant="secondary" icon={UserPlus} onClick={() => { setErr(''); setMode('register'); }}>
              Create account
            </Btn>
          </div>

          <button
            type="button"
            onClick={() => { setErr(''); setResetSent(false); setMode('reset'); }}
            style={{ border: 'none', background: 'none', color: 'var(--kumo-primary-text)', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', padding: 0, alignSelf: 'flex-start' }}
          >
            Forgot password?
          </button>
        </div>
      )}

      {mode === 'register' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--kumo-text-soft)', lineHeight: 1.6 }}>
            Create an account so your trips sync across all your devices.
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '12px 16px', borderRadius: 14, cursor: busy ? 'wait' : 'pointer',
              background: '#fff', color: '#1C1917', border: '1.5px solid #E7E5E4',
              fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: 14.5,
            }}
          >
            {busy ? 'Signing in…' : 'Continue with Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: '#E7E5E4' }} />
            <span style={{ fontSize: 12, color: 'var(--kumo-text-soft)', fontWeight: 700 }}>or email</span>
            <div style={{ flex: 1, height: 1, background: '#E7E5E4' }} />
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)' }}>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} autoComplete="email" />
          </label>
          <PasswordInput label="Password (at least 6 characters)" value={password} onChange={e => setPassword(e.target.value)} placeholder="Choose a password" />

          {err && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#C75C4A' }}>
              <TriangleAlert size={14} /> {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn icon={busy ? LoaderCircle : UserPlus} onClick={handleRegister} disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </Btn>
            <Btn variant="ghost" onClick={() => { setErr(''); setMode('login'); }}>Back to sign in</Btn>
          </div>
        </div>
      )}

      {mode === 'reset' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {resetSent ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, color: '#3F8C7E', marginBottom: 8 }}>
                <CircleCheck size={20} /> Email sent
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--kumo-text-soft)', margin: '0 0 12px', lineHeight: 1.6 }}>
                Check <strong>{email}</strong> for a reset link. It may take a minute to arrive.
              </p>
              <Btn onClick={() => { setResetSent(false); setMode('login'); }}>Back to sign in</Btn>
            </div>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--kumo-text-soft)', lineHeight: 1.6 }}>
                Enter your email and we’ll send a link to reset your password.
              </p>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)' }}>
                Email
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
              </label>
              {err && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#C75C4A' }}>
                  <TriangleAlert size={14} /> {err}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Btn icon={busy ? LoaderCircle : Mail} onClick={handleReset} disabled={busy}>
                  {busy ? 'Sending…' : 'Send reset email'}
                </Btn>
                <Btn variant="ghost" onClick={() => { setErr(''); setMode('login'); }}>Back</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
