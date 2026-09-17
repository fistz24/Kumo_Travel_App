import React, { useState, useEffect, useRef } from 'react';

const STEPS = 6;

const POPULAR_COUNTRIES = [
  { id: 'Japan', flag: '🇯🇵' },
  { id: 'South Korea', flag: '🇰🇷' },
  { id: 'Thailand', flag: '🇹🇭' },
  { id: 'Indonesia', flag: '🇮🇩' },
  { id: 'Singapore', flag: '🇸🇬' },
  { id: 'Malaysia', flag: '🇲🇾' },
  { id: 'Vietnam', flag: '🇻🇳' },
  { id: 'Taiwan', flag: '🇹🇼' },
  { id: 'Philippines', flag: '🇵🇭' },
  { id: 'Australia', flag: '🇦🇺' },
  { id: 'New Zealand', flag: '🇳🇿' },
  { id: 'United States', flag: '🇺🇸' },
  { id: 'United Kingdom', flag: '🇬🇧' },
  { id: 'France', flag: '🇫🇷' },
  { id: 'Italy', flag: '🇮🇹' },
  { id: 'Spain', flag: '🇪🇸' },
  { id: 'Germany', flag: '🇩🇪' },
  { id: 'Netherlands', flag: '🇳🇱' },
  { id: 'Portugal', flag: '🇵🇹' },
  { id: 'Greece', flag: '🇬🇷' },
  { id: 'Turkey', flag: '🇹🇷' },
  { id: 'UAE', flag: '🇦🇪' },
  { id: 'India', flag: '🇮🇳' },
  { id: 'China', flag: '🇨🇳' },
  { id: 'Canada', flag: '🇨🇦' },
  { id: 'Mexico', flag: '🇲🇽' },
  { id: 'Brazil', flag: '🇧🇷' },
  { id: 'Morocco', flag: '🇲🇦' },
  { id: 'Egypt', flag: '🇪🇬' },
  { id: 'South Africa', flag: '🇿🇦' },
];

const TRAVEL_STYLES = [
  { id: 'weekend', label: 'Weekend getaways', sub: 'Short trips, quick plans' },
  { id: 'holiday', label: 'Long holidays', sub: 'Multi-city, more moving pieces' },
  { id: 'work', label: 'Work travel', sub: 'Receipts, bookings, repeat routes' },
  { id: 'mixed', label: 'A bit of everything', sub: "I'll figure it out as I go" },
];

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'var(--kumo-surface, #F3EEE6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Inter, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
  },
  phone: {
    width: '100%', maxWidth: 420, height: '100%', maxHeight: '100dvh',
    display: 'flex', flexDirection: 'column',
    background: 'var(--kumo-surface, #FDFAF6)',
  },
  top: {
    padding: '16px 18px 8px', display: 'flex', alignItems: 'center', gap: 10,
  },
  back: {
    width: 32, height: 32, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: 'var(--kumo-text-soft, #78716C)', fontSize: 20, cursor: 'pointer',
    border: 'none', background: 'transparent', flexShrink: 0,
  },
  progress: {
    flex: 1, height: 6, background: '#E7E0D6', borderRadius: 99, overflow: 'hidden',
  },
  progressBar: {
    display: 'block', height: '100%', background: 'var(--kumo-primary, #5B8DEF)',
    borderRadius: 99, transition: 'width 0.3s ease',
  },
  body: {
    flex: 1, padding: '8px 22px 24px', overflow: 'auto',
    display: 'flex', flexDirection: 'column',
  },
  hero: { textAlign: 'center', padding: '20px 0 12px' },
  heroLogo: {
    width: 'min(220px, 70%)', height: 'auto', margin: '0 auto 18px',
    display: 'block',
  },
  title: {
    fontSize: 26, fontWeight: 600, letterSpacing: '-0.4px', lineHeight: 1.25,
    marginBottom: 10, color: 'var(--kumo-text, #1C1917)',
    fontFamily: 'Outfit, Inter, system-ui, sans-serif',
  },
  desc: {
    fontSize: 14.5, color: 'var(--kumo-text-soft, #78716C)', lineHeight: 1.55,
    fontWeight: 400, maxWidth: 320, margin: '0 auto',
  },
  introRow: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 },
  mascot: {
    width: 44, height: 44, borderRadius: 14, background: 'var(--kumo-soft, #E8F0FC)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    overflow: 'hidden',
  },
  bubble: {
    background: '#fff', border: '1px solid #E7E0D6', borderRadius: 16,
    padding: '12px 14px', fontSize: 14, fontWeight: 500, lineHeight: 1.45,
    boxShadow: '0 2px 8px rgba(60,50,40,0.04)', flex: 1,
  },
  bubbleEm: { fontStyle: 'normal', color: 'var(--kumo-primary-text, #3F6FCB)', fontWeight: 600 },
  choices: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 },
  choice: {
    background: '#fff', border: '1.5px solid #E7E0D6', borderRadius: 16,
    padding: '14px 16px', fontWeight: 500, fontSize: 14.5,
    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
    textAlign: 'left', width: '100%', fontFamily: 'inherit', color: 'inherit',
    transition: 'border-color 0.15s, background 0.15s',
  },
  choiceSelected: {
    borderColor: 'var(--kumo-primary, #5B8DEF)',
    boxShadow: '0 0 0 1px var(--kumo-primary, #5B8DEF)',
    background: '#F7FAFF',
  },
  choiceSmall: { display: 'block', fontSize: 12.5, color: 'var(--kumo-text-soft, #78716C)', fontWeight: 400, marginTop: 2 },
  check: {
    marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%',
    background: 'var(--kumo-primary, #5B8DEF)', color: '#fff', fontSize: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0,
  },
  ring: {
    marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%',
    border: '2px solid #E7E0D6', flexShrink: 0,
  },
  feat: {
    background: '#fff', border: '1px solid #E7E0D6', borderRadius: 16,
    padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10,
  },
  featIcon: {
    width: 36, height: 36, borderRadius: 12, display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
  },
  featStrong: { fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 2 },
  featSpan: { fontSize: 12.5, color: 'var(--kumo-text-soft, #78716C)', fontWeight: 400, lineHeight: 1.4 },
  spacer: { flex: 1, minHeight: 12 },
  cta: {
    width: '100%', border: 'none', borderRadius: 999, padding: '14px 18px',
    background: 'var(--kumo-primary-text, #3F6FCB)', color: '#fff',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 15,
    cursor: 'pointer', transition: 'opacity 0.15s, transform 0.1s',
  },
  ctaSecondary: {
    width: '100%', border: 'none', borderRadius: 999, padding: '10px',
    background: 'transparent', color: 'var(--kumo-text-soft, #78716C)',
    fontFamily: 'inherit', fontWeight: 500, fontSize: 13.5, cursor: 'pointer',
  },
  ctaGoogle: {
    width: '100%', border: '1.5px solid #E7E0D6', borderRadius: 999, padding: '14px 18px',
    background: '#fff', color: 'var(--kumo-text, #1C1917)',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 15,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaDark: {
    width: '100%', border: 'none', borderRadius: 999, padding: '14px 18px',
    background: 'var(--kumo-text, #1C1917)', color: '#fff',
    fontFamily: 'inherit', fontWeight: 600, fontSize: 15, cursor: 'pointer',
  },
  note: {
    textAlign: 'center', fontSize: 12, color: 'var(--kumo-text-soft, #78716C)',
    fontWeight: 400, marginTop: 10,
  },
  countryGrid: {
    display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4,
    maxHeight: '42vh', overflowY: 'auto', paddingBottom: 4,
  },
  countryChip: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 12px', borderRadius: 999, border: '1.5px solid #E7E0D6',
    background: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'inherit', color: 'inherit', transition: 'all 0.15s',
  },
  countryChipOn: {
    borderColor: 'var(--kumo-primary, #5B8DEF)',
    background: '#F7FAFF',
    boxShadow: '0 0 0 1px var(--kumo-primary, #5B8DEF)',
  },
  starWrap: {
    position: 'relative', width: 120, height: 120, margin: '0 auto 16px',
  },
  starImg: {
    width: 120, height: 120, objectFit: 'contain',
    animation: 'kumoFloat 3s ease-in-out infinite, kumoGlow 2.4s ease-in-out infinite',
    filter: 'drop-shadow(0 8px 20px rgba(212, 168, 50, 0.35))',
  },
};

export default function Onboarding({ onComplete, onSignIn }) {
  const [step, setStep] = useState(0);
  const [travelStyle, setTravelStyle] = useState('weekend');
  const [countries, setCountries] = useState([]);
  const [customCountry, setCustomCountry] = useState('');
  const audioRef = useRef(null);
  const playedReady = useRef(false);

  useEffect(() => {
    audioRef.current = new Audio('/magic-chimes.mp3');
    audioRef.current.volume = 0.55;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (step === 5 && !playedReady.current && audioRef.current) {
      playedReady.current = true;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [step]);

  const toggleCountry = (id) => {
    setCountries(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const addCustom = () => {
    const name = customCountry.trim();
    if (!name) return;
    if (!countries.includes(name)) setCountries(prev => [...prev, name]);
    setCustomCountry('');
  };

  const finish = (openAuth = false) => {
    try {
      localStorage.setItem('kumo-onboarding-done', '1');
      if (travelStyle) localStorage.setItem('kumo-travel-style', travelStyle);
    } catch {}
    onComplete?.({ travelStyle, visitedCountries: countries });
    if (openAuth) onSignIn?.();
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const pct = ((step + 1) / STEPS) * 100;

  const CloudMascot = () => (
    <img
      src="/kumo-cloud.jpg"
      alt=""
      style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 12 }}
    />
  );

  return (
    <div style={styles.overlay}>
      <style>{`
        @keyframes kumoFloat {
          0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
          50% { transform: translateY(-10px) rotate(2deg) scale(1.04); }
        }
        @keyframes kumoGlow {
          0%, 100% { filter: drop-shadow(0 6px 16px rgba(212, 168, 50, 0.25)); }
          50% { filter: drop-shadow(0 10px 28px rgba(255, 200, 60, 0.55)); }
        }
        @keyframes kumoSparkle {
          0%, 100% { opacity: 0.35; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
      <div style={styles.phone}>
        <div style={styles.top}>
          {step > 0 ? (
            <button type="button" style={styles.back} onClick={back} aria-label="Back">‹</button>
          ) : (
            <div style={{ width: 32 }} />
          )}
          <div style={styles.progress}>
            <i style={{ ...styles.progressBar, width: `${pct}%` }} />
          </div>
        </div>

        <div style={styles.body}>
          {/* Step 0 · Welcome */}
          {step === 0 && (
            <>
              <div style={styles.hero}>
                <img src="/kumo-wordmark.png" alt="Kumo" style={styles.heroLogo} />
                <div style={styles.title}>Travel lighter<br />with Kumo</div>
                <div style={styles.desc}>
                  One place for your trips — plans, bookings, spending, and memories — so you spend less time switching apps.
                </div>
              </div>
              <div style={styles.spacer} />
              <button type="button" style={styles.cta} onClick={next}>Continue</button>
              <div style={styles.note}>Takes about a minute</div>
            </>
          )}

          {/* Step 1 · Countries visited (first personalization) */}
          {step === 1 && (
            <>
              <div style={styles.introRow}>
                <div style={styles.mascot}><CloudMascot /></div>
                <div style={styles.bubble}>
                  Which countries have you <span style={styles.bubbleEm}>already visited</span>? We’ll stamp them in your Passport.
                </div>
              </div>
              <div style={styles.countryGrid}>
                {POPULAR_COUNTRIES.map(c => {
                  const on = countries.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      style={{ ...styles.countryChip, ...(on ? styles.countryChipOn : {}) }}
                      onClick={() => toggleCountry(c.id)}
                    >
                      <span>{c.flag}</span> {c.id}
                    </button>
                  );
                })}
                {countries.filter(c => !POPULAR_COUNTRIES.some(p => p.id === c)).map(c => (
                  <button
                    key={c}
                    type="button"
                    style={{ ...styles.countryChip, ...styles.countryChipOn }}
                    onClick={() => toggleCountry(c)}
                  >
                    📍 {c}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  value={customCountry}
                  onChange={e => setCustomCountry(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                  placeholder="Other country…"
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 999, border: '1.5px solid #E7E0D6',
                    fontFamily: 'inherit', fontSize: 14, outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={addCustom}
                  style={{
                    padding: '10px 16px', borderRadius: 999, border: 'none',
                    background: 'var(--kumo-soft, #E8F0FC)', color: 'var(--kumo-primary-text)',
                    fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Add
                </button>
              </div>
              <div style={styles.spacer} />
              <button type="button" style={styles.cta} onClick={next}>
                {countries.length > 0 ? `Continue · ${countries.length} selected` : 'Skip for now'}
              </button>
            </>
          )}

          {/* Step 2 · The problem */}
          {step === 2 && (
            <>
              <div style={styles.introRow}>
                <div style={styles.mascot}><CloudMascot /></div>
                <div style={styles.bubble}>
                  Sound familiar? Travel info usually lives in <span style={styles.bubbleEm}>five different apps</span>.
                </div>
              </div>
              <div style={styles.choices}>
                <div style={styles.choice}>📧 Confirmations buried in email</div>
                <div style={styles.choice}>📑 Tickets in random PDFs</div>
                <div style={styles.choice}>💸 Expenses in a separate sheet</div>
                <div style={styles.choice}>📷 Photos lost in the camera roll</div>
              </div>
              <div style={styles.spacer} />
              <button type="button" style={styles.cta} onClick={next}>That’s me</button>
            </>
          )}

          {/* Step 3 · What Kumo does */}
          {step === 3 && (
            <>
              <div style={styles.introRow}>
                <div style={styles.mascot}><CloudMascot /></div>
                <div style={styles.bubble}>
                  Kumo keeps the whole trip in <span style={styles.bubbleEm}>one workspace</span>.
                </div>
              </div>
              <div style={styles.feat}>
                <div style={{ ...styles.featIcon, background: '#F0EAF8' }}>🏨</div>
                <div>
                  <strong style={styles.featStrong}>Documents</strong>
                  <span style={styles.featSpan}>Hotels, tickets, reservations — ready when you need them</span>
                </div>
              </div>
              <div style={styles.feat}>
                <div style={{ ...styles.featIcon, background: '#E8F5F0' }}>¥</div>
                <div>
                  <strong style={styles.featStrong}>Expenses</strong>
                  <span style={styles.featSpan}>Track spend inside the trip, not in another app</span>
                </div>
              </div>
              <div style={styles.feat}>
                <div style={{ ...styles.featIcon, background: '#FEF3E8' }}>📷</div>
                <div>
                  <strong style={styles.featStrong}>Memories</strong>
                  <span style={styles.featSpan}>Places, ratings, and notes you can find later</span>
                </div>
              </div>
              <div style={styles.spacer} />
              <button type="button" style={styles.cta} onClick={next}>Show me around</button>
            </>
          )}

          {/* Step 4 · Travel style */}
          {step === 4 && (
            <>
              <div style={styles.introRow}>
                <div style={styles.mascot}><CloudMascot /></div>
                <div style={styles.bubble}>What are you usually planning for?</div>
              </div>
              <div style={styles.choices}>
                {TRAVEL_STYLES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    style={{
                      ...styles.choice,
                      ...(travelStyle === s.id ? styles.choiceSelected : {}),
                    }}
                    onClick={() => setTravelStyle(s.id)}
                  >
                    <div>
                      {s.label}
                      <small style={styles.choiceSmall}>{s.sub}</small>
                    </div>
                    {travelStyle === s.id ? <div style={styles.check}>✓</div> : <div style={styles.ring} />}
                  </button>
                ))}
              </div>
              <div style={styles.spacer} />
              <button type="button" style={styles.cta} onClick={next}>Continue</button>
            </>
          )}

          {/* Step 5 · You're ready */}
          {step === 5 && (
            <>
              <div style={{ ...styles.hero, paddingTop: 20 }}>
                <div style={styles.starWrap}>
                  <img src="/star-happy.gif" alt="" style={styles.starImg} />
                  {/* brush-style sparkles around the star */}
                  <span style={{
                    position: 'absolute', top: 4, left: 8, fontSize: 14, opacity: 0.7,
                    animation: 'kumoSparkle 2s ease-in-out infinite',
                    color: '#C4A574',
                  }}>✦</span>
                  <span style={{
                    position: 'absolute', top: 12, right: 4, fontSize: 11, opacity: 0.6,
                    animation: 'kumoSparkle 2.4s ease-in-out 0.4s infinite',
                    color: '#D4A850',
                  }}>✧</span>
                  <span style={{
                    position: 'absolute', bottom: 10, left: 2, fontSize: 12, opacity: 0.55,
                    animation: 'kumoSparkle 2.2s ease-in-out 0.8s infinite',
                    color: '#E8C060',
                  }}>✦</span>
                  <span style={{
                    position: 'absolute', bottom: 18, right: 10, fontSize: 10, opacity: 0.5,
                    animation: 'kumoSparkle 2.6s ease-in-out 0.2s infinite',
                    color: '#C4A574',
                  }}>✧</span>
                </div>
                <div style={styles.title}>You’re ready</div>
                <div style={styles.desc}>
                  {countries.length > 0
                    ? `${countries.length} stamp${countries.length === 1 ? '' : 's'} waiting in your Passport. Create a free account to sync trips across devices, or skip and explore on this device.`
                    : 'Create a free account to sync trips across devices. Or skip and start exploring on this device.'}
                </div>
              </div>
              <div style={styles.spacer} />
              <button
                type="button"
                style={styles.cta}
                onClick={() => finish(true)}
              >
                Sign in with email
              </button>
              <button type="button" style={styles.ctaSecondary} onClick={() => finish(false)}>
                Skip for now →
              </button>
              <div style={styles.note}>You can always sign in later from Account</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
