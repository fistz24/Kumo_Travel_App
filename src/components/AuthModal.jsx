import React, { useState } from 'react';
import {
  Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Cloud,
  CircleCheck, TriangleAlert, LoaderCircle, ExternalLink, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Modal, Btn, inputStyle } from './ui';
import {
  parseFirebaseConfig, loginUser, registerUser, sendReset,
} from '../lib/cloudSync';

/* ─────────────────────────────────────────────────────────────────
   Step-by-step Firebase setup guide (inline, collapsible)
───────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    title: 'Create a free Firebase project',
    content: (
      <div>
        <p>Firebase is Google's free backend service. Kumo uses it only to store your trip data securely.</p>
        <ol>
          <li>Open <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--kumo-primary-text)', fontWeight: 700 }}>console.firebase.google.com <ExternalLink size={11} style={{ verticalAlign: -1 }} /></a> in a new tab.</li>
          <li>Click <strong>Add project</strong>.</li>
          <li>Enter any name (e.g. <em>my-kumo-app</em>). Google Analytics is optional — you can turn it off.</li>
          <li>Click <strong>Create project</strong> and wait ~30 seconds for it to finish.</li>
        </ol>
        <div style={tipStyle}>💡 The free "Spark" plan is enough. No credit card is needed and the quotas are generous for personal use.</div>
      </div>
    ),
  },
  {
    title: 'Enable Email/Password sign-in',
    content: (
      <div>
        <ol>
          <li>In your Firebase project, click <strong>Authentication</strong> in the left sidebar (under "Build").</li>
          <li>Click <strong>Get started</strong>.</li>
          <li>Under "Sign-in providers", click <strong>Email/Password</strong>.</li>
          <li>Toggle <strong>Enable</strong> on. Leave "Email link" off. Click <strong>Save</strong>.</li>
        </ol>
        <div style={tipStyle}>✅ That's it for authentication — users can now sign up and log in with an email and password.</div>
      </div>
    ),
  },
  {
    title: 'Enable Firestore Database',
    content: (
      <div>
        <ol>
          <li>In the left sidebar, click <strong>Firestore Database</strong> (under "Build").</li>
          <li>Click <strong>Create database</strong>.</li>
          <li>Choose a region close to you (e.g. <em>europe-west</em> or <em>us-central</em>).</li>
          <li>Select <strong>Start in production mode</strong>, then click <strong>Enable</strong>.</li>
          <li>Now go to the <strong>Rules</strong> tab and replace everything with the rules below, then click <strong>Publish</strong>:</li>
        </ol>
        <pre style={codeStyle}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /kumo-users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}`}</pre>
        <div style={tipStyle}>🔒 These rules make sure each user can only see and edit their own data — nobody else's.</div>
      </div>
    ),
  },
  {
    title: 'Get your Firebase config and paste it below',
    content: (
      <div>
        <ol>
          <li>Click the <strong>gear icon ⚙</strong> next to "Project Overview" in the top-left, then <strong>Project settings</strong>.</li>
          <li>Scroll to "Your apps". If you don't see one, click the <strong>Web icon ( &lt;/&gt; )</strong> to register a web app. Give it any name and click <strong>Register app</strong>.</li>
          <li>You'll see a code block starting with <code>const firebaseConfig = {'{'} ... {'}'}</code>. Copy the entire object (everything between the outer curly braces, including the braces themselves).</li>
          <li>Paste it into the box below and click <strong>Connect</strong>.</li>
        </ol>
        <div style={tipStyle}>📋 The config contains only public identifiers — it's safe to paste here. It's stored in your browser only.</div>
      </div>
    ),
  },
];

const tipStyle = {
  background: 'var(--kumo-soft)', borderRadius: 10, padding: '8px 12px',
  fontSize: 12.5, marginTop: 10, lineHeight: 1.6,
};
const codeStyle = {
  background: 'var(--kumo-soft)', borderRadius: 10, padding: 12,
  fontSize: 11.5, overflowX: 'auto', lineHeight: 1.6, marginTop: 8,
};

function SetupGuide({ onDone }) {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Cloud size={15} color="var(--kumo-primary-text)" /> How to set up free cloud sync — step by step
      </div>
      {STEPS.map((step, i) => {
        const isOpen = open === i;
        const isDone = open > i;
        return (
          <div key={i} style={{ marginBottom: 8, border: '1.5px solid var(--kumo-soft)', borderRadius: 14, overflow: 'hidden' }}>
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', background: isOpen ? 'var(--kumo-soft)' : '#fff',
                border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Nunito, sans-serif',
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: isDone ? '#E3F2EE' : isOpen ? 'var(--kumo-primary)' : 'var(--kumo-soft)',
                color: isDone ? '#3F8C7E' : isOpen ? '#fff' : 'var(--kumo-text-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800,
              }}>
                {isDone ? <CircleCheck size={14} /> : i + 1}
              </div>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>Step {i + 1}: {step.title}</span>
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isOpen && (
              <div style={{ padding: '12px 16px', fontSize: 13, lineHeight: 1.7, color: 'var(--kumo-text-soft)' }}>
                {step.content}
                {i < STEPS.length - 1 && (
                  <div style={{ marginTop: 12 }}>
                    <Btn size="sm" onClick={() => setOpen(i + 1)}>Next: Step {i + 2} →</Btn>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Config entry + Auth form
───────────────────────────────────────────────────────────────── */

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
          placeholder={placeholder || ''}
          style={{ ...inputStyle, paddingRight: 38 }}
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

export default function AuthModal({ savedConfigRaw, onConnected, onClose }) {
  const [mode, setMode] = useState('intro'); // intro | setup | login | register | reset
  const [configRaw, setConfigRaw] = useState(savedConfigRaw || '');
  const [configSaved, setConfigSaved] = useState(!!parseFirebaseConfig(savedConfigRaw));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const config = parseFirebaseConfig(configRaw);
  const configValid = !!config;

  const handleConnect = () => {
    if (!configValid) { setErr('That doesn\'t look like a valid Firebase config. Make sure you copied the full object.'); return; }
    setConfigSaved(true);
    setErr('');
    setMode('login');
  };

  const handleLogin = async () => {
    if (!email || !password) { setErr('Enter your email and password.'); return; }
    setBusy(true); setErr('');
    try {
      const user = await loginUser(config, email, password);
      onConnected({ user, config, configRaw });
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
      onConnected({ user, config, configRaw });
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
    <Modal title="Sign in to sync your trips" onClose={onClose} width={580}>
      {/* ── INTRO ── */}
      {mode === 'intro' && (
        <div>
          <p style={{ fontSize: 14, color: 'var(--kumo-text-soft)', marginTop: 0, lineHeight: 1.7 }}>
            Kumo currently saves your trips only on this device. To access your data on any device — just sign in — you need to connect a free Firebase account. It takes about 5 minutes, costs nothing, and no credit card is needed.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <Btn icon={LogIn} onClick={() => setMode(configSaved ? 'login' : 'setup')}>
              {configSaved ? 'Sign in' : 'Get started'}
            </Btn>
            {!configSaved && (
              <Btn variant="secondary" onClick={() => setMode('setup')}>
                View setup guide first
              </Btn>
            )}
          </div>
          <div style={{ background: 'var(--kumo-soft)', borderRadius: 14, padding: '12px 16px', fontSize: 13, lineHeight: 1.7, color: 'var(--kumo-text-soft)' }}>
            <strong style={{ color: 'var(--kumo-text)' }}>Why Firebase?</strong> It's the only completely free option that supports real user accounts with a secure login. Your Kumo data is stored in <em>your own</em> Firebase project — Kumo never sees it and has no server of its own.
          </div>
        </div>
      )}

      {/* ── SETUP GUIDE ── */}
      {mode === 'setup' && (
        <div>
          <SetupGuide />
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              Step 4: Paste your Firebase config here
              <textarea
                value={configRaw}
                onChange={e => { setConfigRaw(e.target.value); setErr(''); }}
                placeholder={'{\n  "apiKey": "AIza...",\n  "authDomain": "my-project.firebaseapp.com",\n  "projectId": "my-project",\n  "storageBucket": "my-project.appspot.com",\n  "messagingSenderId": "123456789",\n  "appId": "1:123:web:abc"\n}'}
                style={{ ...inputStyle, minHeight: 120, fontFamily: 'monospace', fontSize: 12, marginTop: 4 }}
              />
            </label>
            {configRaw && !configValid && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#C75C4A', marginTop: 6 }}>
                <TriangleAlert size={14} /> This doesn't look like a valid config yet — make sure you copied the full <code>{'{ ... }'}</code> object.
              </div>
            )}
            {err && <div style={{ color: '#C75C4A', fontSize: 13, marginTop: 8 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Btn icon={CircleCheck} onClick={handleConnect} disabled={!configValid}>Connect & continue</Btn>
              <Btn variant="ghost" onClick={() => setMode('intro')}>Back</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN ── */}
      {mode === 'login' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--kumo-text-soft)' }}>
            Sign in with the email and password you used when you set up Kumo sync.
          </p>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)' }}>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
          </label>
          <PasswordInput label="Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
          {err && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#C75C4A' }}>
              <TriangleAlert size={14} /> {err}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn icon={busy ? LoaderCircle : LogIn} onClick={handleLogin} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Btn>
            <Btn variant="secondary" icon={UserPlus} onClick={() => { setErr(''); setMode('register'); }}>Create account</Btn>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, flexWrap: 'wrap' }}>
            <button onClick={() => { setErr(''); setMode('reset'); }} style={{ border: 'none', background: 'none', color: 'var(--kumo-primary-text)', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'Nunito, sans-serif', padding: 0 }}>Forgot password?</button>
            <button onClick={() => setMode('setup')} style={{ border: 'none', background: 'none', color: 'var(--kumo-text-soft)', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'Nunito, sans-serif', padding: 0 }}>Change Firebase config</button>
          </div>
        </div>
      )}

      {/* ── REGISTER ── */}
      {mode === 'register' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--kumo-text-soft)' }}>
            Create a new account to start syncing your trips across devices.
          </p>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)' }}>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
          </label>
          <PasswordInput label="Password (at least 6 characters)" value={password} onChange={e => setPassword(e.target.value)} placeholder="Choose a strong password" />
          {err && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#C75C4A' }}>
              <TriangleAlert size={14} /> {err}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn icon={busy ? LoaderCircle : UserPlus} onClick={handleRegister} disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Btn>
            <Btn variant="ghost" onClick={() => { setErr(''); setMode('login'); }}>Back to sign in</Btn>
          </div>
        </div>
      )}

      {/* ── PASSWORD RESET ── */}
      {mode === 'reset' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {resetSent ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15, color: '#3F8C7E', marginBottom: 8 }}>
                <CircleCheck size={20} /> Email sent!
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--kumo-text-soft)', margin: '0 0 12px' }}>
                Check your inbox at <strong>{email}</strong> for a password reset link. It might take a minute to arrive.
              </p>
              <Btn onClick={() => { setResetSent(false); setMode('login'); }}>Back to sign in</Btn>
            </div>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--kumo-text-soft)' }}>
                Enter your email and we'll send you a link to reset your password.
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
                <Btn icon={busy ? LoaderCircle : Mail} onClick={handleReset} disabled={busy}>{busy ? 'Sending…' : 'Send reset email'}</Btn>
                <Btn variant="ghost" onClick={() => { setErr(''); setMode('login'); }}>Back</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

function friendlyAuthError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email or password is incorrect. Double-check and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'That doesn\'t look like a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute then try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in isn\'t enabled yet. In your Firebase console, go to Authentication → Sign-in providers → Email/Password and turn it on.';
    default:
      return `Something went wrong (${code || 'unknown'}). Check your Firebase config and try again.`;
  }
}
