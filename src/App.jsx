import React, { useState, useEffect, useRef } from 'react';
import {
  House, Calendar, MapPin, TrainFront, Wallet as WalletIcon,
  FolderOpen, Camera, BookOpen, Settings as SettingsIcon,
  Plus, X, ChevronRight, Search, Menu,
  Trash2, Pencil, Check, Clock, FileText, Download,
  ExternalLink, Sparkles, Tag, Ellipsis,
  Plane, Bed, Footprints, Compass, GripVertical, PiggyBank, Stamp, Copy, Upload,
  Cloud, RefreshCw, CircleCheck, TriangleAlert, LoaderCircle, LogIn
} from 'lucide-react';

import {
  PASTEL_THEMES, CURRENCIES, PLACE_CATEGORIES, PLACE_STATUSES, TRANSPORT_TYPES,
  DOC_CATEGORIES_DEFAULT, EXPENSE_CATEGORIES_DEFAULT, TRIP_STATUSES, MEMORY_TYPES,
  PAYMENT_METHODS, ACHIEVEMENTS,
} from './lib/constants';
import {
  uid, fmtDate, fmtDateShort, fmtWeekday, daysBetween,
  currencyFmt, todayISO,
} from './lib/utils';
import { useKumoData } from './lib/useKumoData';
import {
  IconBtn, Card, Btn, inputStyle, Input, TextArea, Select, Pill,
  StarRating, EmptyState, FloatingShapes, Modal, PageHeader, ConfirmDialog,
} from './components/ui';
import ImportWizard from './components/ImportWizard';
import {
  parseFirebaseConfig, pushToCloud, pullFromCloud, restoreAssets,
  logoutUser, subscribeToAuthState,
} from './lib/cloudSync';
import AuthModal from './components/AuthModal';
import Onboarding from './components/Onboarding';

/* ============================================================
   KUMO — Personal Travel Operating System
   ============================================================ */

// ============================================================
// NAVIGATION
// ============================================================

const NAV_ITEMS = [
  { id: 'trips', label: 'Trips', icon: House },
  { id: 'itinerary', label: 'Itinerary', icon: Calendar },
  { id: 'places', label: 'Places', icon: MapPin },
  { id: 'stays', label: 'Stays', icon: Bed },
  { id: 'transport', label: 'Transport', icon: TrainFront },
  { id: 'routes', label: 'Routes', icon: Compass },
  { id: 'finances', label: 'Finances', icon: PiggyBank },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'memories', label: 'Memories', icon: Camera },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'passport', label: 'Passport', icon: Stamp },
  { id: 'settings', label: 'Account', icon: SettingsIcon },
];

// Mobile bottom nav shows a curated subset; rest reachable via "More"
const MOBILE_PRIMARY = ['trips', 'itinerary', 'places', 'finances', 'memories'];

function Sidebar({ active, onNavigate, tripName, user, onSignIn }) {
  return (
    <div style={{
      width: 230, flexShrink: 0, background: '#fff', borderRight: '1px solid rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column', padding: '1.25rem 0.85rem', height: '100vh',
      position: 'sticky', top: 0,
    }}>
      <div style={{ padding: '0 0.5rem', marginBottom: 24 }}>
        <img
          src="/kumo-wordmark.png"
          alt="Kumo"
          style={{
            height: 28, width: 'auto', maxWidth: '100%', objectFit: 'contain',
            display: 'block', marginBottom: 4,
          }}
        />
        <div style={{ fontSize: 11, color: 'var(--kumo-text-soft)', fontWeight: 500 }}>{tripName || 'No trip selected'}</div>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: isActive ? 'var(--kumo-soft)' : 'transparent',
                color: isActive ? 'var(--kumo-primary-text)' : 'var(--kumo-text)',
                fontFamily: 'Inter, system-ui, sans-serif', fontWeight: isActive ? 800 : 600, fontSize: 14.5,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.025)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon size={19} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div style={{ borderTop: '1px solid var(--kumo-soft)', paddingTop: 12, marginTop: 8 }}>
        {user ? (
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            title="Account settings"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
              borderRadius: 12, background: 'var(--kumo-soft)', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'left',
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--kumo-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 12 }}>{(user.email || '?')[0].toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--kumo-text)' }}>{user.email}</div>
              <div style={{ fontSize: 10.5, color: '#3F8C7E', fontWeight: 700 }}>Account · Synced</div>
            </div>
          </button>
        ) : (
          <button onClick={onSignIn} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
            borderRadius: 14, border: '1.5px dashed var(--kumo-soft)', background: 'transparent',
            cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: 13.5,
            color: 'var(--kumo-text-soft)', textAlign: 'left',
          }}>
            <LogIn size={16} /> Sign in
          </button>
        )}
      </div>
    </div>
  );
}

function MobileTopBar({ title, onMenu, user, onAccount, onSignIn }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
      background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.04)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <img
        src="/logo-192.png"
        alt="Kumo"
        style={{
          width: 32, height: 32, borderRadius: 10, objectFit: 'cover',
          boxShadow: '0 1px 6px rgba(127,168,217,0.3)', flexShrink: 0,
          background: 'var(--kumo-soft)',
        }}
      />
      <div style={{ fontWeight: 600, fontSize: 16, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      {user ? (
        <button
          type="button"
          onClick={onAccount}
          aria-label="Account"
          style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--kumo-primary)', color: '#fff', fontWeight: 600, fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif', flexShrink: 0,
          }}
        >
          {(user.email || '?')[0].toUpperCase()}
        </button>
      ) : (
        <button
          type="button"
          onClick={onSignIn}
          style={{
            border: 'none', background: 'var(--kumo-soft)', color: 'var(--kumo-primary-text)',
            borderRadius: 999, padding: '7px 12px', fontWeight: 600, fontSize: 12.5,
            fontFamily: 'Inter, system-ui, sans-serif', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Sign in
        </button>
      )}
      <IconBtn icon={Menu} onClick={onMenu} label="More" />
    </div>
  );
}

function MobileBottomNav({ active, onNavigate, onMore }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-around',
      padding: '8px 4px calc(8px + env(safe-area-inset-bottom, 0px))', zIndex: 60,
      boxShadow: '0 -4px 20px rgba(60,50,40,0.04)',
    }}>
      {MOBILE_PRIMARY.map(id => {
        const item = NAV_ITEMS.find(n => n.id === id);
        const Icon = item.icon;
        const isActive = active === id;
        return (
          <button key={id} onClick={() => onNavigate(id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            border: 'none', background: 'transparent', cursor: 'pointer',
            padding: '6px 10px', minWidth: 56, minHeight: 48,
            color: isActive ? 'var(--kumo-primary-text)' : 'var(--kumo-text-soft)',
            fontFamily: 'Inter, system-ui, sans-serif', borderRadius: 14,
            transition: 'color 0.15s, background 0.15s',
          }}>
            <div style={{
              width: 40, height: 28, borderRadius: 14,
              background: isActive ? 'var(--kumo-soft)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}>
              <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: isActive ? 800 : 600 }}>{item.label}</span>
          </button>
        );
      })}
      <button onClick={onMore} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        border: 'none', background: 'transparent', cursor: 'pointer',
        padding: '6px 10px', minWidth: 56, minHeight: 48,
        color: 'var(--kumo-text-soft)', fontFamily: 'Inter, system-ui, sans-serif', borderRadius: 14,
      }}>
        <div style={{
          width: 40, height: 28, borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ellipsis size={20} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 600 }}>More</span>
      </button>
    </div>
  );
}

function MoreMenu({ active, onNavigate, onClose, user, onSignIn }) {
  const rest = NAV_ITEMS.filter(n => !MOBILE_PRIMARY.includes(n.id) && n.id !== 'settings');
  return (
    <Modal title="More" onClose={onClose} width={360}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Account always first and obvious */}
        <button
          type="button"
          onClick={() => {
            if (user) { onNavigate('settings'); onClose(); }
            else { onClose(); onSignIn(); }
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
            borderRadius: 16, border: '1.5px solid var(--kumo-soft)', cursor: 'pointer',
            textAlign: 'left', background: 'var(--kumo-soft)', marginBottom: 8,
            color: 'var(--kumo-text)', fontFamily: 'Inter, system-ui, sans-serif', width: '100%',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: user ? 'var(--kumo-primary)' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: user ? 'none' : '1.5px dashed var(--kumo-primary)',
          }}>
            {user ? (
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{(user.email || '?')[0].toUpperCase()}</span>
            ) : (
              <LogIn size={18} color="var(--kumo-primary-text)" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {user ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                <div style={{ fontSize: 12, color: '#3F8C7E', fontWeight: 700 }}>Account · Synced</div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>Sign in</div>
                <div style={{ fontSize: 12, color: 'var(--kumo-text-soft)', fontWeight: 600 }}>Sync trips across devices</div>
              </>
            )}
          </div>
        </button>

        {rest.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: isActive ? 'var(--kumo-soft)' : 'transparent',
                color: 'var(--kumo-text)', fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: isActive ? 800 : 600, fontSize: 15,
              }}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}

        {/* Settings / Account page also listed for signed-in users */}
        <button
          type="button"
          onClick={() => { onNavigate('settings'); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
            background: active === 'settings' ? 'var(--kumo-soft)' : 'transparent',
            color: 'var(--kumo-text)', fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: active === 'settings' ? 800 : 600, fontSize: 15,
          }}
        >
          <SettingsIcon size={20} />
          Account &amp; settings
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// TRIPS — list + create/edit + trip dashboard
// ============================================================

function TripFormModal({ trip, onSave, onClose, defaultCurrency }) {
  const [form, setForm] = useState(trip || {
    name: '', destination: '', startDate: '', endDate: '', description: '',
    status: 'Planning', coverPhoto: '', budget: '', currency: defaultCurrency || 'USD',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, id: trip ? trip.id : uid(), budget: Number(form.budget) || 0 });
  };

  return (
    <Modal title={trip ? 'Edit trip' : 'New trip'} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Trip name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Japan Autumn 2026" />
        <Input label="Destination" value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="Japan" />
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Start date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <Input label="End date" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
            {TRIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Budget" type="number" min="0" step="0.01" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="2500" />
          <Select label="Currency" value={form.currency} onChange={e => set('currency', e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <Input label="Cover photo URL (optional)" value={form.coverPhoto} onChange={e => set('coverPhoto', e.target.value)} placeholder="https://..." />
        <TextArea label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What's this trip about?" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" icon={Check}>{trip ? 'Save changes' : 'Create trip'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

const STATUS_COLORS = {
  Planning: { bg: '#E8EEF7', fg: '#4A6FA5' },
  Upcoming: { bg: '#F6E9D8', fg: '#A8763E' },
  Active: { bg: '#E3F2EE', fg: '#3F8C7E' },
  Completed: { bg: '#EFEAF7', fg: '#7264A8' },
  Archived: { bg: '#F1EFE8', fg: '#888780' },
};

function TripCard({ trip, onOpen, onEdit, onDelete }) {
  const nights = daysBetween(trip.startDate, trip.endDate);
  const sc = STATUS_COLORS[trip.status] || STATUS_COLORS.Planning;
  return (
    <Card onClick={() => onOpen(trip.id)} style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        height: 96, position: 'relative', background: trip.coverPhoto
          ? `url(${trip.coverPhoto}) center/cover` : 'var(--kumo-soft)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 12,
      }}>
        {!trip.coverPhoto && <FloatingShapes />}
        <span style={{
          position: 'relative', zIndex: 1, fontSize: 12, fontWeight: 600, padding: '4px 11px',
          borderRadius: 999, background: sc.bg, color: sc.fg,
        }}>{trip.status}</span>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 4 }}>
          <IconBtn icon={Pencil} size={15} onClick={(e) => { e.stopPropagation(); onEdit(trip); }} label="Edit trip" />
          <IconBtn icon={Trash2} size={15} danger onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }} label="Delete trip" />
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: 16.5, marginBottom: 2 }}>{trip.name}</div>
        <div style={{ fontSize: 13, color: 'var(--kumo-text-soft)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
          <MapPin size={13} /> {trip.destination || 'No destination set'}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Calendar size={13} />
          {trip.startDate ? `${fmtDateShort(trip.startDate)} – ${fmtDateShort(trip.endDate)}` : 'Dates not set'}
          {nights > 0 && ` · ${nights} ${nights === 1 ? 'night' : 'nights'}`}
        </div>
      </div>
    </Card>
  );
}

function TripsListPage({ data, setData, onOpenTrip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filter, setFilter] = useState('All');

  const trips = data.trips;
  const filtered = filter === 'All' ? trips : trips.filter(t => t.status === filter);

  const saveTrip = (trip) => {
    setData(d => {
      const exists = d.trips.some(t => t.id === trip.id);
      return { ...d, trips: exists ? d.trips.map(t => t.id === trip.id ? trip : t) : [...d.trips, trip] };
    });
    setShowForm(false);
    setEditing(null);
  };

  const deleteTrip = (id) => {
    setData(d => ({
      ...d,
      trips: d.trips.filter(t => t.id !== id),
      itineraryDays: d.itineraryDays.filter(x => x.tripId !== id),
      activities: d.activities.filter(a => !d.itineraryDays.some(day => day.id === a.dayId && day.tripId === id) ? true : !(d.itineraryDays.find(day=>day.id===a.dayId)?.tripId===id)),
      places: d.places.filter(x => x.tripId !== id),
      hotels: d.hotels.filter(x => x.tripId !== id),
      transport: d.transport.filter(x => x.tripId !== id),
      routes: d.routes.filter(x => x.tripId !== id),
      documents: d.documents.filter(x => x.tripId !== id),
      expenses: d.expenses.filter(x => x.tripId !== id),
      memories: d.memories.filter(x => x.tripId !== id),
      futureNotes: d.futureNotes.filter(x => x.tripId !== id),
    }));
    setConfirmDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Your trips"
        subtitle={`${trips.length} trip${trips.length === 1 ? '' : 's'} in your archive`}
        action={<Btn icon={Plus} onClick={() => setShowForm(true)}>New trip</Btn>}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {['All', ...TRIP_STATUSES].map(s => (
          <Pill key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</Pill>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={House} title="No trips yet"
          subtitle="Create your first trip to start planning, capturing, and remembering."
          action={<Btn icon={Plus} onClick={() => setShowForm(true)}>Create a trip</Btn>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map(trip => (
            <TripCard key={trip.id} trip={trip} onOpen={onOpenTrip}
              onEdit={(t) => { setEditing(t); setShowForm(true); }}
              onDelete={(id) => setConfirmDelete(id)} />
          ))}
        </div>
      )}
      {showForm && (
        <TripFormModal
          trip={editing}
          defaultCurrency={data.settings.defaultCurrency}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={saveTrip}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete trip?"
          message="This removes the trip and everything in it — itinerary, places, expenses, memories, and documents. This can't be undone."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteTrip(confirmDelete)}
        />
      )}
    </div>
  );
}

// ---------- Trip Dashboard (when a trip is selected) ----------

function TripDashboard({ data, setData, trip, onNavigate, onImport }) {
  const days = data.itineraryDays.filter(d => d.tripId === trip.id).sort((a,b) => a.date.localeCompare(b.date));
  const places = data.places.filter(p => p.tripId === trip.id);
  const memories = data.memories.filter(m => m.tripId === trip.id);
  const expenses = data.expenses.filter(e => e.tripId === trip.id);
  const hotels = data.hotels.filter(h => h.tripId === trip.id);
  const transport = data.transport.filter(t => t.tripId === trip.id);

  const today = todayISO();
  const daysUntil = trip.startDate ? daysBetween(today, trip.startDate) : null;
  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalPlanned = expenses.filter(e => e.planned).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const budgetPct = trip.budget > 0 ? Math.min(100, Math.round((totalSpent / trip.budget) * 100)) : 0;

  const citiesVisited = [...new Set(days.map(d => d.city).filter(Boolean))];
  const completedDays = days.filter(d => d.completed).length;
  const tripProgress = days.length ? Math.round((completedDays / days.length) * 100) : 0;

  // upcoming reservations: hotels + transport with dates >= today, sorted
  const upcoming = [
    ...hotels.map(h => ({ kind: 'Hotel', label: h.name, date: h.checkIn, icon: Bed })),
    ...transport.map(t => ({ kind: t.type, label: `${t.departure} → ${t.arrival}`, date: t.date, icon: t.type === 'Flight' ? Plane : TrainFront })),
  ].filter(r => r.date >= today).sort((a,b) => a.date.localeCompare(b.date)).slice(0, 4);

  const recentMemories = [...memories].sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0, 3);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Btn variant="secondary" size="sm" icon={Upload} onClick={onImport}>Import from Excel</Btn>
      </div>
      <div style={{
        position: 'relative', borderRadius: 22, padding: '22px 24px', marginBottom: 20,
        background: trip.coverPhoto ? `linear-gradient(rgba(255,255,255,0.7),rgba(255,255,255,0.7)), url(${trip.coverPhoto}) center/cover` : 'var(--kumo-soft)',
        overflow: 'hidden',
      }}>
        {!trip.coverPhoto && <FloatingShapes />}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <Pill color={(STATUS_COLORS[trip.status]||{}).bg}>{trip.status}</Pill>
            {trip.destination && <Pill icon={MapPin}>{trip.destination}</Pill>}
          </div>
          <h1 style={{ margin: '4px 0 6px', fontSize: 28, fontWeight: 600, letterSpacing: -0.4 }}>{trip.name}</h1>
          <div style={{ fontSize: 14, color: 'var(--kumo-text-soft)', fontWeight: 600 }}>
            {trip.startDate ? `${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}` : 'Dates not set'}
          </div>
          {trip.description && <p style={{ maxWidth: 560, marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>{trip.description}</p>}
          {daysUntil !== null && daysUntil >= 0 && (
            <div style={{ marginTop: 10, fontWeight: 600, fontSize: 14, color: 'var(--kumo-primary-text)' }}>
              {daysUntil === 0 ? "Today's the day! ✈️" : `${daysUntil} day${daysUntil === 1 ? '' : 's'} until departure`}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <Card onClick={() => onNavigate('finances')}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Budget</div>
          <div style={{ fontSize: 21, fontWeight: 600 }}>{currencyFmt(totalSpent, trip.currency)}</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)' }}>of {currencyFmt(trip.budget, trip.currency)}</div>
          <div style={{ height: 6, background: 'var(--kumo-soft)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: `${budgetPct}%`, height: '100%', background: budgetPct > 90 ? '#E2A39A' : 'var(--kumo-primary)', borderRadius: 999 }} />
          </div>
        </Card>
        <Card onClick={() => onNavigate('itinerary')}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Cities</div>
          <div style={{ fontSize: 21, fontWeight: 600 }}>{citiesVisited.length}</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)' }}>{citiesVisited.join(', ') || 'No itinerary yet'}</div>
        </Card>
        <Card onClick={() => onNavigate('itinerary')}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Trip progress</div>
          <div style={{ fontSize: 21, fontWeight: 600 }}>{tripProgress}%</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)' }}>{completedDays} of {days.length} days planned</div>
        </Card>
        <Card onClick={() => onNavigate('places')}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Places saved</div>
          <div style={{ fontSize: 21, fontWeight: 600 }}>{places.length}</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)' }}>{places.filter(p=>p.status==='Visited').length} visited</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }} className="kumo-dash-grid">
        <Card>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={16} /> Upcoming reservations
          </div>
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 13.5, color: 'var(--kumo-text-soft)' }}>No upcoming reservations. Add hotels or transport to see them here.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.map((r, i) => {
                const Icon = r.icon;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--kumo-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color="var(--kumo-primary-text)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--kumo-text-soft)' }}>{r.kind} · {fmtDate(r.date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Camera size={16} /> Recent memories
          </div>
          {recentMemories.length === 0 ? (
            <div style={{ fontSize: 13.5, color: 'var(--kumo-text-soft)' }}>
              No memories yet. Once your trip starts, capture moments here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentMemories.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--kumo-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {m.photos && m.photos[0] ? <img src={m.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={15} color="var(--kumo-primary-text)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title || 'Untitled memory'}</div>
                    <div style={{ fontSize: 12, color: 'var(--kumo-text-soft)' }}>{fmtDate(m.date)}</div>
                  </div>
                  {m.rating > 0 && <StarRating value={m.rating} size={13} />}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <Btn variant="secondary" size="sm" onClick={() => onNavigate('memories')}>View all memories</Btn>
          </div>
        </Card>
      </div>

      <style>{`@media (max-width: 800px) { .kumo-dash-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

// ============================================================
// ITINERARY
// ============================================================

function DayFormModal({ day, tripId, onSave, onClose }) {
  const [form, setForm] = useState(day || { date: todayISO(), city: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.date) return;
    onSave({ ...form, id: day ? day.id : uid(), tripId, completed: day ? day.completed : false });
  };
  return (
    <Modal title={day ? 'Edit day' : 'Add day'} onClose={onClose} width={420}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Date" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
          <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Tokyo" />
        </div>
        <TextArea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Plans for the day..." />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" icon={Check}>Save</Btn>
        </div>
      </form>
    </Modal>
  );
}

function ActivityFormModal({ activity, dayId, places, onSave, onClose }) {
  const [form, setForm] = useState(activity || { time: '09:00', title: '', notes: '', placeId: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({ ...form, id: activity ? activity.id : uid(), dayId, completed: activity ? activity.completed : false });
  };
  return (
    <Modal title={activity ? 'Edit activity' : 'Add activity'} onClose={onClose} width={420}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Time" type="time" value={form.time} onChange={e => set('time', e.target.value)} style={{ maxWidth: 130 }} />
          <Input label="Activity" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Visit Senso-ji Temple" />
        </div>
        {places.length > 0 && (
          <Select label="Link to a saved place (optional)" value={form.placeId || ''} onChange={e => set('placeId', e.target.value)}>
            <option value="">None</option>
            {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}
        <TextArea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional details" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" icon={Check}>Save</Btn>
        </div>
      </form>
    </Modal>
  );
}

function ActivityRow({ activity, place, onToggle, onEdit, onDelete, dragHandleProps }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 4px',
      borderRadius: 10, opacity: activity.completed ? 0.55 : 1,
    }}>
      <div {...dragHandleProps} style={{ cursor: 'grab', color: 'var(--kumo-text-soft)', marginTop: 6 }}>
        <GripVertical size={15} />
      </div>
      <button onClick={() => onToggle(activity.id)} aria-label="Toggle complete" style={{
        width: 22, height: 22, borderRadius: 8, border: '1.5px solid var(--kumo-soft)',
        background: activity.completed ? 'var(--kumo-primary)' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        flexShrink: 0, marginTop: 3,
      }}>
        {activity.completed && <Check size={13} color="#fff" />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          {activity.time && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--kumo-primary-text)' }}>{activity.time}</span>}
          <span style={{ fontWeight: 700, fontSize: 14.5, textDecoration: activity.completed ? 'line-through' : 'none' }}>{activity.title}</span>
          {place && <Pill icon={MapPin}>{place.name}</Pill>}
        </div>
        {activity.notes && <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', marginTop: 2 }}>{activity.notes}</div>}
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        <IconBtn icon={Pencil} size={14} onClick={() => onEdit(activity)} label="Edit activity" />
        <IconBtn icon={Trash2} size={14} danger onClick={() => onDelete(activity.id)} label="Delete activity" />
      </div>
    </div>
  );
}

function DayCard({ day, activities, places, onUpdateDay, onDeleteDay, onAddActivity, onEditActivity, onDeleteActivity, onToggleActivity, onReorder }) {
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingDay, setEditingDay] = useState(false);
  const dragIndex = useRef(null);

  // Activities keep an explicit `order` once manually dragged; otherwise they
  // fall back to time-based sorting. Ordered activities always sort before
  // unordered ones, so newly-added activities land at the end rather than
  // jumping back to the top of a manually-arranged day.
  const orderKey = (a) => (a.order !== undefined && a.order !== null) ? a.order : Infinity;
  const sorted = [...activities].sort((a, b) => {
    const oa = orderKey(a), ob = orderKey(b);
    if (oa !== ob) return oa - ob;
    return (a.time||'').localeCompare(b.time||'');
  });

  const handleDrop = (toIndex) => {
    if (dragIndex.current === null || dragIndex.current === toIndex) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(toIndex, 0, moved);
    onReorder(day.id, reordered.map((a, i) => ({ ...a, order: i })));
    dragIndex.current = null;
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => onUpdateDay({ ...day, completed: !day.completed })}
            aria-label="Mark day complete"
            style={{
              width: 26, height: 26, borderRadius: 9, border: '1.5px solid var(--kumo-soft)',
              background: day.completed ? 'var(--kumo-primary)' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}>
            {day.completed && <Check size={15} color="#fff" />}
          </button>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15.5 }}>
              {fmtWeekday(day.date)}, {fmtDate(day.date)}
            </div>
            {day.city && <div style={{ fontSize: 12.5, color: 'var(--kumo-primary-text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{day.city}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconBtn icon={Pencil} size={15} onClick={() => setEditingDay(true)} label="Edit day" />
          <IconBtn icon={Trash2} size={15} danger onClick={() => onDeleteDay(day.id)} label="Delete day" />
        </div>
      </div>
      {day.notes && <div style={{ fontSize: 13, color: 'var(--kumo-text-soft)', marginBottom: 10, lineHeight: 1.5 }}>{day.notes}</div>}

      {sorted.length > 0 && (
        <div style={{ borderTop: '1px solid var(--kumo-soft)', paddingTop: 6, marginBottom: 6 }}>
          {sorted.map((a, i) => (
            <div
              key={a.id}
              draggable
              onDragStart={() => { dragIndex.current = i; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
            >
              <ActivityRow
                activity={a}
                place={places.find(p => p.id === a.placeId)}
                onToggle={onToggleActivity}
                onEdit={(act) => setEditingActivity(act)}
                onDelete={onDeleteActivity}
                dragHandleProps={{}}
              />
            </div>
          ))}
        </div>
      )}
      <Btn variant="secondary" size="sm" icon={Plus} onClick={() => setShowActivityForm(true)}>Add activity</Btn>

      {showActivityForm && (
        <ActivityFormModal
          dayId={day.id}
          places={places}
          onClose={() => setShowActivityForm(false)}
          onSave={(act) => { onAddActivity(act); setShowActivityForm(false); }}
        />
      )}
      {editingActivity && (
        <ActivityFormModal
          activity={editingActivity}
          dayId={day.id}
          places={places}
          onClose={() => setEditingActivity(null)}
          onSave={(act) => { onEditActivity(act); setEditingActivity(null); }}
        />
      )}
      {editingDay && (
        <DayFormModal
          day={day}
          tripId={day.tripId}
          onClose={() => setEditingDay(false)}
          onSave={(d) => { onUpdateDay(d); setEditingDay(false); }}
        />
      )}
    </Card>
  );
}

function ItineraryPage({ data, setData, trip }) {
  const [showDayForm, setShowDayForm] = useState(false);
  const [view, setView] = useState('timeline'); // timeline | calendar

  if (!trip) {
    return <EmptyState icon={Calendar} title="Select a trip" subtitle="Choose a trip from the Trips page to manage its itinerary." />;
  }

  const days = data.itineraryDays.filter(d => d.tripId === trip.id).sort((a,b) => a.date.localeCompare(b.date));
  const activitiesByDay = (dayId) => data.activities.filter(a => a.dayId === dayId);
  const places = data.places.filter(p => p.tripId === trip.id);

  const addDay = (day) => {
    setData(d => ({ ...d, itineraryDays: [...d.itineraryDays, day] }));
    setShowDayForm(false);
  };
  const updateDay = (day) => {
    setData(d => ({ ...d, itineraryDays: d.itineraryDays.map(x => x.id === day.id ? day : x) }));
  };
  const deleteDay = (id) => {
    setData(d => ({
      ...d,
      itineraryDays: d.itineraryDays.filter(x => x.id !== id),
      activities: d.activities.filter(a => a.dayId !== id),
    }));
  };
  const addActivity = (act) => setData(d => ({ ...d, activities: [...d.activities, act] }));
  const editActivity = (act) => setData(d => ({ ...d, activities: d.activities.map(a => a.id === act.id ? act : a) }));
  const deleteActivity = (id) => setData(d => ({ ...d, activities: d.activities.filter(a => a.id !== id) }));
  const toggleActivity = (id) => setData(d => ({ ...d, activities: d.activities.map(a => a.id === id ? { ...a, completed: !a.completed } : a) }));
  const reorderActivities = (dayId, reordered) => {
    setData(d => {
      const others = d.activities.filter(a => a.dayId !== dayId);
      return { ...d, activities: [...others, ...reordered] };
    });
  };

  return (
    <div>
      <PageHeader
        title="Itinerary"
        subtitle={`${trip.name} · ${days.length} day${days.length === 1 ? '' : 's'} planned`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant={view === 'timeline' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('timeline')}>Timeline</Btn>
            <Btn variant={view === 'calendar' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('calendar')}>Calendar</Btn>
            <Btn icon={Plus} onClick={() => setShowDayForm(true)}>Add day</Btn>
          </div>
        }
      />
      {days.length === 0 ? (
        <EmptyState icon={Calendar} title="No days planned yet"
          subtitle="Add days to build your day-by-day itinerary."
          action={<Btn icon={Plus} onClick={() => setShowDayForm(true)}>Add your first day</Btn>} />
      ) : view === 'timeline' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {days.map(day => (
            <DayCard
              key={day.id}
              day={day}
              activities={activitiesByDay(day.id)}
              places={places}
              onUpdateDay={updateDay}
              onDeleteDay={deleteDay}
              onAddActivity={addActivity}
              onEditActivity={editActivity}
              onDeleteActivity={deleteActivity}
              onToggleActivity={toggleActivity}
              onReorder={reorderActivities}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {days.map(day => {
            const acts = activitiesByDay(day.id);
            return (
              <Card key={day.id} style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kumo-primary-text)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{fmtWeekday(day.date)}</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{fmtDateShort(day.date)}</div>
                {day.city && <div style={{ fontSize: 12, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>{day.city}</div>}
                {acts.slice(0,3).map(a => (
                  <div key={a.id} style={{ fontSize: 11.5, padding: '2px 0', color: a.completed ? 'var(--kumo-text-soft)' : 'var(--kumo-text)', textDecoration: a.completed ? 'line-through' : 'none' }}>
                    {a.time && <span style={{ fontWeight: 700 }}>{a.time} </span>}{a.title}
                  </div>
                ))}
                {acts.length > 3 && <div style={{ fontSize: 11, color: 'var(--kumo-text-soft)' }}>+{acts.length - 3} more</div>}
                {day.completed && <Pill color="#E3F2EE">Done</Pill>}
              </Card>
            );
          })}
        </div>
      )}
      {showDayForm && <DayFormModal tripId={trip.id} onClose={() => setShowDayForm(false)} onSave={addDay} />}
    </div>
  );
}

// ============================================================
// PLACES
// ============================================================

const PLACE_STATUS_COLORS = {
  Wishlist: { bg: '#E8EEF7', fg: '#4A6FA5' },
  Planned: { bg: '#F6E9D8', fg: '#A8763E' },
  Visited: { bg: '#E3F2EE', fg: '#3F8C7E' },
  Skipped: { bg: '#F1EFE8', fg: '#888780' },
  Favorite: { bg: '#FBEAE7', fg: '#C75C4A' },
};

function PlaceFormModal({ place, tripId, categories, onSave, onClose, onAddCategory }) {
  const [form, setForm] = useState(place || {
    name: '', category: categories[0] || 'Other', customCategory: '', tags: [], notes: '',
    website: '', openingHours: '', priceRange: '', reservationRequired: false,
    reservationStatus: '', rating: 0, status: 'Wishlist', address: '', city: '', files: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [newCat, setNewCat] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };
  const removeTag = (t) => set('tags', form.tags.filter(x => x !== t));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, id: place ? place.id : uid(), tripId, rating: Number(form.rating) || 0 });
  };

  return (
    <Modal title={place ? 'Edit place' : 'Add place'} onClose={onClose} width={560}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ichiran Ramen Shibuya" />
        <div style={{ display: 'flex', gap: 10 }}>
          <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
            {PLACE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <Input label="Custom category (optional)" value={form.customCategory} onChange={e => set('customCategory', e.target.value)} placeholder="Ramen, Matcha Café, etc." />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Tokyo" />
          <Input label="Price range" value={form.priceRange} onChange={e => set('priceRange', e.target.value)} placeholder="$$" />
        </div>
        <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Shibuya, Tokyo" />
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
          <Input label="Opening hours" value={form.openingHours} onChange={e => set('openingHours', e.target.value)} placeholder="10:00 - 22:00" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {form.tags.map(t => (
              <Pill key={t} icon={Tag}>{t} <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTag(t)} /></Pill>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Add a tag and press Enter" style={inputStyle} />
            <Btn variant="secondary" size="sm" onClick={addTag} type="button">Add</Btn>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: 'var(--kumo-text-soft)' }}>
            <input type="checkbox" checked={form.reservationRequired} onChange={e => set('reservationRequired', e.target.checked)} />
            Reservation required
          </label>
          {form.reservationRequired && (
            <Input label="" value={form.reservationStatus} onChange={e => set('reservationStatus', e.target.value)} placeholder="e.g. Confirmed for 7pm" />
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Rating</div>
          <StarRating value={form.rating} onChange={v => set('rating', v)} />
        </div>
        <TextArea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Anything to remember about this place" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" icon={Check}>{place ? 'Save changes' : 'Add place'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function PlaceCard({ place, onEdit, onDelete, onStatusChange }) {
  const sc = PLACE_STATUS_COLORS[place.status] || PLACE_STATUS_COLORS.Wishlist;
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15.5, marginBottom: 2 }}>{place.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <Pill>{place.customCategory || place.category}</Pill>
            {place.city && <span><MapPin size={11} style={{ verticalAlign: -1 }} /> {place.city}</span>}
            {place.priceRange && <span>· {place.priceRange}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconBtn icon={Pencil} size={14} onClick={() => onEdit(place)} label="Edit place" />
          <IconBtn icon={Trash2} size={14} danger onClick={() => onDelete(place.id)} label="Delete place" />
        </div>
      </div>
      {place.address && <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', marginTop: 6 }}>{place.address}</div>}
      {place.openingHours && <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{place.openingHours}</div>}
      {place.notes && <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{place.notes}</div>}
      {place.tags && place.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
          {place.tags.map(t => <Pill key={t} icon={Tag}>{t}</Pill>)}
        </div>
      )}
      {place.reservationRequired && (
        <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: '#A8763E', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} /> Reservation: {place.reservationStatus || 'Required'}
        </div>
      )}
      {place.rating > 0 && <div style={{ marginTop: 8 }}><StarRating value={place.rating} size={14} /></div>}
      <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PLACE_STATUSES.map(s => (
          <Pill key={s} active={place.status === s} onClick={() => onStatusChange(place.id, s)} color={place.status === s ? undefined : (PLACE_STATUS_COLORS[s].bg)}>
            {s}
          </Pill>
        ))}
        {place.website && (
          <a href={place.website} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto' }}>
            <Pill icon={ExternalLink}>Website</Pill>
          </a>
        )}
      </div>
    </Card>
  );
}

function PlacesPage({ data, setData, trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');

  if (!trip) {
    return <EmptyState icon={MapPin} title="Select a trip" subtitle="Choose a trip from the Trips page to manage its places." />;
  }

  const categories = data.settings.placeCategories || PLACE_CATEGORIES;
  const places = data.places.filter(p => p.tripId === trip.id);
  const cities = [...new Set(places.map(p => p.city).filter(Boolean))].sort();

  const filtered = places.filter(p => {
    if (catFilter !== 'All' && p.category !== catFilter && p.customCategory !== catFilter) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (cityFilter !== 'All' && (p.city || '') !== cityFilter) return false;
    if (search && !`${p.name} ${p.notes} ${(p.tags||[]).join(' ')} ${p.customCategory}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allCustomCats = [...new Set(places.map(p => p.customCategory).filter(Boolean))];

  const save = (place) => {
    setData(d => {
      const exists = d.places.some(p => p.id === place.id);
      return { ...d, places: exists ? d.places.map(p => p.id === place.id ? place : p) : [...d.places, place] };
    });
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => {
    setData(d => ({ ...d, places: d.places.filter(p => p.id !== id) }));
    setConfirmDelete(null);
  };
  const changeStatus = (id, status) => {
    setData(d => ({ ...d, places: d.places.map(p => p.id === id ? { ...p, status } : p) }));
  };

  return (
    <div>
      <PageHeader title="Places" subtitle={`${trip.name} · ${places.length} saved`} action={<Btn icon={Plus} onClick={() => setShowForm(true)}>Add place</Btn>} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--kumo-text-soft)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search places, tags, notes..."
            style={{ ...inputStyle, paddingLeft: 34 }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', fontWeight: 600 }}>
          <option value="All">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
          {allCustomCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', fontWeight: 600 }}>
          <option value="All">All statuses</option>
          {PLACE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {cities.length > 0 && (
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', fontWeight: 600 }}>
            <option value="All">All cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MapPin} title={places.length === 0 ? 'No places saved yet' : 'No matches'}
          subtitle={places.length === 0 ? 'Save restaurants, cafés, attractions, and hidden gems for this trip.' : 'Try adjusting your filters.'}
          action={places.length === 0 ? <Btn icon={Plus} onClick={() => setShowForm(true)}>Add a place</Btn> : null} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(p => (
            <PlaceCard key={p.id} place={p} onEdit={(pl) => { setEditing(pl); setShowForm(true); }}
              onDelete={(id) => setConfirmDelete(id)} onStatusChange={changeStatus} />
          ))}
        </div>
      )}

      {showForm && (
        <PlaceFormModal place={editing} tripId={trip.id} categories={categories}
          onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} />
      )}
      {confirmDelete && (
        <ConfirmDialog title="Delete place?" message="This will remove the place from your trip permanently."
          onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />
      )}
    </div>
  );
}

// ============================================================
// STAYS (Hotels)
// ============================================================

function HotelFormModal({ hotel, tripId, onSave, onClose }) {
  const [form, setForm] = useState(hotel || {
    name: '', address: '', checkIn: '', checkOut: '', confirmationNumber: '',
    website: '', phone: '', rating: 0, notes: '', mapLink: '', files: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, id: hotel ? hotel.id : uid(), tripId, rating: Number(form.rating) || 0 });
  };
  return (
    <Modal title={hotel ? 'Edit stay' : 'Add stay'} onClose={onClose} width={520}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Hotel name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Shinjuku Granbell Hotel" />
        <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="2-14-5 Kabukicho, Shinjuku, Tokyo" />
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Check-in" type="date" value={form.checkIn} onChange={e => set('checkIn', e.target.value)} />
          <Input label="Check-out" type="date" value={form.checkOut} onChange={e => set('checkOut', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Confirmation number" value={form.confirmationNumber} onChange={e => set('confirmationNumber', e.target.value)} placeholder="GB-883201" />
          <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+81 ..." />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
          <Input label="Map link" value={form.mapLink} onChange={e => set('mapLink', e.target.value)} placeholder="https://maps.google.com/..." />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Rating</div>
          <StarRating value={form.rating} onChange={v => set('rating', v)} />
        </div>
        <TextArea label="Notes / future-me note" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Close to station, late checkout requested..." />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" icon={Check}>{hotel ? 'Save changes' : 'Add stay'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function HotelCard({ hotel, onEdit, onDelete, onCopy }) {
  const nights = daysBetween(hotel.checkIn, hotel.checkOut);
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{hotel.name}</div>
          {hotel.address && <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', marginTop: 2 }}>{hotel.address}</div>}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconBtn icon={Pencil} size={14} onClick={() => onEdit(hotel)} label="Edit stay" />
          <IconBtn icon={Trash2} size={14} danger onClick={() => onDelete(hotel.id)} label="Delete stay" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--kumo-text-soft)', textTransform: 'uppercase' }}>Check-in</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{hotel.checkIn ? fmtDate(hotel.checkIn) : '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--kumo-text-soft)', textTransform: 'uppercase' }}>Check-out</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{hotel.checkOut ? fmtDate(hotel.checkOut) : '—'}</div>
        </div>
        {nights > 0 && (
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--kumo-text-soft)', textTransform: 'uppercase' }}>Nights</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{nights}</div>
          </div>
        )}
      </div>
      {hotel.confirmationNumber && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--kumo-text-soft)' }}>Confirmation:</span>
          <code style={{ background: 'var(--kumo-soft)', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>{hotel.confirmationNumber}</code>
          <IconBtn icon={Copy} size={14} onClick={() => onCopy(hotel.confirmationNumber)} label="Copy confirmation number" />
        </div>
      )}
      {hotel.notes && <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5, color: 'var(--kumo-text-soft)' }}>{hotel.notes}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {hotel.rating > 0 && <StarRating value={hotel.rating} size={14} />}
        {hotel.website && <a href={hotel.website} target="_blank" rel="noreferrer"><Pill icon={ExternalLink}>Website</Pill></a>}
        {hotel.mapLink && <a href={hotel.mapLink} target="_blank" rel="noreferrer"><Pill icon={MapPin}>Map</Pill></a>}
      </div>
    </Card>
  );
}

function StaysPage({ data, setData, trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState('');

  if (!trip) {
    return <EmptyState icon={Bed} title="Select a trip" subtitle="Choose a trip from the Trips page to manage stays." />;
  }

  const hotels = data.hotels.filter(h => h.tripId === trip.id).sort((a,b) => (a.checkIn||'').localeCompare(b.checkIn||''));

  const save = (hotel) => {
    setData(d => {
      const exists = d.hotels.some(h => h.id === hotel.id);
      return { ...d, hotels: exists ? d.hotels.map(h => h.id === hotel.id ? hotel : h) : [...d.hotels, hotel] };
    });
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => { setData(d => ({ ...d, hotels: d.hotels.filter(h => h.id !== id) })); setConfirmDelete(null); };
  const copy = (text) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    setToast('Copied to clipboard');
    setTimeout(() => setToast(''), 1800);
  };

  return (
    <div>
      <PageHeader title="Stays" subtitle={`${trip.name} · ${hotels.length} stay${hotels.length === 1 ? '' : 's'}`} action={<Btn icon={Plus} onClick={() => setShowForm(true)}>Add stay</Btn>} />
      {hotels.length === 0 ? (
        <EmptyState icon={Bed} title="No stays added yet" subtitle="Add hotels, hostels, or other accommodations for this trip."
          action={<Btn icon={Plus} onClick={() => setShowForm(true)}>Add a stay</Btn>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {hotels.map(h => <HotelCard key={h.id} hotel={h} onEdit={(x) => { setEditing(x); setShowForm(true); }} onDelete={(id) => setConfirmDelete(id)} onCopy={copy} />)}
        </div>
      )}
      {showForm && <HotelFormModal hotel={editing} tripId={trip.id} onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} />}
      {confirmDelete && <ConfirmDialog title="Delete stay?" message="This will remove this accommodation from your trip." onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--kumo-text)', color: '#fff', padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, zIndex: 2000 }}>{toast}</div>
      )}
    </div>
  );
}

// ============================================================
// TRANSPORT
// ============================================================

const TRANSPORT_ICONS = { Flight: Plane, TrainFront: TrainFront, Bus: TrainFront, Metro: TrainFront, 'Car Rental': TrainFront, Ferry: TrainFront, Taxi: TrainFront };

function TransportFormModal({ item, tripId, defaultCurrency, onSave, onClose }) {
  const [form, setForm] = useState(item || {
    type: 'Flight', departure: '', arrival: '', date: '', time: '', bookingStatus: 'Planned',
    seatInfo: '', confirmationNumber: '', cost: '', currency: defaultCurrency || 'USD', notes: '', files: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.departure.trim() && !form.arrival.trim()) return;
    onSave({ ...form, id: item ? item.id : uid(), tripId, cost: Number(form.cost) || 0 });
  };
  return (
    <Modal title={item ? 'Edit transport' : 'Add transport'} onClose={onClose} width={540}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
            {TRANSPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Booking status" value={form.bookingStatus} onChange={e => set('bookingStatus', e.target.value)}>
            {['Planned','Booked','Confirmed','Completed','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="From" required value={form.departure} onChange={e => set('departure', e.target.value)} placeholder="Tokyo Station" />
          <Input label="To" required value={form.arrival} onChange={e => set('arrival', e.target.value)} placeholder="Kyoto Station" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          <Input label="Time" type="time" value={form.time} onChange={e => set('time', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Seat / cabin info" value={form.seatInfo} onChange={e => set('seatInfo', e.target.value)} placeholder="34C" />
          <Input label="Confirmation number" value={form.confirmationNumber} onChange={e => set('confirmationNumber', e.target.value)} placeholder="NH-XJ29K" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Cost" type="number" min="0" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="780" />
          <Select label="Currency" value={form.currency} onChange={e => set('currency', e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <TextArea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ANA direct flight, JR Pass, etc." />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" icon={Check}>{item ? 'Save changes' : 'Add transport'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function TransportCard({ item, onEdit, onDelete }) {
  const Icon = TRANSPORT_ICONS[item.type] || TrainFront;
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--kumo-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} color="var(--kumo-primary-text)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{item.departure} <ChevronRight size={14} style={{ verticalAlign: -2 }} /> {item.arrival}</div>
            <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)' }}>
              {item.type}{item.date && ` · ${fmtDate(item.date)}`}{item.time && ` · ${item.time}`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconBtn icon={Pencil} size={14} onClick={() => onEdit(item)} label="Edit transport" />
          <IconBtn icon={Trash2} size={14} danger onClick={() => onDelete(item.id)} label="Delete transport" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <Pill>{item.bookingStatus}</Pill>
        {item.seatInfo && <Pill>Seat {item.seatInfo}</Pill>}
        {item.confirmationNumber && <Pill>Conf: {item.confirmationNumber}</Pill>}
        {item.cost > 0 && <Pill icon={WalletIcon}>{currencyFmt(item.cost, item.currency)}</Pill>}
      </div>
      {item.notes && <div style={{ fontSize: 13, marginTop: 8, color: 'var(--kumo-text-soft)', lineHeight: 1.5 }}>{item.notes}</div>}
    </Card>
  );
}

function TransportPage({ data, setData, trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!trip) {
    return <EmptyState icon={TrainFront} title="Select a trip" subtitle="Choose a trip from the Trips page to manage transportation." />;
  }

  const items = data.transport.filter(t => t.tripId === trip.id).sort((a,b) => (a.date||'').localeCompare(b.date||''));

  const save = (item) => {
    setData(d => {
      const exists = d.transport.some(t => t.id === item.id);
      return { ...d, transport: exists ? d.transport.map(t => t.id === item.id ? item : t) : [...d.transport, item] };
    });
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => { setData(d => ({ ...d, transport: d.transport.filter(t => t.id !== id) })); setConfirmDelete(null); };

  return (
    <div>
      <PageHeader title="Transport" subtitle={`${trip.name} · ${items.length} segment${items.length === 1 ? '' : 's'}`} action={<Btn icon={Plus} onClick={() => setShowForm(true)}>Add transport</Btn>} />
      {items.length === 0 ? (
        <EmptyState icon={TrainFront} title="No transport added yet" subtitle="Add flights, trains, buses, ferries, or any way you'll get around."
          action={<Btn icon={Plus} onClick={() => setShowForm(true)}>Add transport</Btn>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => <TransportCard key={item.id} item={item} onEdit={(x) => { setEditing(x); setShowForm(true); }} onDelete={(id) => setConfirmDelete(id)} />)}
        </div>
      )}
      {showForm && <TransportFormModal item={editing} tripId={trip.id} defaultCurrency={trip.currency} onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} />}
      {confirmDelete && <ConfirmDialog title="Delete transport?" message="This will remove this transport segment from your trip." onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />}
    </div>
  );
}

// ============================================================
// ROUTES
// ============================================================

function RouteFormModal({ route, tripId, onSave, onClose }) {
  const [form, setForm] = useState(route || { name: '', from: '', to: '', travelTime: '', distance: '', transportType: 'Walking', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.from.trim() || !form.to.trim()) return;
    onSave({ ...form, id: route ? route.id : uid(), tripId, name: form.name || `${form.from} → ${form.to}` });
  };
  return (
    <Modal title={route ? 'Edit route' : 'Add route'} onClose={onClose} width={460}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Route name (optional)" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Morning loop" />
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="From" required value={form.from} onChange={e => set('from', e.target.value)} placeholder="Hotel" />
          <Input label="To" required value={form.to} onChange={e => set('to', e.target.value)} placeholder="Fushimi Inari Shrine" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Select label="Transport type" value={form.transportType} onChange={e => set('transportType', e.target.value)}>
            {['Walking','Transit','Taxi','Car','Bike','TrainFront'].map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Travel time" value={form.travelTime} onChange={e => set('travelTime', e.target.value)} placeholder="25 min" />
          <Input label="Distance" value={form.distance} onChange={e => set('distance', e.target.value)} placeholder="1.8 km" />
        </div>
        <TextArea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Best route, scenic path, etc." />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" icon={Check}>{route ? 'Save changes' : 'Add route'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function RoutesPage({ data, setData, trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!trip) {
    return <EmptyState icon={Compass} title="Select a trip" subtitle="Choose a trip from the Trips page to plan routes." />;
  }

  const routes = data.routes.filter(r => r.tripId === trip.id);

  const save = (route) => {
    setData(d => {
      const exists = d.routes.some(r => r.id === route.id);
      return { ...d, routes: exists ? d.routes.map(r => r.id === route.id ? route : r) : [...d.routes, route] };
    });
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => { setData(d => ({ ...d, routes: d.routes.filter(r => r.id !== id) })); setConfirmDelete(null); };

  return (
    <div>
      <PageHeader title="Routes" subtitle={`${trip.name} · plan the order between places`} action={<Btn icon={Plus} onClick={() => setShowForm(true)}>Add route</Btn>} />
      {routes.length === 0 ? (
        <EmptyState icon={Compass} title="No routes planned yet" subtitle="Plan routes between hotels, restaurants, attractions, and transit hubs to figure out the best order for your day."
          action={<Btn icon={Plus} onClick={() => setShowForm(true)}>Add a route</Btn>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {routes.map(r => (
            <Card key={r.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Footprints size={15} color="var(--kumo-primary-text)" /> {r.from} <ChevronRight size={14} /> {r.to}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', marginTop: 4 }}>
                    {r.transportType}{r.travelTime && ` · ${r.travelTime}`}{r.distance && ` · ${r.distance}`}
                  </div>
                  {r.notes && <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{r.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn icon={Pencil} size={14} onClick={() => { setEditing(r); setShowForm(true); }} label="Edit route" />
                  <IconBtn icon={Trash2} size={14} danger onClick={() => setConfirmDelete(r.id)} label="Delete route" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {showForm && <RouteFormModal route={editing} tripId={trip.id} onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} />}
      {confirmDelete && <ConfirmDialog title="Delete route?" message="This will remove this route." onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />}
    </div>
  );
}

// ============================================================
// DOCUMENTS
// ============================================================

function DocFormModal({ doc, tripId, categories, onSave, onClose, onAddCategory }) {
  const [form, setForm] = useState(doc || { name: '', category: categories[0] || 'Other', notes: '', fileData: '', fileType: '' });
  const [newCat, setNewCat] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      set('fileData', reader.result);
      set('fileType', file.type);
      if (!form.name) set('name', file.name);
    };
    reader.readAsDataURL(file);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, id: doc ? doc.id : uid(), tripId });
  };

  return (
    <Modal title={doc ? 'Edit document' : 'Add document'} onClose={onClose} width={480}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Hotel reservation - Shinjuku" />
        <div style={{ display: 'flex', gap: 10 }}>
          <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input label="Add a new category" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="e.g. Receipts" />
          <Btn type="button" variant="secondary" size="sm" style={{ marginTop: 22 }} onClick={() => { if (newCat.trim()) { onAddCategory(newCat.trim()); set('category', newCat.trim()); setNewCat(''); } }}>Add</Btn>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>File (PDF, image)</div>
          <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={handleFile} style={{ fontSize: 13 }} />
          {form.fileData && (
            <div style={{ marginTop: 8 }}>
              {form.fileType && form.fileType.startsWith('image') ? (
                <img src={form.fileData} alt="preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 10 }} />
              ) : (
                <Pill icon={FileText}>File attached</Pill>
              )}
            </div>
          )}
        </div>
        <TextArea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What this document is for" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" icon={Check}>{doc ? 'Save changes' : 'Add document'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function DocCard({ doc, onEdit, onDelete }) {
  const isImage = doc.fileType && doc.fileType.startsWith('image');
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ height: 100, background: 'var(--kumo-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {isImage ? <img src={doc.fileData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileText size={32} color="var(--kumo-primary-text)" />}
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Pill>{doc.category}</Pill>
          <div style={{ display: 'flex', gap: 0 }}>
            {doc.fileData && (
              <a href={doc.fileData} download={doc.name}>
                <IconBtn icon={Download} size={14} label="Download" />
              </a>
            )}
            <IconBtn icon={Pencil} size={14} onClick={() => onEdit(doc)} label="Edit document" />
            <IconBtn icon={Trash2} size={14} danger onClick={() => onDelete(doc.id)} label="Delete document" />
          </div>
        </div>
        {doc.notes && <div style={{ fontSize: 12, color: 'var(--kumo-text-soft)', marginTop: 6 }}>{doc.notes}</div>}
      </div>
    </Card>
  );
}

function DocumentsPage({ data, setData, trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [catFilter, setCatFilter] = useState('All');
  const [search, setSearch] = useState('');

  if (!trip) {
    return <EmptyState icon={FolderOpen} title="Select a trip" subtitle="Choose a trip from the Trips page to view its documents." />;
  }

  const categories = data.settings.docCategories || DOC_CATEGORIES_DEFAULT;
  const docs = data.documents.filter(d => d.tripId === trip.id);
  const filtered = docs.filter(d => {
    if (catFilter !== 'All' && d.category !== catFilter) return false;
    if (search && !`${d.name} ${d.notes}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const save = (doc) => {
    setData(d => {
      const exists = d.documents.some(x => x.id === doc.id);
      return { ...d, documents: exists ? d.documents.map(x => x.id === doc.id ? doc : x) : [...d.documents, doc] };
    });
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => { setData(d => ({ ...d, documents: d.documents.filter(x => x.id !== id) })); setConfirmDelete(null); };
  const addCategory = (cat) => setData(d => ({ ...d, settings: { ...d.settings, docCategories: [...new Set([...(d.settings.docCategories || DOC_CATEGORIES_DEFAULT), cat])] } }));

  return (
    <div>
      <PageHeader title="Documents" subtitle={`${trip.name} · ${docs.length} file${docs.length === 1 ? '' : 's'}`} action={<Btn icon={Plus} onClick={() => setShowForm(true)}>Add document</Btn>} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--kumo-text-soft)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." style={{ ...inputStyle, paddingLeft: 34 }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', fontWeight: 600 }}>
          <option value="All">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title={docs.length === 0 ? 'No documents yet' : 'No matches'}
          subtitle={docs.length === 0 ? 'Store booking confirmations, tickets, insurance docs, and more.' : 'Try a different search or category.'}
          action={docs.length === 0 ? <Btn icon={Plus} onClick={() => setShowForm(true)}>Add a document</Btn> : null} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {filtered.map(doc => <DocCard key={doc.id} doc={doc} onEdit={(x) => { setEditing(x); setShowForm(true); }} onDelete={(id) => setConfirmDelete(id)} />)}
        </div>
      )}
      {showForm && <DocFormModal doc={editing} tripId={trip.id} categories={categories} onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} onAddCategory={addCategory} />}
      {confirmDelete && <ConfirmDialog title="Delete document?" message="This will remove the document from your trip." onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />}
    </div>
  );
}

// ============================================================
// FINANCES
// ============================================================

function ExpenseFormModal({ expense, tripId, defaultCurrency, categories, onSave, onClose, onAddCategory }) {
  const [form, setForm] = useState(expense || {
    amount: '', currency: defaultCurrency || 'USD', category: categories[0] || 'Miscellaneous',
    date: todayISO(), notes: '', payment: 'Cash', planned: false, attachments: [],
  });
  const [newCat, setNewCat] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.amount) return;
    onSave({ ...form, id: expense ? expense.id : uid(), tripId, amount: Number(form.amount) || 0 });
  };
  return (
    <Modal title={expense ? 'Edit expense' : 'Add expense'} onClose={onClose} width={460}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Amount" type="number" min="0" step="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="35" />
          <Select label="Currency" value={form.currency} onChange={e => set('currency', e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input label="Add new category" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="e.g. Gifts" />
          <Btn type="button" variant="secondary" size="sm" style={{ marginTop: 22 }} onClick={() => { if (newCat.trim()) { onAddCategory(newCat.trim()); set('category', newCat.trim()); setNewCat(''); } }}>Add</Btn>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Select label="Payment method" value={form.payment} onChange={e => set('payment', e.target.value)}>
            {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select label="Type" value={form.planned ? 'planned' : 'actual'} onChange={e => set('planned', e.target.value === 'planned')}>
            <option value="actual">Actual spend</option>
            <option value="planned">Planned cost</option>
          </Select>
        </div>
        <TextArea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What was this for?" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" icon={Check}>{expense ? 'Save changes' : 'Add expense'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function exportToCSV(expenses, trip) {
  const header = ['Date','Category','Amount','Currency','Payment','Type','Notes'];
  const rows = expenses.map(e => [e.date, e.category, e.amount, e.currency, e.payment, e.planned ? 'Planned' : 'Actual', (e.notes||'').replace(/,/g,';')]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${trip.name.replace(/\s+/g,'_')}_expenses.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function exportToJSON(expenses, trip) {
  const blob = new Blob([JSON.stringify({ trip: trip.name, expenses }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${trip.name.replace(/\s+/g,'_')}_expenses.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const CAT_COLORS_LIST = ['#7FA8D9','#F4A896','#9CB89A','#B5A8D9','#D9B68C','#D08FA0','#90A4BD','#95C9C1','#E5C07B','#C9A0DC'];

function FinancesPage({ data, setData, trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filter, setFilter] = useState('All');

  if (!trip) {
    return <EmptyState icon={PiggyBank} title="Select a trip" subtitle="Choose a trip from the Trips page to manage finances." />;
  }

  const categories = data.settings.expenseCategories || EXPENSE_CATEGORIES_DEFAULT;
  const expenses = data.expenses.filter(e => e.tripId === trip.id).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const filtered = filter === 'All' ? expenses : expenses.filter(e => e.category === filter);

  const actual = expenses.filter(e => !e.planned);
  const planned = expenses.filter(e => e.planned);
  const totalActual = actual.reduce((s,e) => s + (Number(e.amount)||0), 0);
  const totalPlanned = planned.reduce((s,e) => s + (Number(e.amount)||0), 0);
  const remaining = (trip.budget || 0) - totalActual;
  const budgetPct = trip.budget > 0 ? Math.min(100, Math.round((totalActual / trip.budget) * 100)) : 0;

  const byCategory = categories.map(cat => ({
    cat, total: actual.filter(e => e.category === cat).reduce((s,e) => s + (Number(e.amount)||0), 0),
  })).filter(c => c.total > 0);
  const maxCat = Math.max(1, ...byCategory.map(c => c.total));

  const save = (exp) => {
    setData(d => {
      const exists = d.expenses.some(x => x.id === exp.id);
      return { ...d, expenses: exists ? d.expenses.map(x => x.id === exp.id ? exp : x) : [...d.expenses, exp] };
    });
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => { setData(d => ({ ...d, expenses: d.expenses.filter(x => x.id !== id) })); setConfirmDelete(null); };
  const addCategory = (cat) => setData(d => ({ ...d, settings: { ...d.settings, expenseCategories: [...new Set([...(d.settings.expenseCategories || EXPENSE_CATEGORIES_DEFAULT), cat])] } }));
  const updateBudget = (val) => setData(d => ({ ...d, trips: d.trips.map(t => t.id === trip.id ? { ...t, budget: Number(val) || 0 } : t) }));
  const updateCurrency = (val) => setData(d => ({ ...d, trips: d.trips.map(t => t.id === trip.id ? { ...t, currency: val } : t) }));

  return (
    <div>
      <PageHeader title="Finances" subtitle={`${trip.name}`} action={
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" size="sm" icon={Download} onClick={() => exportToCSV(expenses, trip)}>CSV</Btn>
          <Btn variant="secondary" size="sm" icon={Download} onClick={() => exportToJSON(expenses, trip)}>JSON</Btn>
          <Btn icon={Plus} onClick={() => setShowForm(true)}>Add expense</Btn>
        </div>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <Card>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Budget</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="number" min="0" step="0.01" value={trip.budget || ''} onChange={e => updateBudget(e.target.value)}
              style={{ ...inputStyle, fontSize: 19, fontWeight: 600, padding: '4px 8px', width: 0, flex: '1 1 70px', minWidth: 70 }} />
            <select value={trip.currency} onChange={e => updateCurrency(e.target.value)} style={{ ...inputStyle, width: 'auto', fontSize: 12, padding: '4px 6px', flex: '0 0 auto', maxWidth: '100%' }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Spent (actual)</div>
          <div style={{ fontSize: 21, fontWeight: 600 }}>{currencyFmt(totalActual, trip.currency)}</div>
          <div style={{ height: 6, background: 'var(--kumo-soft)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: `${budgetPct}%`, height: '100%', background: budgetPct > 90 ? '#E2A39A' : 'var(--kumo-primary)', borderRadius: 999 }} />
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Remaining</div>
          <div style={{ fontSize: 21, fontWeight: 600, color: remaining < 0 ? '#C75C4A' : 'var(--kumo-text)' }}>{currencyFmt(remaining, trip.currency)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Planned costs</div>
          <div style={{ fontSize: 21, fontWeight: 600 }}>{currencyFmt(totalPlanned, trip.currency)}</div>
        </Card>
      </div>

      {byCategory.length > 0 && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Category breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byCategory.map((c, i) => (
              <div key={c.cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  <span>{c.cat}</span>
                  <span>{currencyFmt(c.total, trip.currency)}</span>
                </div>
                <div style={{ height: 8, background: 'var(--kumo-soft)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${(c.total / maxCat) * 100}%`, height: '100%', background: CAT_COLORS_LIST[i % CAT_COLORS_LIST.length], borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Pill active={filter === 'All'} onClick={() => setFilter('All')}>All</Pill>
        {categories.map(c => <Pill key={c} active={filter === c} onClick={() => setFilter(c)}>{c}</Pill>)}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={PiggyBank} title="No expenses yet" subtitle="Track planned and actual spending across your trip."
          action={<Btn icon={Plus} onClick={() => setShowForm(true)}>Add an expense</Btn>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(e => (
            <Card key={e.id} style={{ padding: '10px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{currencyFmt(e.amount, e.currency)}</span>
                    <Pill>{e.category}</Pill>
                    {e.planned && <Pill color="#F6E9D8">Planned</Pill>}
                    <span style={{ fontSize: 12, color: 'var(--kumo-text-soft)' }}>{fmtDateShort(e.date)} · {e.payment}</span>
                  </div>
                  {e.notes && <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', marginTop: 2 }}>{e.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconBtn icon={Pencil} size={14} onClick={() => { setEditing(e); setShowForm(true); }} label="Edit expense" />
                  <IconBtn icon={Trash2} size={14} danger onClick={() => setConfirmDelete(e.id)} label="Delete expense" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && <ExpenseFormModal expense={editing} tripId={trip.id} defaultCurrency={trip.currency} categories={categories} onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} onAddCategory={addCategory} />}
      {confirmDelete && <ConfirmDialog title="Delete expense?" message="This will remove this expense record." onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />}
    </div>
  );
}

// ============================================================
// MEMORIES
// ============================================================

function MemoryFormModal({ memory, tripId, places, onSave, onClose }) {
  const [form, setForm] = useState(memory || {
    type: 'Daily', title: '', photos: [], rating: 0, notes: '', date: todayISO(),
    location: '', tags: [], wouldReturn: 0, futureNote: '', placeId: '',
    promptMemorable: '', promptReturn: '', promptSurprised: '', promptFutureMe: '',
  });
  const [tagInput, setTagInput] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fileRef = useRef(null);

  const addPhotoFixed = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, photos: [...f.photos, reader.result] }));
      reader.readAsDataURL(file);
    });
  };
  const removePhoto = (idx) => setForm(f => ({ ...f, photos: f.photos.filter((_,i) => i !== idx) }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };
  const removeTag = (t) => set('tags', form.tags.filter(x => x !== t));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({ ...form, id: memory ? memory.id : uid(), tripId, rating: Number(form.rating) || 0, wouldReturn: Number(form.wouldReturn) || 0 });
  };

  return (
    <Modal title={memory ? 'Edit memory' : 'New memory'} onClose={onClose} width={560}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
            {MEMORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <Input label="Title" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Sunrise at Fushimi Inari" />
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Kyoto" />
          {places.length > 0 && (
            <Select label="Link to place (optional)" value={form.placeId || ''} onChange={e => set('placeId', e.target.value)}>
              <option value="">None</option>
              {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Photos</div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotoFixed} style={{ fontSize: 13 }} />
          {form.photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {form.photos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10 }} />
                  <button type="button" onClick={() => removePhoto(i)} aria-label="Remove photo" style={{
                    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                    background: '#C75C4A', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Rating</div>
          <StarRating value={form.rating} onChange={v => set('rating', v)} size={22} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Would return?</div>
          <StarRating value={form.wouldReturn} onChange={v => set('wouldReturn', v)} size={22} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 6 }}>Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {form.tags.map(t => <Pill key={t} icon={Tag}>{t} <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTag(t)} /></Pill>)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Add a tag and press Enter" style={inputStyle} />
            <Btn variant="secondary" size="sm" type="button" onClick={addTag}>Add</Btn>
          </div>
        </div>
        <TextArea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What happened? What did it feel like?" />
        <div style={{ background: 'var(--kumo-soft)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} /> Reflection prompts</div>
          <TextArea label="What made this memorable?" value={form.promptMemorable} onChange={e => set('promptMemorable', e.target.value)} style={{ minHeight: 50 }} />
          <TextArea label="Would you come back?" value={form.promptReturn} onChange={e => set('promptReturn', e.target.value)} style={{ minHeight: 50 }} />
          <TextArea label="What surprised you?" value={form.promptSurprised} onChange={e => set('promptSurprised', e.target.value)} style={{ minHeight: 50 }} />
          <TextArea label="What should future you remember?" value={form.promptFutureMe} onChange={e => set('promptFutureMe', e.target.value)} style={{ minHeight: 50 }} />
        </div>
        <Input label="Future-me note" value={form.futureNote} onChange={e => set('futureNote', e.target.value)} placeholder="Advice for your next visit" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" icon={Check}>{memory ? 'Save changes' : 'Save memory'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function MemoryCard({ memory, onEdit, onDelete, onOpen }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }} onClick={() => onOpen(memory)}>
      <div style={{ height: 140, background: 'var(--kumo-soft)', position: 'relative', overflow: 'hidden' }}>
        {memory.photos && memory.photos[0] ? (
          <img src={memory.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : <FloatingShapes />}
        {memory.photos && memory.photos.length > 1 && (
          <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
            +{memory.photos.length - 1}
          </span>
        )}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 2 }}>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 10 }}>
            <IconBtn icon={Pencil} size={14} onClick={(e) => { e.stopPropagation(); onEdit(memory); }} label="Edit memory" />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 10 }}>
            <IconBtn icon={Trash2} size={14} danger onClick={(e) => { e.stopPropagation(); onDelete(memory.id); }} label="Delete memory" />
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{memory.title}</div>
        <div style={{ fontSize: 12, color: 'var(--kumo-text-soft)', marginTop: 2 }}>{fmtDate(memory.date)}{memory.location ? ` · ${memory.location}` : ''}</div>
        {memory.rating > 0 && <div style={{ marginTop: 6 }}><StarRating value={memory.rating} size={14} /></div>}
        {memory.tags && memory.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {memory.tags.slice(0,4).map(t => <Pill key={t}>{t}</Pill>)}
          </div>
        )}
      </div>
    </Card>
  );
}

function MemoryDetailModal({ memory, onClose }) {
  return (
    <Modal title={memory.title} onClose={onClose} width={600}>
      {memory.photos && memory.photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: memory.photos.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
          {memory.photos.map((p, i) => <img key={i} src={p} alt="" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 260 }} />)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <Pill>{memory.type}</Pill>
        <span style={{ fontSize: 13, color: 'var(--kumo-text-soft)' }}>{fmtDate(memory.date)}</span>
        {memory.location && <span style={{ fontSize: 13, color: 'var(--kumo-text-soft)' }}><MapPin size={12} style={{ verticalAlign: -1 }} /> {memory.location}</span>}
      </div>
      {memory.rating > 0 && <div style={{ marginBottom: 8 }}><StarRating value={memory.rating} /></div>}
      {memory.notes && <p style={{ lineHeight: 1.7, fontSize: 14.5 }}>{memory.notes}</p>}
      {(memory.promptMemorable || memory.promptReturn || memory.promptSurprised || memory.promptFutureMe) && (
        <div style={{ background: 'var(--kumo-soft)', borderRadius: 14, padding: 12, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {memory.promptMemorable && <div><div style={{ fontWeight: 600, fontSize: 12.5 }}>What made this memorable?</div><div style={{ fontSize: 13.5 }}>{memory.promptMemorable}</div></div>}
          {memory.promptReturn && <div><div style={{ fontWeight: 600, fontSize: 12.5 }}>Would you come back?</div><div style={{ fontSize: 13.5 }}>{memory.promptReturn}</div></div>}
          {memory.promptSurprised && <div><div style={{ fontWeight: 600, fontSize: 12.5 }}>What surprised you?</div><div style={{ fontSize: 13.5 }}>{memory.promptSurprised}</div></div>}
          {memory.promptFutureMe && <div><div style={{ fontWeight: 600, fontSize: 12.5 }}>For future you</div><div style={{ fontSize: 13.5 }}>{memory.promptFutureMe}</div></div>}
        </div>
      )}
      {memory.futureNote && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 14, background: '#FBEAE2', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Sparkles size={16} color="#C77B5A" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#9C5A3E' }}>{memory.futureNote}</div>
        </div>
      )}
      {memory.tags && memory.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
          {memory.tags.map(t => <Pill key={t} icon={Tag}>{t}</Pill>)}
        </div>
      )}
    </Modal>
  );
}

function MemoriesPage({ data, setData, trip }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [view, setView] = useState('gallery'); // gallery | timeline | favorites

  if (!trip) {
    return <EmptyState icon={Camera} title="Select a trip" subtitle="Choose a trip from the Trips page to view its memories." />;
  }

  const places = data.places.filter(p => p.tripId === trip.id);
  const memories = data.memories.filter(m => m.tripId === trip.id);
  const sorted = [...memories].sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const shown = view === 'favorites' ? sorted.filter(m => m.rating >= 4) : sorted;

  const save = (memory) => {
    setData(d => {
      const exists = d.memories.some(m => m.id === memory.id);
      return { ...d, memories: exists ? d.memories.map(m => m.id === memory.id ? memory : m) : [...d.memories, memory] };
    });
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => { setData(d => ({ ...d, memories: d.memories.filter(m => m.id !== id) })); setConfirmDelete(null); };

  return (
    <div>
      <PageHeader title="Memories" subtitle={`${trip.name} · ${memories.length} captured`} action={
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant={view === 'gallery' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('gallery')}>Gallery</Btn>
          <Btn variant={view === 'timeline' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('timeline')}>Timeline</Btn>
          <Btn variant={view === 'favorites' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('favorites')}>Favorites</Btn>
          <Btn icon={Plus} onClick={() => setShowForm(true)}>New memory</Btn>
        </div>
      } />
      {shown.length === 0 ? (
        <EmptyState icon={Camera} title={memories.length === 0 ? 'No memories yet' : 'Nothing here yet'}
          subtitle={memories.length === 0 ? 'Capture moments, photos, and reflections from your trip.' : 'Try a different view.'}
          action={memories.length === 0 ? <Btn icon={Plus} onClick={() => setShowForm(true)}>Create a memory</Btn> : null} />
      ) : view === 'timeline' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {shown.map(m => (
            <Card key={m.id} onClick={() => setViewing(m)}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 72, height: 72, borderRadius: 12, background: 'var(--kumo-soft)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.photos && m.photos[0] ? <img src={m.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={22} color="var(--kumo-primary-text)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{m.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--kumo-text-soft)' }}>{fmtDate(m.date)}{m.location ? ` · ${m.location}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <IconBtn icon={Pencil} size={14} onClick={(e) => { e.stopPropagation(); setEditing(m); setShowForm(true); }} label="Edit memory" />
                      <IconBtn icon={Trash2} size={14} danger onClick={(e) => { e.stopPropagation(); setConfirmDelete(m.id); }} label="Delete memory" />
                    </div>
                  </div>
                  {m.notes && <div style={{ fontSize: 13, marginTop: 4, color: 'var(--kumo-text-soft)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{m.notes}</div>}
                  {m.rating > 0 && <div style={{ marginTop: 4 }}><StarRating value={m.rating} size={13} /></div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {shown.map(m => (
            <MemoryCard key={m.id} memory={m} onOpen={setViewing}
              onEdit={(x) => { setEditing(x); setShowForm(true); }} onDelete={(id) => setConfirmDelete(id)} />
          ))}
        </div>
      )}
      {showForm && <MemoryFormModal memory={editing} tripId={trip.id} places={places} onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} />}
      {viewing && <MemoryDetailModal memory={viewing} onClose={() => setViewing(null)} />}
      {confirmDelete && <ConfirmDialog title="Delete memory?" message="This will permanently remove this memory and its photos." onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />}
    </div>
  );
}

// ============================================================
// JOURNAL — auto-generated chronological story
// ============================================================

function JournalPage({ data, trip }) {
  if (!trip) {
    return <EmptyState icon={BookOpen} title="Select a trip" subtitle="Choose a trip from the Trips page to view its journal." />;
  }

  const days = data.itineraryDays.filter(d => d.tripId === trip.id).sort((a,b) => a.date.localeCompare(b.date));
  const memories = data.memories.filter(m => m.tripId === trip.id);
  const expenses = data.expenses.filter(e => e.tripId === trip.id);
  const activities = data.activities;

  const entries = days.map(day => {
    const dayMemories = memories.filter(m => m.date === day.date);
    const dayExpenses = expenses.filter(e => e.date === day.date);
    const dayActivities = activities.filter(a => a.dayId === day.id).sort((a,b) => (a.time||'').localeCompare(b.time||''));
    return { day, dayMemories, dayExpenses, dayActivities };
  });

  // include memory-only days not matching an itinerary day
  const orphanMemoryDates = [...new Set(memories.map(m => m.date).filter(date => !days.some(d => d.date === date)))].sort();

  if (entries.length === 0 && orphanMemoryDates.length === 0) {
    return (
      <div>
        <PageHeader title="Journal" subtitle={trip.name} />
        <EmptyState icon={BookOpen} title="Your journal is empty" subtitle="As you add itinerary days, activities, and memories, they'll automatically weave together into a day-by-day story here." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Journal" subtitle={`${trip.name} · automatically generated from your itinerary and memories`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {entries.map(({ day, dayMemories, dayExpenses, dayActivities }, idx) => (
          <Card key={day.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--kumo-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, color: 'var(--kumo-primary-text)' }}>
                {idx + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{fmtWeekday(day.date)}, {fmtDate(day.date)}</div>
                {day.city && <div style={{ fontSize: 12.5, color: 'var(--kumo-primary-text)', fontWeight: 700 }}>{day.city}</div>}
              </div>
            </div>
            {day.notes && <p style={{ fontSize: 14, lineHeight: 1.7, marginTop: 0 }}>{day.notes}</p>}
            {dayActivities.length > 0 && (
              <ul style={{ margin: '8px 0', paddingLeft: 20, fontSize: 13.5, lineHeight: 1.8 }}>
                {dayActivities.map(a => (
                  <li key={a.id} style={{ textDecoration: a.completed ? 'line-through' : 'none', color: a.completed ? 'var(--kumo-text-soft)' : 'var(--kumo-text)' }}>
                    {a.time && <strong>{a.time}</strong>} {a.title}
                  </li>
                ))}
              </ul>
            )}
            {dayMemories.map(m => (
              <div key={m.id} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--kumo-soft)' }}>
                {m.photos && m.photos.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, overflowX: 'auto' }}>
                    {m.photos.map((p,i) => <img key={i} src={p} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />)}
                  </div>
                )}
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{m.title}</div>
                {m.rating > 0 && <div style={{ margin: '4px 0' }}><StarRating value={m.rating} size={14} /></div>}
                {m.notes && <p style={{ fontSize: 14, lineHeight: 1.7, fontStyle: 'italic', margin: '6px 0' }}>&ldquo;{m.notes}&rdquo;</p>}
              </div>
            ))}
            {dayExpenses.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--kumo-soft)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {dayExpenses.map(e => <Pill key={e.id} icon={WalletIcon}>{e.category}: {currencyFmt(e.amount, e.currency)}</Pill>)}
              </div>
            )}
          </Card>
        ))}
        {orphanMemoryDates.map(date => {
          const ms = memories.filter(m => m.date === date);
          return (
            <Card key={date}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{fmtWeekday(date)}, {fmtDate(date)}</div>
              {ms.map(m => (
                <div key={m.id} style={{ marginBottom: 8 }}>
                  {m.photos && m.photos.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, overflowX: 'auto' }}>
                      {m.photos.map((p,i) => <img key={i} src={p} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />)}
                    </div>
                  )}
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{m.title}</div>
                  {m.rating > 0 && <div style={{ margin: '4px 0' }}><StarRating value={m.rating} size={14} /></div>}
                  {m.notes && <p style={{ fontSize: 14, lineHeight: 1.7, fontStyle: 'italic', margin: '6px 0' }}>&ldquo;{m.notes}&rdquo;</p>}
                </div>
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// PASSPORT & ACHIEVEMENTS
// ============================================================

function PassportPage({ data }) {
  const trips = data.trips;
  const completedTrips = trips.filter(t => t.status === 'Completed' || t.status === 'Archived');
  const allDays = data.itineraryDays;
  const allPlaces = data.places;
  const allMemories = data.memories;
  const allTransport = data.transport;

  // Merge countries from trips + onboarding answers (settings.visitedCountries)
  const fromTrips = trips.map(t => t.destination).filter(Boolean);
  const fromOnboarding = data.settings?.visitedCountries || [];
  const countries = [...new Set([...fromOnboarding, ...fromTrips])];
  const cities = [...new Set(allDays.map(d => d.city).filter(Boolean))];

  // Achievement progress calculations
  const ramenCount = allPlaces.filter(p => (p.customCategory||'').toLowerCase().includes('ramen') || (p.tags||[]).some(t => t.toLowerCase().includes('ramen'))).length;
  const cafeVisited = allPlaces.filter(p => p.category === 'Café' && p.status === 'Visited').length;
  const attractionsVisited = allPlaces.filter(p => p.category === 'Attraction' && p.status === 'Visited').length;
  const sakuraTagged = allPlaces.some(p => (p.tags||[]).some(t => t.toLowerCase().includes('sakura')));
  const cityCount = cities.length;
  const flightCount = allTransport.filter(t => t.type === 'Flight').length;
  const memoryCount = allMemories.length;

  const progressFor = (id) => {
    switch(id) {
      case 'ramen': return { current: ramenCount, target: 3 };
      case 'cafe': return { current: cafeVisited, target: 5 };
      case 'temple': return { current: attractionsVisited, target: 5 };
      case 'sakura': return { current: sakuraTagged ? 1 : 0, target: 1 };
      case 'city': return { current: cityCount, target: 5 };
      case 'flyer': return { current: flightCount, target: 5 };
      case 'keeper': return { current: memoryCount, target: 10 };
      default: return { current: 0, target: 1 };
    }
  };

  return (
    <div>
      <PageHeader title="Passport" subtitle="Your collection of stamps, achievements, and travel history" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <Card style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{countries.length}</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', fontWeight: 700 }}>Countries</div>
        </Card>
        <Card style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{cities.length}</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', fontWeight: 700 }}>Cities</div>
        </Card>
        <Card style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{completedTrips.length}</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', fontWeight: 700 }}>Trips completed</div>
        </Card>
        <Card style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{memoryCount}</div>
          <div style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', fontWeight: 700 }}>Memories</div>
        </Card>
      </div>

      {cities.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>City stamps</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {cities.map(city => (
              <div key={city} style={{
                width: 84, height: 84, borderRadius: '50%', border: '3px dashed var(--kumo-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                fontSize: 12, fontWeight: 600, color: 'var(--kumo-primary-text)', padding: 6,
                background: 'var(--kumo-soft)', transform: `rotate(${(city.length % 5) - 2}deg)`,
              }}>
                {city}
              </div>
            ))}
          </div>
        </div>
      )}

      {countries.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>Country stamps</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {countries.map(c => (
              <div key={c} style={{
                width: 100, height: 70, borderRadius: 12, border: '2px solid var(--kumo-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                fontSize: 13, fontWeight: 600, color: '#9C5A3E', padding: 6,
                background: '#FBEAE2', transform: `rotate(${(c.length % 4) - 2}deg)`,
              }}>
                {c}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>Achievements</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {ACHIEVEMENTS.map(a => {
            const { current, target } = progressFor(a.id);
            const done = current >= target;
            const pct = Math.min(100, Math.round((current / target) * 100));
            return (
              <Card key={a.id} style={{ opacity: done ? 1 : 0.85 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 28, filter: done ? 'none' : 'grayscale(1) opacity(0.5)' }}>{a.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--kumo-text-soft)' }}>{a.desc}</div>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--kumo-soft)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: done ? 'var(--kumo-primary)' : 'var(--kumo-accent)', borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--kumo-text-soft)', marginTop: 4, fontWeight: 700 }}>{current} / {target}</div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CLOUD SYNC — auth-aware section used inside SettingsPage
// ============================================================

function SyncSection({ data, setData, onOpenAuth }) {
  const cs = data.settings.cloudSync || {};
  const user = cs.currentUser; // { uid, email } if signed in
  const [status, setStatus] = useState({ state: 'idle', msg: '' });

  const updateCs = patch => setData(d => ({
    ...d, settings: { ...d.settings, cloudSync: { ...d.settings.cloudSync, ...patch } },
  }));

  const getConfig = () => parseFirebaseConfig(cs.firebaseConfigRaw || '');
  const fmt = ms => ms ? new Date(ms).toLocaleString() : 'never';

  const handlePush = async () => {
    const config = getConfig();
    if (!config || !user) return;
    setStatus({ state: 'working', msg: 'Pushing to cloud…' });
    try {
      await pushToCloud(config, user.uid, data);
      updateCs({ lastPushedAtMs: Date.now() });
      setStatus({ state: 'ok', msg: 'Pushed! Your other devices will receive updates next time they open Kumo.' });
    } catch (e) { setStatus({ state: 'err', msg: e.message }); }
  };

  const handlePull = async () => {
    const config = getConfig();
    if (!config || !user) return;
    setStatus({ state: 'working', msg: 'Fetching from cloud…' });
    try {
      const result = await pullFromCloud(config, user.uid);
      if (!result) { setStatus({ state: 'err', msg: 'Nothing in the cloud yet — push from another device first.' }); return; }
      const merged = restoreAssets(result.data, data);
      merged.settings = {
        ...merged.settings,
        anthropicApiKey: data.settings.anthropicApiKey,
        cloudSync: { ...data.settings.cloudSync, lastPulledAtMs: result.updatedAtMs },
      };
      setData(merged);
      setStatus({ state: 'ok', msg: 'Loaded latest data from cloud.' });
    } catch (e) { setStatus({ state: 'err', msg: e.message }); }
  };

  const handleSignOut = async () => {
    const config = getConfig();
    if (!config) return;
    try { await logoutUser(config); } catch {}
    updateCs({ currentUser: null, lastPushedAtMs: 0, lastPulledAtMs: 0 });
    setStatus({ state: 'idle', msg: '' });
  };

  const handleToggleAuto = e => updateCs({ autoSync: e.target.checked });

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Cloud size={16} /> Account &amp; sync
      </div>

      {!user ? (
        /* ── Not signed in ── */
        <div>
          <p style={{ fontSize: 13.5, color: 'var(--kumo-text-soft)', marginTop: 0, lineHeight: 1.7 }}>
            Your trips are saved only on this device right now. Sign in to keep them in your account and open them on any phone, tablet, or computer.
          </p>
          <ul style={{ margin: '0 0 14px', paddingLeft: 18, fontSize: 13, color: 'var(--kumo-text-soft)', lineHeight: 1.7 }}>
            <li>Sync trips across devices</li>
            <li>Sign in with Google or email</li>
            <li>Free — no credit card</li>
          </ul>
          <Btn icon={LogIn} onClick={onOpenAuth}>Sign in</Btn>
        </div>
      ) : (
        /* ── Signed in ── */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--kumo-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{(user.email || '?')[0].toUpperCase()}</span>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Signed in as {user.email}</div>
              <div style={{ fontSize: 12, color: '#3F8C7E', fontWeight: 700 }}>☁ Cloud sync active</div>
            </div>
            <Btn variant="ghost" size="sm" onClick={handleSignOut} style={{ marginLeft: 'auto' }}>Sign out</Btn>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={!!cs.autoSync} onChange={handleToggleAuto} />
            Auto-sync changes as I edit
          </label>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn size="sm" variant="secondary" icon={status.state === 'working' ? LoaderCircle : RefreshCw} onClick={handlePush} disabled={status.state === 'working'}>Push to cloud</Btn>
            <Btn size="sm" variant="secondary" icon={status.state === 'working' ? LoaderCircle : Cloud} onClick={handlePull} disabled={status.state === 'working'}>Pull from cloud</Btn>
          </div>

          {status.msg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginTop: 10, color: status.state === 'err' ? '#C75C4A' : status.state === 'ok' ? '#3F8C7E' : 'var(--kumo-text-soft)' }}>
              {status.state === 'err' ? <TriangleAlert size={14} /> : <CircleCheck size={14} />}
              {status.msg}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: 'var(--kumo-text-soft)', marginTop: 10 }}>
            Last pushed: {fmt(cs.lastPushedAtMs)} · Last pulled: {fmt(cs.lastPulledAtMs)}
          </div>
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--kumo-text-soft)', cursor: 'pointer' }}>What gets synced?</summary>
            <p style={{ fontSize: 12, color: 'var(--kumo-text-soft)', lineHeight: 1.7, marginTop: 6 }}>
              Trips, itinerary, places, stays, transport, routes, finances, memory text/ratings/tags, journal notes, passport progress, and settings. <strong>Photos and uploaded files stay on this device</strong> to keep data small and within Firebase's free limits. Use <em>Export full archive (JSON)</em> below for a complete backup.
            </p>
          </details>
        </div>
      )}
    </Card>
  );
}

// ============================================================
// SETTINGS
// ============================================================

function SettingsPage({ data, setData, onOpenAuth }) {
  const set = (k, v) => setData(d => ({ ...d, settings: { ...d.settings, [k]: v } }));

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kumo_archive.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileRef = useRef(null);
  const importAll = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed && parsed.trips) setData(parsed);
      } catch {}
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, sync, and preferences" />

      <SyncSection data={data} setData={setData} onOpenAuth={onOpenAuth} />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Appearance</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kumo-text-soft)', marginBottom: 8 }}>Color theme</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PASTEL_THEMES.map(theme => (
            <button key={theme.id} onClick={() => set('theme', theme.id)} style={{
              border: data.settings.theme === theme.id ? `2px solid ${theme.primary}` : '2px solid transparent',
              borderRadius: 16, padding: 8, background: theme.surface, cursor: 'pointer', textAlign: 'center', width: 90,
            }}>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 6 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: theme.primary, display: 'inline-block' }} />
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: theme.accent, display: 'inline-block' }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{theme.name}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Preferences</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input label="Your name" value={data.settings.name} onChange={e => set('name', e.target.value)} style={{ maxWidth: 220 }} />
          <Select label="Default currency" value={data.settings.defaultCurrency} onChange={e => set('defaultCurrency', e.target.value)} style={{ maxWidth: 160 }}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--kumo-text-soft)', marginTop: 8 }}>New trips and expenses will default to this currency. You can override it per trip or expense.</p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Import & export</div>
        <p style={{ fontSize: 13, color: 'var(--kumo-text-soft)', marginTop: 0 }}>Back up your entire travel archive, or restore from a previous export.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn icon={Download} variant="secondary" onClick={exportAll}>Export full archive (JSON)</Btn>
          <Btn variant="outline" onClick={() => fileRef.current && fileRef.current.click()}>Import archive</Btn>
          <input ref={fileRef} type="file" accept="application/json" onChange={importAll} style={{ display: 'none' }} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--kumo-text-soft)', marginTop: 8 }}>
          To import an itinerary, places, hotels, transport, or expenses from an Excel/CSV file,
          open a trip and use its "Import from Excel" button.
        </p>
      </Card>

      <Card>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>About Kumo</div>
        <p style={{ fontSize: 13.5, color: 'var(--kumo-text-soft)', lineHeight: 1.6, marginTop: 0 }}>
          Kumo is your personal travel operating system — for planning trips, organizing logistics, tracking finances,
          and building a lifelong archive of memories. Not just where trips are planned, but where they're remembered.
        </p>
      </Card>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

function TripSelector({ trips, selectedId, onSelect }) {
  if (trips.length === 0) return null;
  return (
    <select value={selectedId || ''} onChange={e => onSelect(e.target.value)} style={{ ...inputStyle, width: 'auto', fontWeight: 700, maxWidth: 220 }}>
      <option value="">Select a trip...</option>
      {trips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  );
}

export default function KumoApp() {
  const [data, setData, loaded] = useKumoData();
  const [activePage, setActivePage] = useState('trips');
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !window.localStorage.getItem('kumo-onboarding-done');
    } catch {
      return true;
    }
  });
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 820 : false);
  const [syncBanner, setSyncBanner] = useState(null); // { cloudData, updatedAtMs }
  const [syncReady, setSyncReady] = useState(false);
  const skipPushRef = useRef(false);
  const initialSyncCheckRef = useRef(false);
  const pushTimerRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 820);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // One-time check on load: is there newer data waiting in the cloud?
  // Auto-push is held off (syncReady stays false) until this resolves, so we
  // never push stale local data over something newer from another device.
  useEffect(() => {
    if (!loaded || !data) return;
    if (initialSyncCheckRef.current) return;
    initialSyncCheckRef.current = true;
    const cs = data.settings.cloudSync;
    if (!cs || !cs.autoSync || !cs.currentUser) { setSyncReady(true); return; }
    const config = parseFirebaseConfig(cs.firebaseConfigRaw);
    if (!config || !cs.currentUser?.uid) { setSyncReady(true); return; }
    (async () => {
      try {
        const result = await pullFromCloud(config, cs.currentUser.uid);
        if (!result) {
          // Nothing pushed yet from any device — seed the cloud with what we have
          await pushToCloud(config, cs.currentUser.uid, data);
          skipPushRef.current = true;
          setData(d => ({ ...d, settings: { ...d.settings, cloudSync: { ...d.settings.cloudSync, lastPushedAtMs: Date.now() } } }));
          setSyncReady(true);
          return;
        }
        const lastKnown = Math.max(cs.lastPushedAtMs || 0, cs.lastPulledAtMs || 0);
        if (result.updatedAtMs > lastKnown + 2000) {
          setSyncBanner({ cloudData: result.data, updatedAtMs: result.updatedAtMs });
          // syncReady stays false until the user resolves the banner
        } else {
          setSyncReady(true);
        }
      } catch (err) {
        console.warn('Kumo cloud sync check failed', err);
        setSyncReady(true);
      }
    })();
  }, [loaded, data]);

  // Debounced auto-push of changes when cloud sync is enabled
  useEffect(() => {
    if (!loaded || !data || !syncReady) return;
    const cs = data.settings.cloudSync;
    if (!cs || !cs.autoSync || !cs.currentUser) return;
    if (skipPushRef.current) { skipPushRef.current = false; return; }
    const config = parseFirebaseConfig(cs.firebaseConfigRaw);
    if (!config || !cs.currentUser?.uid) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      try {
        await pushToCloud(config, cs.currentUser.uid, data);
        skipPushRef.current = true;
        setData(d => ({ ...d, settings: { ...d.settings, cloudSync: { ...d.settings.cloudSync, lastPushedAtMs: Date.now() } } }));
      } catch (err) {
        console.warn('Kumo cloud auto-push failed', err);
      }
    }, 2500);
    return () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); };
  }, [data, loaded, syncReady]);

  const loadCloudData = () => {
    if (!syncBanner || !data) return;
    const merged = restoreAssets(syncBanner.cloudData, data);
    merged.settings = {
      ...merged.settings,
      anthropicApiKey: data.settings.anthropicApiKey,
      cloudSync: { ...data.settings.cloudSync, lastPulledAtMs: syncBanner.updatedAtMs },
    };
    skipPushRef.current = true;
    setData(merged);
    setSyncBanner(null);
    setSyncReady(true);
  };

  const keepLocalData = () => {
    setSyncBanner(null);
    setSyncReady(true);
  };

  // Handle successful auth (sign-in or register)
  const handleConnected = async ({ user, config, configRaw }) => {
    setShowAuth(false);
    // Persist auth state + config
    setData(d => ({
      ...d,
      settings: {
        ...d.settings,
        cloudSync: {
          ...d.settings.cloudSync,
          firebaseConfigRaw: configRaw,
          currentUser: { uid: user.uid, email: user.email },
          autoSync: true,
          lastPushedAtMs: 0,
          lastPulledAtMs: 0,
        },
      },
    }));
    // Immediately try to pull cloud data and seed if nothing there yet
    try {
      const result = await pullFromCloud(config, user.uid);
      if (result) {
        setSyncBanner({ cloudData: result.data, updatedAtMs: result.updatedAtMs });
      } else {
        // First sign-in on this device — push local data up
        await pushToCloud(config, user.uid, data);
        setData(d => ({ ...d, settings: { ...d.settings, cloudSync: { ...d.settings.cloudSync, lastPushedAtMs: Date.now() } } }));
        setSyncReady(true);
      }
    } catch (e) {
      console.warn('Kumo: initial sync failed', e);
      setSyncReady(true);
    }
  };

  // Pages that require a selected trip — auto pick the first trip if none selected
  const TRIP_SCOPED = ['itinerary','places','stays','transport','routes','finances','documents','memories','journal'];

  useEffect(() => {
    if (!data) return;
    if (!selectedTripId && data.trips.length > 0) {
      setSelectedTripId(data.trips[0].id);
    }
  }, [data, selectedTripId]);

  if (!loaded || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#888' }}>
        Loading Kumo...
      </div>
    );
  }

  const theme = PASTEL_THEMES.find(t => t.id === data.settings.theme) || PASTEL_THEMES[0];
  const selectedTrip = data.trips.find(t => t.id === selectedTripId) || null;

  const cssVars = {
    '--kumo-primary': theme.primary,
    '--kumo-accent': theme.accent,
    '--kumo-surface': theme.surface,
    '--kumo-soft': theme.soft,
    '--kumo-text': '#1C1917',
    '--kumo-text-soft': '#78716C',
    '--kumo-primary-text': theme.primary,
  };

  const navigate = (page) => {
    setActivePage(page);
  };

  const openTripDashboard = (tripId) => {
    setSelectedTripId(tripId);
    setActivePage('trip-dashboard');
  };

  const pageTitle = NAV_ITEMS.find(n => n.id === activePage)?.label
    || (activePage === 'trip-dashboard' ? (selectedTrip ? selectedTrip.name : 'Trip') : 'Kumo');

  let content;
  switch (activePage) {
    case 'trips':
      content = <TripsListPage data={data} setData={setData} onOpenTrip={openTripDashboard} />;
      break;
    case 'trip-dashboard':
      content = selectedTrip
        ? <TripDashboard data={data} setData={setData} trip={selectedTrip} onNavigate={navigate} onImport={() => setShowImport(true)} />
        : <EmptyState icon={House} title="No trip selected" subtitle="Go to Trips and select one to see its dashboard." />;
      break;
    case 'itinerary':
      content = <ItineraryPage data={data} setData={setData} trip={selectedTrip} />;
      break;
    case 'places':
      content = <PlacesPage key={selectedTrip ? selectedTrip.id : 'none'} data={data} setData={setData} trip={selectedTrip} />;
      break;
    case 'stays':
      content = <StaysPage data={data} setData={setData} trip={selectedTrip} />;
      break;
    case 'transport':
      content = <TransportPage data={data} setData={setData} trip={selectedTrip} />;
      break;
    case 'routes':
      content = <RoutesPage data={data} setData={setData} trip={selectedTrip} />;
      break;
    case 'finances':
      content = <FinancesPage data={data} setData={setData} trip={selectedTrip} />;
      break;
    case 'documents':
      content = <DocumentsPage data={data} setData={setData} trip={selectedTrip} />;
      break;
    case 'memories':
      content = <MemoriesPage data={data} setData={setData} trip={selectedTrip} />;
      break;
    case 'journal':
      content = <JournalPage data={data} trip={selectedTrip} />;
      break;
    case 'passport':
      content = <PassportPage data={data} />;
      break;
    case 'settings':
      content = <SettingsPage data={data} setData={setData} onOpenAuth={() => setShowAuth(true)} />;
      break;
    default:
      content = <TripsListPage data={data} setData={setData} onOpenTrip={openTripDashboard} />;
  }

  const showTripSelector = TRIP_SCOPED.includes(activePage) || activePage === 'trip-dashboard';

  return (
    <div style={{
      ...cssVars,
      fontFamily: 'Inter, system-ui, sans-serif', background: 'var(--kumo-surface)', color: 'var(--kumo-text)',
      minHeight: '100vh', display: 'flex',
    }}>
      <style>{`
        select, input, textarea, button { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      {!isMobile && (
        <Sidebar
          active={activePage === 'trip-dashboard' ? 'trips' : activePage}
          onNavigate={navigate}
          tripName={selectedTrip ? selectedTrip.name : null}
          user={data.settings.cloudSync?.currentUser || null}
          onSignIn={() => setShowAuth(true)}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, paddingBottom: isMobile ? 70 : 0 }}>
        {isMobile && (
          <MobileTopBar
            title={pageTitle}
            onMenu={() => setShowMore(true)}
            user={data.settings.cloudSync?.currentUser || null}
            onAccount={() => navigate('settings')}
            onSignIn={() => setShowAuth(true)}
          />
        )}

        <div style={{ padding: isMobile ? '16px' : '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
          {syncBanner && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              background: 'var(--kumo-soft)', borderRadius: 14, padding: '10px 16px', marginBottom: 16,
            }}>
              <Cloud size={18} color="var(--kumo-primary-text)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, minWidth: 200 }}>
                Newer data was found in your cloud sync (from {new Date(syncBanner.updatedAtMs).toLocaleString()}). Load it onto this device?
              </div>
              <Btn size="sm" onClick={loadCloudData}>Load it</Btn>
              <Btn size="sm" variant="ghost" onClick={keepLocalData}>Keep mine</Btn>
            </div>
          )}
          {showTripSelector && data.trips.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--kumo-text-soft)' }}>Trip:</span>
              <TripSelector trips={data.trips} selectedId={selectedTripId} onSelect={setSelectedTripId} />
            </div>
          )}
          {content}
        </div>
      </div>

      {isMobile && <MobileBottomNav active={activePage} onNavigate={navigate} onMore={() => setShowMore(true)} />}
      {isMobile && showMore && (
        <MoreMenu
          active={activePage}
          onNavigate={navigate}
          onClose={() => setShowMore(false)}
          user={data.settings.cloudSync?.currentUser || null}
          onSignIn={() => setShowAuth(true)}
        />
      )}
      {showImport && selectedTrip && (
        <ImportWizard trip={selectedTrip} data={data} setData={setData} onClose={() => setShowImport(false)} />
      )}
      {showAuth && (
        <AuthModal
          onConnected={handleConnected}
          onClose={() => setShowAuth(false)}
        />
      )}
      {showOnboarding && (
        <Onboarding
          onComplete={(payload) => {
            setShowOnboarding(false);
            if (payload) {
              setData(d => ({
                ...d,
                settings: {
                  ...d.settings,
                  travelStyle: payload.travelStyle || d.settings.travelStyle,
                  visitedCountries: payload.visitedCountries || d.settings.visitedCountries || [],
                },
              }));
            }
          }}
          onSignIn={() => setShowAuth(true)}
        />
      )}
    </div>
  );
}
