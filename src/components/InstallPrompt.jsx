import React, { useState, useEffect } from 'react';

/**
 * Captures the browser's beforeinstallprompt event and shows a friendly
 * "Install Kumo" banner so users can put the app on their home screen.
 * On iOS (no beforeinstallprompt) we show Share → Add to Home Screen tips.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('kumo-install-dismissed') === '1'; } catch { return false; }
  });
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);
    if (standalone) setInstalled(true);

    const ua = window.navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      try { localStorage.setItem('kumo-install-dismissed', '1'); } catch {}
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('kumo-install-dismissed', '1'); } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice && choice.outcome === 'accepted') {
      setInstalled(true);
      try { localStorage.setItem('kumo-install-dismissed', '1'); } catch {}
    }
  };

  // Already running as installed app — nothing to show
  if (isStandalone || installed) return null;
  if (dismissed) return null;

  // Chrome/Edge/Android: we have a real install prompt
  if (deferred) {
    return (
      <div style={bannerStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Install Kumo</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', lineHeight: 1.4 }}>
            Add to your home screen — opens full-screen like a real app.
          </div>
        </div>
        <button type="button" onClick={install} style={primaryBtn}>Install</button>
        <button type="button" onClick={dismiss} style={ghostBtn} aria-label="Dismiss">✕</button>
      </div>
    );
  }

  // iOS Safari: no install API — show how-to once
  if (isIOS) {
    return (
      <div style={bannerStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Add Kumo to Home Screen</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', lineHeight: 1.45 }}>
            Tap <strong>Share</strong> <span style={{ opacity: 0.8 }}>□↑</span> then <strong>Add to Home Screen</strong>.
            It will open full-screen like an app.
          </div>
        </div>
        <button type="button" onClick={dismiss} style={ghostBtn} aria-label="Dismiss">✕</button>
      </div>
    );
  }

  return null;
}

const bannerStyle = {
  position: 'fixed',
  left: 12,
  right: 12,
  bottom: 'max(16px, env(safe-area-inset-bottom))',
  zIndex: 1500,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 14px',
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 12px 40px rgba(28,25,23,0.18)',
  border: '1px solid rgba(28,25,23,0.06)',
  fontFamily: 'Inter, system-ui, sans-serif',
  maxWidth: 420,
  margin: '0 auto',
};

const primaryBtn = {
  border: 'none',
  borderRadius: 999,
  padding: '9px 16px',
  background: 'var(--kumo-primary-text, #3F6FCB)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 13.5,
  cursor: 'pointer',
  fontFamily: 'inherit',
  flexShrink: 0,
};

const ghostBtn = {
  border: 'none',
  background: 'transparent',
  color: 'var(--kumo-text-soft, #78716C)',
  fontSize: 16,
  cursor: 'pointer',
  padding: '4px 6px',
  flexShrink: 0,
  fontFamily: 'inherit',
};
