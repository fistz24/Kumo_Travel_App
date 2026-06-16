// Kumo Cloud Sync — Firebase Auth + Firestore, free Spark plan.
//
// Each user signs in with email + password. Their data lives at:
//   firestore: kumo-users/{uid}/data/main
//
// Only structured data is synced (trips, itinerary, places, hotels,
// transport, finances, memories text/ratings, journal, passport, settings).
// Photos and uploaded files stay on-device to keep docs small and free.
//
// All Firebase modules are loaded dynamically so bundle cost is zero
// unless the user actually enables sync.

let _mods = null;
let _app = null;
let _configKey = null;

async function getMods() {
  if (_mods) return _mods;
  const [appMod, authMod, fsMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  _mods = {
    // app
    initializeApp: appMod.initializeApp,
    getApps: appMod.getApps,
    // auth
    getAuth: authMod.getAuth,
    createUserWithEmailAndPassword: authMod.createUserWithEmailAndPassword,
    signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
    signOut: authMod.signOut,
    onAuthStateChanged: authMod.onAuthStateChanged,
    sendPasswordResetEmail: authMod.sendPasswordResetEmail,
    // firestore
    getFirestore: fsMod.getFirestore,
    doc: fsMod.doc,
    getDoc: fsMod.getDoc,
    setDoc: fsMod.setDoc,
    serverTimestamp: fsMod.serverTimestamp,
  };
  return _mods;
}

async function getApp(config) {
  const mods = await getMods();
  const key = JSON.stringify(config);
  if (_app && _configKey === key) return { mods, app: _app };
  const existing = mods.getApps().find(a => a.name === 'kumo');
  _app = existing || mods.initializeApp(config, 'kumo');
  _configKey = key;
  return { mods, app: _app };
}

// ------------------------------------------------------------------
// Firebase config parser — accepts the object pasted from Firebase
// console (may be JS literal, not strict JSON)
// ------------------------------------------------------------------
export function parseFirebaseConfig(raw) {
  if (!raw || !raw.trim()) return null;
  let str = raw.trim()
    .replace(/^(export\s+default\s+|const\s+\w+\s*=\s*|let\s+\w+\s*=\s*|var\s+\w+\s*=\s*)/, '')
    .replace(/;\s*$/, '');
  try { return JSON.parse(str); } catch {}
  try {
    // eslint-disable-next-line no-new-func
    const v = new Function(`"use strict"; return (${str});`)();
    if (v && typeof v === 'object') return v;
  } catch {}
  return null;
}

// ------------------------------------------------------------------
// Auth helpers
// ------------------------------------------------------------------
export async function registerUser(config, email, password) {
  const { mods, app } = await getApp(config);
  const auth = mods.getAuth(app);
  const cred = await mods.createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginUser(config, email, password) {
  const { mods, app } = await getApp(config);
  const auth = mods.getAuth(app);
  const cred = await mods.signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser(config) {
  const { mods, app } = await getApp(config);
  const auth = mods.getAuth(app);
  await mods.signOut(auth);
}

export async function sendReset(config, email) {
  const { mods, app } = await getApp(config);
  const auth = mods.getAuth(app);
  await mods.sendPasswordResetEmail(auth, email);
}

export async function getCurrentUser(config) {
  const { mods, app } = await getApp(config);
  const auth = mods.getAuth(app);
  return auth.currentUser;
}

export function subscribeToAuthState(config, callback) {
  let unsub = () => {};
  getApp(config).then(({ mods, app }) => {
    const auth = mods.getAuth(app);
    unsub = mods.onAuthStateChanged(auth, callback);
  });
  return () => unsub();
}

// ------------------------------------------------------------------
// Asset stripping / restoring (photos & files stay local)
// ------------------------------------------------------------------
export function stripAssets(data) {
  return {
    ...data,
    places:    (data.places    || []).map(p => ({ ...p, files: [] })),
    hotels:    (data.hotels    || []).map(h => ({ ...h, files: [] })),
    transport: (data.transport || []).map(t => ({ ...t, files: [] })),
    documents: (data.documents || []).map(d => ({ ...d, fileData: '' })),
    memories:  (data.memories  || []).map(m => ({ ...m, photos: [] })),
  };
}

export function restoreAssets(cloudData, localData) {
  const byId = arr => Object.fromEntries((arr || []).map(x => [x.id, x]));
  const lp = byId(localData.places),    lh = byId(localData.hotels),
        lt = byId(localData.transport), ld = byId(localData.documents),
        lm = byId(localData.memories);
  return {
    ...cloudData,
    places:    (cloudData.places    || []).map(p => ({ ...p, files:    lp[p.id]?.files    || [] })),
    hotels:    (cloudData.hotels    || []).map(h => ({ ...h, files:    lh[h.id]?.files    || [] })),
    transport: (cloudData.transport || []).map(t => ({ ...t, files:    lt[t.id]?.files    || [] })),
    documents: (cloudData.documents || []).map(d => ({ ...d, fileData: ld[d.id]?.fileData || '' })),
    memories:  (cloudData.memories  || []).map(m => ({ ...m, photos:   lm[m.id]?.photos   || [] })),
  };
}

// ------------------------------------------------------------------
// Push / pull (keyed by Firebase UID, not a shared code)
// ------------------------------------------------------------------
async function getUserDoc(config, uid) {
  const { mods, app } = await getApp(config);
  const db = mods.getFirestore(app);
  return { mods, ref: mods.doc(db, 'kumo-users', uid, 'data', 'main') };
}

export async function pushToCloud(config, uid, data) {
  const { mods, ref } = await getUserDoc(config, uid);
  await mods.setDoc(ref, {
    json: JSON.stringify(stripAssets(data)),
    updatedAt: mods.serverTimestamp(),
    updatedAtMs: Date.now(),
  });
}

export async function pullFromCloud(config, uid) {
  const { mods, ref } = await getUserDoc(config, uid);
  const snap = await mods.getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();
  try {
    return { data: JSON.parse(d.json), updatedAtMs: d.updatedAtMs || 0 };
  } catch { return null; }
}
