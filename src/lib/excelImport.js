// Smart Excel/CSV import: parses workbooks with SheetJS, guesses what each
// sheet represents (itinerary, places, hotels, transport, expenses), and
// suggests a column → field mapping. Everything here is pure JS (no React)
// so it can run heuristics and, optionally, call the Anthropic API for a
// smarter mapping suggestion.

import * as XLSX from 'xlsx';
import { uid, todayISO } from './utils';

// ------------------------------------------------------------------
// Target record types Kumo can import into, and the fields each has.
// `aliases` are lowercased, alphanumeric-only header fragments used for
// fuzzy matching against spreadsheet column headers.
// ------------------------------------------------------------------

export const IMPORT_TYPES = {
  itinerary: {
    label: 'Itinerary (days & activities)',
    fields: {
      date:    { label: 'Date',          required: true,  aliases: ['date', 'day', 'itineraryday'] },
      city:    { label: 'City',          required: false, aliases: ['city', 'location', 'place', 'destination'] },
      time:    { label: 'Time',          required: false, aliases: ['time', 'starttime'] },
      title:   { label: 'Activity',      required: false, aliases: ['activity', 'title', 'plan', 'item', 'description', 'event'] },
      notes:   { label: 'Notes',         required: false, aliases: ['notes', 'note', 'remarks', 'comment', 'comments', 'details'] },
    },
  },
  places: {
    label: 'Places',
    fields: {
      name:        { label: 'Name',       required: true,  aliases: ['name', 'place', 'placename', 'restaurant', 'venue'] },
      category:    { label: 'Category',   required: false, aliases: ['category', 'type'] },
      city:        { label: 'City',       required: false, aliases: ['city', 'location'] },
      address:     { label: 'Address',    required: false, aliases: ['address', 'addr'] },
      tags:        { label: 'Tags',       required: false, aliases: ['tags', 'tag', 'labels'] },
      website:     { label: 'Website',    required: false, aliases: ['website', 'url', 'link'] },
      openingHours:{ label: 'Opening hours', required: false, aliases: ['openinghours', 'hours', 'opening'] },
      priceRange:  { label: 'Price range',required: false, aliases: ['pricerange', 'price', 'budget'] },
      rating:      { label: 'Rating',     required: false, aliases: ['rating', 'stars', 'score'] },
      status:      { label: 'Status',     required: false, aliases: ['status'] },
      notes:       { label: 'Notes',      required: false, aliases: ['notes', 'note', 'remarks', 'comment', 'comments'] },
    },
  },
  hotels: {
    label: 'Stays (hotels)',
    fields: {
      name:               { label: 'Hotel name', required: true,  aliases: ['hotel', 'hotelname', 'name', 'accommodation', 'property', 'stay'] },
      address:            { label: 'Address',    required: false, aliases: ['address', 'addr', 'location'] },
      checkIn:            { label: 'Check-in',   required: false, aliases: ['checkin', 'checkindate', 'arrival', 'from'] },
      checkOut:           { label: 'Check-out',  required: false, aliases: ['checkout', 'checkoutdate', 'departure', 'to'] },
      confirmationNumber: { label: 'Confirmation #', required: false, aliases: ['confirmation', 'confirmationnumber', 'confnumber', 'bookingref', 'reference', 'bookingnumber'] },
      phone:              { label: 'Phone',      required: false, aliases: ['phone', 'telephone', 'contact'] },
      website:            { label: 'Website',    required: false, aliases: ['website', 'url', 'link'] },
      notes:              { label: 'Notes',      required: false, aliases: ['notes', 'note', 'remarks', 'comment', 'comments'] },
    },
  },
  transport: {
    label: 'Transport',
    fields: {
      type:               { label: 'Type',       required: false, aliases: ['type', 'mode', 'transport', 'transporttype'] },
      departure:          { label: 'From',       required: true,  aliases: ['from', 'departure', 'origin', 'departingfrom'] },
      arrival:            { label: 'To',         required: true,  aliases: ['to', 'arrival', 'destination', 'arrivingat'] },
      date:               { label: 'Date',       required: false, aliases: ['date', 'departuredate'] },
      time:               { label: 'Time',       required: false, aliases: ['time', 'departuretime'] },
      bookingStatus:      { label: 'Booking status', required: false, aliases: ['status', 'bookingstatus'] },
      seatInfo:           { label: 'Seat info',  required: false, aliases: ['seat', 'seatinfo', 'cabin', 'class'] },
      confirmationNumber: { label: 'Confirmation #', required: false, aliases: ['confirmation', 'confirmationnumber', 'confnumber', 'bookingref', 'reference', 'pnr', 'ticketnumber'] },
      cost:               { label: 'Cost',       required: false, aliases: ['cost', 'price', 'amount', 'fare'] },
      currency:           { label: 'Currency',   required: false, aliases: ['currency', 'ccy'] },
      notes:              { label: 'Notes',      required: false, aliases: ['notes', 'note', 'remarks', 'comment', 'comments'] },
    },
  },
  expenses: {
    label: 'Finances (expenses)',
    fields: {
      amount:   { label: 'Amount',   required: true,  aliases: ['amount', 'cost', 'price', 'total', 'spent'] },
      currency: { label: 'Currency', required: false, aliases: ['currency', 'ccy'] },
      category: { label: 'Category', required: false, aliases: ['category', 'type'] },
      date:     { label: 'Date',     required: false, aliases: ['date'] },
      payment:  { label: 'Payment method', required: false, aliases: ['payment', 'paymentmethod', 'paidwith', 'paidvia'] },
      notes:    { label: 'Notes',    required: false, aliases: ['notes', 'note', 'remarks', 'comment', 'comments', 'description', 'item'] },
    },
  },
};

export const IMPORT_TYPE_ORDER = ['itinerary', 'places', 'hotels', 'transport', 'expenses'];

// ------------------------------------------------------------------
// Parsing
// ------------------------------------------------------------------

const normalizeHeader = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Reads a File (xlsx/xls/csv) and returns an array of:
 *   { sheetName, headers: string[], rows: object[][] (raw cell values keyed by header) }
 */
export async function parseWorkbook(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheets = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
    if (json.length === 0) continue;
    const headers = Object.keys(json[0]);
    sheets.push({ sheetName, headers, rows: json });
  }
  return sheets;
}

// ------------------------------------------------------------------
// Value coercion helpers
// ------------------------------------------------------------------

export function toISODate(value) {
  if (!value && value !== 0) return '';
  if (value instanceof Date) {
    if (isNaN(value)) return '';
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    // Excel serial date (days since 1899-12-30)
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return '';
    const mm = String(d.m).padStart(2, '0');
    const dd = String(d.d).padStart(2, '0');
    return `${d.y}-${mm}-${dd}`;
  }
  const str = String(value).trim();
  if (!str) return '';
  // Try common formats
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return '';
}

export function toTimeString(value) {
  if (value === '' || value == null) return '';
  if (value instanceof Date) {
    if (isNaN(value)) return '';
    const h = String(value.getUTCHours()).padStart(2, '0');
    const m = String(value.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  if (typeof value === 'number') {
    // Fraction of a day
    const totalMinutes = Math.round(value * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  }
  const str = String(value).trim();
  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = match[3] ? match[3].toLowerCase() : null;
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  return '';
}

export function toNumber(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

const toStr = (v) => (v == null ? '' : String(v).trim());

// ------------------------------------------------------------------
// Heuristic detection
// ------------------------------------------------------------------

/**
 * For a given list of headers, find the best matching field for each header
 * within a target type's field set, plus an overall confidence score for
 * that type.
 */
function scoreType(headers, typeKey) {
  const def = IMPORT_TYPES[typeKey];
  const normHeaders = headers.map(normalizeHeader);
  let score = 0;
  let requiredFound = 0;
  const requiredTotal = Object.values(def.fields).filter(f => f.required).length;
  const mapping = {};

  for (const [fieldKey, field] of Object.entries(def.fields)) {
    let bestHeader = null;
    let bestLen = 0;
    for (let i = 0; i < normHeaders.length; i++) {
      const nh = normHeaders[i];
      if (!nh) continue;
      for (const alias of field.aliases) {
        if (nh === alias || nh.includes(alias) || alias.includes(nh)) {
          // Prefer the longest / closest alias match
          const matchLen = Math.min(alias.length, nh.length);
          if (matchLen > bestLen) {
            bestLen = matchLen;
            bestHeader = headers[i];
          }
        }
      }
    }
    if (bestHeader) {
      mapping[fieldKey] = bestHeader;
      score += field.required ? 3 : 1;
      if (field.required) requiredFound++;
    }
  }

  // Penalize if required fields are missing
  if (requiredTotal > 0 && requiredFound < requiredTotal) {
    score -= (requiredTotal - requiredFound) * 2;
  }

  return { score, mapping, requiredFound, requiredTotal };
}

/**
 * Detects the most likely import type for a sheet and returns a suggested
 * column mapping, plus scores for all types (useful for the "change type"
 * dropdown to re-suggest a mapping).
 */
export function detectSheetType(sheet) {
  const { headers, sheetName } = sheet;
  const results = {};
  for (const typeKey of IMPORT_TYPE_ORDER) {
    results[typeKey] = scoreType(headers, typeKey);
  }

  // Small nudge based on sheet name keywords
  const nameNorm = normalizeHeader(sheetName);
  const nameHints = {
    itinerary: ['itinerary', 'plan', 'schedule', 'days', 'day'],
    places: ['places', 'restaurants', 'food', 'attractions', 'sights', 'cafes', 'shopping'],
    hotels: ['hotel', 'hotels', 'stay', 'stays', 'accommodation', 'lodging'],
    transport: ['transport', 'flight', 'flights', 'train', 'trains', 'travel'],
    expenses: ['expense', 'expenses', 'budget', 'finance', 'finances', 'cost', 'costs'],
  };
  for (const [typeKey, hints] of Object.entries(nameHints)) {
    if (hints.some(h => nameNorm.includes(h))) {
      results[typeKey].score += 2;
    }
  }

  let bestType = IMPORT_TYPE_ORDER[0];
  let bestScore = -Infinity;
  for (const typeKey of IMPORT_TYPE_ORDER) {
    if (results[typeKey].score > bestScore) {
      bestScore = results[typeKey].score;
      bestType = typeKey;
    }
  }

  // If nothing scored positively, mark as unrecognized (user can pick manually
  // or skip the sheet)
  const recognized = bestScore > 0;

  return {
    suggestedType: recognized ? bestType : null,
    mapping: recognized ? results[bestType].mapping : suggestMapping(headers, IMPORT_TYPE_ORDER[0]),
    allScores: results,
  };
}

/** Suggest a column mapping for a given (possibly user-overridden) type. */
export function suggestMapping(headers, typeKey) {
  return scoreType(headers, typeKey).mapping;
}

// ------------------------------------------------------------------
// Building Kumo records from mapped rows
// ------------------------------------------------------------------

const getVal = (row, mapping, field) => {
  const header = mapping[field];
  if (!header) return '';
  return row[header];
};

/**
 * Converts mapped rows into Kumo data records for the given type.
 * Returns a partial data-shape object that the caller merges into state.
 *   { itineraryDays: [...], activities: [...], places: [...], hotels: [...],
 *     transport: [...], expenses: [...] }
 */
export function buildRecords(typeKey, rows, mapping, tripId, defaultCurrency) {
  const out = { itineraryDays: [], activities: [], places: [], hotels: [], transport: [], expenses: [] };

  if (typeKey === 'itinerary') {
    const dayByDate = new Map();
    for (const row of rows) {
      const dateRaw = getVal(row, mapping, 'date');
      const date = toISODate(dateRaw);
      if (!date) continue; // skip rows without a usable date

      const city = toStr(getVal(row, mapping, 'city'));
      const time = toTimeString(getVal(row, mapping, 'time'));
      const title = toStr(getVal(row, mapping, 'title'));
      const notes = toStr(getVal(row, mapping, 'notes'));

      let day = dayByDate.get(date);
      if (!day) {
        day = { id: uid(), tripId, date, city, notes: '', completed: false };
        dayByDate.set(date, day);
        out.itineraryDays.push(day);
      } else if (!day.city && city) {
        day.city = city;
      }

      if (title) {
        out.activities.push({ id: uid(), dayId: day.id, time, title, notes, completed: false, placeId: '' });
      } else if (notes && !day.notes) {
        // No activity title but notes present -> treat as day-level note
        day.notes = notes;
      }
    }
  }

  if (typeKey === 'places') {
    for (const row of rows) {
      const name = toStr(getVal(row, mapping, 'name'));
      if (!name) continue;
      const tagsRaw = toStr(getVal(row, mapping, 'tags'));
      const tags = tagsRaw ? tagsRaw.split(/[,;]/).map(t => t.trim()).filter(Boolean) : [];
      const category = toStr(getVal(row, mapping, 'category'));
      const knownCategories = ['Restaurant','Café','Cafe','Attraction','Shopping','Hidden Gem','Hotel','Other'];
      const matchedCategory = knownCategories.find(c => c.toLowerCase() === category.toLowerCase());
      out.places.push({
        id: uid(), tripId,
        name,
        category: matchedCategory === 'Cafe' ? 'Café' : (matchedCategory || 'Other'),
        customCategory: matchedCategory ? '' : category,
        tags,
        notes: toStr(getVal(row, mapping, 'notes')),
        website: toStr(getVal(row, mapping, 'website')),
        openingHours: toStr(getVal(row, mapping, 'openingHours')),
        priceRange: toStr(getVal(row, mapping, 'priceRange')),
        reservationRequired: false,
        reservationStatus: '',
        rating: Math.min(5, Math.max(0, Math.round(toNumber(getVal(row, mapping, 'rating'))))),
        status: toStr(getVal(row, mapping, 'status')) || 'Wishlist',
        address: toStr(getVal(row, mapping, 'address')),
        city: toStr(getVal(row, mapping, 'city')),
        files: [],
      });
    }
  }

  if (typeKey === 'hotels') {
    for (const row of rows) {
      const name = toStr(getVal(row, mapping, 'name'));
      if (!name) continue;
      out.hotels.push({
        id: uid(), tripId,
        name,
        address: toStr(getVal(row, mapping, 'address')),
        checkIn: toISODate(getVal(row, mapping, 'checkIn')),
        checkOut: toISODate(getVal(row, mapping, 'checkOut')),
        confirmationNumber: toStr(getVal(row, mapping, 'confirmationNumber')),
        website: toStr(getVal(row, mapping, 'website')),
        phone: toStr(getVal(row, mapping, 'phone')),
        rating: 0,
        notes: toStr(getVal(row, mapping, 'notes')),
        mapLink: '',
        files: [],
      });
    }
  }

  if (typeKey === 'transport') {
    const knownTypes = ['Flight','Train','Bus','Metro','Car Rental','Ferry','Taxi'];
    for (const row of rows) {
      const departure = toStr(getVal(row, mapping, 'departure'));
      const arrival = toStr(getVal(row, mapping, 'arrival'));
      if (!departure && !arrival) continue;
      const typeRaw = toStr(getVal(row, mapping, 'type'));
      const matchedType = knownTypes.find(t => t.toLowerCase() === typeRaw.toLowerCase())
        || knownTypes.find(t => typeRaw.toLowerCase().includes(t.toLowerCase()));
      out.transport.push({
        id: uid(), tripId,
        type: matchedType || 'Flight',
        departure, arrival,
        date: toISODate(getVal(row, mapping, 'date')),
        time: toTimeString(getVal(row, mapping, 'time')),
        bookingStatus: toStr(getVal(row, mapping, 'bookingStatus')) || 'Planned',
        seatInfo: toStr(getVal(row, mapping, 'seatInfo')),
        confirmationNumber: toStr(getVal(row, mapping, 'confirmationNumber')),
        cost: toNumber(getVal(row, mapping, 'cost')),
        currency: toStr(getVal(row, mapping, 'currency')) || defaultCurrency || 'USD',
        notes: toStr(getVal(row, mapping, 'notes')),
        files: [],
      });
    }
  }

  if (typeKey === 'expenses') {
    for (const row of rows) {
      const amount = toNumber(getVal(row, mapping, 'amount'));
      if (!amount) continue;
      out.expenses.push({
        id: uid(), tripId,
        amount,
        currency: toStr(getVal(row, mapping, 'currency')) || defaultCurrency || 'USD',
        category: toStr(getVal(row, mapping, 'category')) || 'Miscellaneous',
        date: toISODate(getVal(row, mapping, 'date')) || todayISO(),
        notes: toStr(getVal(row, mapping, 'notes')),
        payment: toStr(getVal(row, mapping, 'payment')) || 'Cash',
        planned: false,
        attachments: [],
      });
    }
  }

  return out;
}

/** Merge several buildRecords() outputs into one. */
export function mergeRecordSets(sets) {
  const merged = { itineraryDays: [], activities: [], places: [], hotels: [], transport: [], expenses: [] };
  for (const s of sets) {
    for (const key of Object.keys(merged)) {
      merged[key].push(...(s[key] || []));
    }
  }
  return merged;
}

// ------------------------------------------------------------------
// Optional AI-assisted mapping via the Anthropic API
// ------------------------------------------------------------------

/**
 * Asks Claude to suggest, for each sheet, the best import type and a
 * column → field mapping. Returns the same shape as detectSheetType per
 * sheet: { [sheetName]: { suggestedType, mapping } }
 * Throws on network/parsing errors so the caller can fall back gracefully.
 */
export async function aiSuggestMapping(sheets, apiKey) {
  const fieldCatalog = {};
  for (const [typeKey, def] of Object.entries(IMPORT_TYPES)) {
    fieldCatalog[typeKey] = Object.keys(def.fields);
  }

  const sheetSummaries = sheets.map(s => ({
    sheetName: s.sheetName,
    headers: s.headers,
    sampleRows: s.rows.slice(0, 5).map(r => {
      const o = {};
      for (const h of s.headers) {
        const v = r[h];
        o[h] = v instanceof Date ? v.toISOString() : v;
      }
      return o;
    }),
  }));

  const prompt = `You are helping map spreadsheet columns into a travel app's data model.
Possible target types and their fields:
${JSON.stringify(fieldCatalog, null, 2)}

Here are the sheets, their headers, and a few sample rows:
${JSON.stringify(sheetSummaries, null, 2)}

For each sheet, decide the single best target type (or null if none fit /
the sheet should be skipped, e.g. a summary or notes sheet), and map each
relevant spreadsheet header to one field of that type. Only include headers
that map to a field; omit headers that don't apply.

Respond with ONLY valid JSON, no markdown, no commentary, in this exact shape:
{
  "SheetName1": { "suggestedType": "itinerary" | "places" | "hotels" | "transport" | "expenses" | null, "mapping": { "fieldKey": "Original Header" } },
  "SheetName2": { ... }
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic API error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).map(b => b.text || '').join('\n');
  const cleaned = textBlock.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return parsed;
}
