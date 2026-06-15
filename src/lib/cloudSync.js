// Optional, free cross-device sync.
//
// Kumo has no backend of its own. To sync between devices (e.g. phone and
// desktop) without any cost, this module lets you connect your *own* free
// Firebase project (Firestore, Spark/free plan — generous daily quotas that
// personal trip data won't come close to).
//
// Only "structured" data is synced (trips, itinerary, places, hotels,
// transport, expenses, finances, memories' text/ratings, journal, passport,
// settings). Embedded photos and uploaded files (which can be large) stay
// local to each device — use Settings → "Export full archive" for a complete
// backup including those.
//
// Firebase modules are loaded dynamically so they're only downloaded when
// cloud sync is actually enabled.

let firebaseModules = null;
let cachedApp = null;
let cachedConfigKey = null;

async function loadFirebase() {
  if (!firebaseModules) {
    const [appMod, fsMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/firestore'),
    ]);
    firebaseModules = {
      initializeApp: appMod.initializeApp,
      getApps: appMod.getApps,
      getFirestore: fsMod.getFirestore,
      doc: fsMod.doc,
      getDoc: fsMod.getDoc,
      setDoc: fsMod.setDoc,
      serverTimestamp: fsMod.serverTimestamp,
    };
  }
  return firebaseModules;
}

async function getApp(config) {
  const mods = await loadFirebase();
  const key = JSON.stringify(config);
  if (cachedApp && cachedConfigKey === key) return { mods, app: cachedApp };
  const existing = mods.getApps().find(a => a.name === 'kumo-sync');
  cachedApp = existing || mods.initializeApp(config, 'kumo-sync');
  cachedConfigKey = key;
  return { mods, app: cachedApp };
}

// ------------------------------------------------------------------
// Sync code
// ------------------------------------------------------------------

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Generates a random sync code. Enter the same code on every device you
 * want to sync — it acts as the shared "address" (and shared secret) for
 * your data in Firestore. Keep it private. */
export function generateSyncCode(length = 24) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

// ------------------------------------------------------------------
// Firebase config parsing
// ------------------------------------------------------------------

/**
 * Accepts the config object copy-pasted from the Firebase console, which is
 * usually a JS object literal (unquoted keys, possibly wrapped in
 * `const firebaseConfig = { ... };`) rather than strict JSON.
 */
export function parseFirebaseConfig(raw) {
  if (!raw || !raw.trim()) return null;
  let str = raw.trim();
  // Strip a leading `const firebaseConfig = ` / `export default` and trailing `;`
  str = str.replace(/^(export\s+default\s+|const\s+\w+\s*=\s*|let\s+\w+\s*=\s*|var\s+\w+\s*=\s*)/, '');
  str = str.replace(/;\s*$/, '');
  try {
    return JSON.parse(str);
  } catch {
    // Fall back to evaluating as a JS object literal (user's own pasted config)
    try {
      // eslint-disable-next-line no-new-func
      const value = new Function(`"use strict"; return (${str});`)();
      if (value && typeof value === 'object') return value;
    } catch {
      // ignore
    }
  }
  return null;
}

// ------------------------------------------------------------------
// Stripping/restoring large embedded assets (photos, file blobs)
// ------------------------------------------------------------------

/** Removes large base64 blobs before sending data to the cloud. */
export function stripAssets(data) {
  return {
    ...data,
    places: (data.places || []).map(p => ({ ...p, files: [] })),
    hotels: (data.hotels || []).map(h => ({ ...h, files: [] })),
    transport: (data.transport || []).map(t => ({ ...t, files: [] })),
    documents: (data.documents || []).map(d => ({ ...d, fileData: '' })),
    memories: (data.memories || []).map(m => ({ ...m, photos: [] })),
  };
}

/** Restores locally-held assets onto data pulled from the cloud, matching by record id. */
export function restoreAssets(cloudData, localData) {
  const byId = (arr) => Object.fromEntries((arr || []).map(x => [x.id, x]));
  const lp = byId(localData.places), lh = byId(localData.hotels),
        lt = byId(localData.transport), ld = byId(localData.documents),
        lm = byId(localData.memories);
  return {
    ...cloudData,
    places: (cloudData.places || []).map(p => ({ ...p, files: lp[p.id]?.files || [] })),
    hotels: (cloudData.hotels || []).map(h => ({ ...h, files: lh[h.id]?.files || [] })),
    transport: (cloudData.transport || []).map(t => ({ ...t, files: lt[t.id]?.files || [] })),
    documents: (cloudData.documents || []).map(d => ({ ...d, fileData: ld[d.id]?.fileData || '' })),
    memories: (cloudData.memories || []).map(m => ({ ...m, photos: lm[m.id]?.photos || [] })),
  };
}

// ------------------------------------------------------------------
// Push / pull
// ------------------------------------------------------------------

const COLLECTION = 'kumo-sync';

/** Pushes the current (asset-stripped) data to the cloud document. */
export async function pushToCloud(config, syncCode, data) {
  const { mods, app } = await getApp(config);
  const db = mods.getFirestore(app);
  const ref = mods.doc(db, COLLECTION, syncCode);
  const payload = stripAssets(data);
  await mods.setDoc(ref, {
    json: JSON.stringify(payload),
    updatedAt: mods.serverTimestamp(),
    updatedAtMs: Date.now(),
  });
}

/**
 * Pulls the cloud document, if any.
 * Returns `{ data, updatedAtMs }` or `null` if nothing has been pushed yet.
 */
export async function pullFromCloud(config, syncCode) {
  const { mods, app } = await getApp(config);
  const db = mods.getFirestore(app);
  const ref = mods.doc(db, COLLECTION, syncCode);
  const snap = await mods.getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();
  let parsed;
  try {
    parsed = JSON.parse(d.json);
  } catch {
    return null;
  }
  return { data: parsed, updatedAtMs: d.updatedAtMs || 0 };
}
