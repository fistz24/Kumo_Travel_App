// Shared, theme-aware UI primitives used across all pages
import React from 'react';
import { X, ArrowLeft, Star } from 'lucide-react';

// ---------- Shared UI Primitives ----------

export const IconBtn = ({ icon: Icon, onClick, label, active, danger, size = 18 }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 40, height: 40, borderRadius: 12, border: 'none',
      background: active ? 'var(--kumo-soft)' : 'transparent',
      color: danger ? '#C75C4A' : 'var(--kumo-text)',
      cursor: 'pointer', transition: 'background 0.15s, transform 0.1s', flexShrink: 0,
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--kumo-soft)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)'; }}
    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
  >
    <Icon size={size} />
  </button>
);

export const Card = ({ children, style, onClick, className }) => (
  <div
    className={className}
    onClick={onClick}
    style={{
      background: '#fff', borderRadius: 24, padding: '16px 20px',
      boxShadow: '0 4px 24px -4px rgba(28,25,23,0.08)',
      border: '1px solid rgba(28,25,23,0.04)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      ...style,
    }}
    onMouseEnter={onClick ? (e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px -4px rgba(28,25,23,0.12)'; }) : undefined}
    onMouseLeave={onClick ? (e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px -4px rgba(28,25,23,0.08)'; }) : undefined}
  >
    {children}
  </div>
);

export const Btn = ({ children, onClick, variant = 'primary', size = 'md', icon: Icon, style, type = 'button', disabled }) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    border: 'none', borderRadius: 14, cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'Nunito, sans-serif', fontWeight: 700,
    fontSize: size === 'sm' ? 13 : 14.5,
    padding: size === 'sm' ? '8px 14px' : '11px 20px',
    transition: 'opacity 0.15s, transform 0.12s, box-shadow 0.12s',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    boxShadow: 'none',
  };
  const variants = {
    primary: { background: 'var(--kumo-primary)', color: '#fff', boxShadow: '0 2px 12px -2px rgba(91,141,239,0.35)' },
    secondary: { background: 'var(--kumo-soft)', color: 'var(--kumo-text)' },
    ghost: { background: 'transparent', color: 'var(--kumo-text)' },
    danger: { background: '#FBEAE7', color: '#C75C4A' },
    outline: { background: 'transparent', color: 'var(--kumo-text)', border: '1.5px solid var(--kumo-soft)' },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

export const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', flex: 1, minWidth: 0 }}>
    {label}
    {children}
  </label>
);

export const inputStyle = {
  fontFamily: 'Nunito, sans-serif', fontSize: 14.5, fontWeight: 500,
  padding: '9px 12px', borderRadius: 12, border: '1.5px solid var(--kumo-soft)',
  outline: 'none', color: 'var(--kumo-text)', background: '#fff', width: '100%', boxSizing: 'border-box',
};

export const Input = ({ label, ...props }) => (
  <Field label={label}>
    <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />
  </Field>
);

export const TextArea = ({ label, ...props }) => (
  <Field label={label}>
    <textarea {...props} style={{ ...inputStyle, resize: 'vertical', minHeight: 70, ...(props.style || {}) }} />
  </Field>
);

export const Select = ({ label, children, ...props }) => (
  <Field label={label}>
    <select {...props} style={{ ...inputStyle, fontWeight: 600, ...(props.style || {}) }}>
      {children}
    </select>
  </Field>
);

export const Pill = ({ children, color, onClick, active, icon: Icon }) => (
  <span
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 12.5, fontWeight: 700, padding: '4px 11px', borderRadius: 999,
      background: active ? 'var(--kumo-primary)' : (color || 'var(--kumo-soft)'),
      color: active ? '#fff' : 'var(--kumo-text-soft)',
      cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap', userSelect: 'none',
    }}
  >
    {Icon && <Icon size={12} />}
    {children}
  </span>
);

export const StarRating = ({ value = 0, onChange, size = 18 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1,2,3,4,5].map(n => (
      <Star
        key={n}
        size={size}
        onClick={() => onChange && onChange(n === value ? 0 : n)}
        fill={n <= value ? '#F4A896' : 'none'}
        color={n <= value ? '#F4A896' : '#D9D2C7'}
        style={{ cursor: onChange ? 'pointer' : 'default' }}
      />
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--kumo-text-soft)' }}>
    <div style={{
      width: 72, height: 72, borderRadius: 24, background: 'var(--kumo-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
      boxShadow: '0 4px 16px rgba(127,168,217,0.12)',
    }}>
      <Icon size={30} color="var(--kumo-primary)" />
    </div>
    <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--kumo-text)', marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 14, lineHeight: 1.45, marginBottom: action ? 20 : 0, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>{subtitle}</div>
    {action}
  </div>
);

// Floating isometric decorative shapes for headers
export const FloatingShapes = () => {
  const shapes = [
    { x: 78, y: 18, r: 22, rot: 12, kind: 'rect' },
    { x: 92, y: 50, r: 16, rot: -10, kind: 'circle' },
    { x: 62, y: 75, r: 18, rot: 25, kind: 'rect' },
    { x: 18, y: 30, r: 14, rot: 8, kind: 'circle' },
  ];
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }}>
      {shapes.map((s, i) => (
        s.kind === 'circle' ? (
          <circle key={i} cx={s.x} cy={s.y} r={s.r / 2.2} fill="var(--kumo-accent)" opacity={0.35 - i * 0.05} />
        ) : (
          <rect key={i} x={s.x - s.r / 2} y={s.y - s.r / 2} width={s.r} height={s.r} rx={6}
            fill="var(--kumo-primary)" opacity={0.20 - i * 0.03}
            transform={`rotate(${s.rot} ${s.x} ${s.y})`} />
        )
      ))}
    </svg>
  );
};

// Modal
export const Modal = ({ title, onClose, children, width = 520 }) => (
  <div
    style={{
      position: 'fixed', inset: 0, background: 'rgba(40,35,30,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16, backdropFilter: 'blur(2px)',
    }}
    onClick={onClose}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: '#fff', borderRadius: 22, width: '100%', maxWidth: width,
        maxHeight: '88vh', overflowY: 'auto', padding: '1.5rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{title}</h3>
        <IconBtn icon={X} onClick={onClose} label="Close" />
      </div>
      {children}
    </div>
  </div>
);

export const PageHeader = ({ title, subtitle, action, back, onBack }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      {back && <div style={{ marginTop: 4 }}><IconBtn icon={ArrowLeft} onClick={onBack} label="Back" /></div>}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--kumo-text-soft)', fontSize: 13.5 }}>{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

export const ConfirmDialog = ({ title, message, onConfirm, onCancel }) => (
  <Modal title={title} onClose={onCancel} width={380}>
    <p style={{ fontSize: 14, color: 'var(--kumo-text-soft)', marginTop: 0 }}>{message}</p>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
      <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      <Btn variant="danger" onClick={onConfirm}>Delete</Btn>
    </div>
  </Modal>
);
