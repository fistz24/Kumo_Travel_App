// Shared formatting / date / currency helpers + demo data factory
import {
  DOC_CATEGORIES_DEFAULT, EXPENSE_CATEGORIES_DEFAULT, PLACE_CATEGORIES,
} from './constants';

// ---------- Utilities ----------

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date)) return d;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const fmtDateShort = (d) => {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date)) return d;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const fmtWeekday = (d) => {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date)) return '';
  return date.toLocaleDateString(undefined, { weekday: 'short' });
};

export const daysBetween = (a, b) => {
  const d1 = new Date(a + 'T00:00:00');
  const d2 = new Date(b + 'T00:00:00');
  if (isNaN(d1) || isNaN(d2)) return 0;
  return Math.round((d2 - d1) / 86400000);
};

export const dateRange = (start, end) => {
  const out = [];
  if (!start || !end) return out;
  let cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  if (isNaN(cur) || isNaN(last)) return out;
  let guard = 0;
  while (cur <= last && guard < 366) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return out;
};

export const currencyFmt = (amount, currency) => {
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency || ''}`;
  }
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;


// ---------- Default / Demo Data ----------

export const createDemoData = () => {
  const tripId = uid();
  const day1 = uid(), day2 = uid(), day3 = uid(), day4 = uid();
  const hotel1 = uid();
  const placeRamen = uid(), placeShrine = uid(), placeCafe = uid();
  return {
    settings: {
      theme: 'sky',
      defaultCurrency: 'USD',
      name: 'Traveler',
      docCategories: [...DOC_CATEGORIES_DEFAULT],
      expenseCategories: [...EXPENSE_CATEGORIES_DEFAULT],
      placeCategories: [...PLACE_CATEGORIES],
      anthropicApiKey: '',
      visitedCountries: [],
      travelStyle: null,
      cloudSync: {
        firebaseConfigRaw: '',
        currentUser: null,
        autoSync: false,
        lastPushedAtMs: 0,
        lastPulledAtMs: 0,
      },
    },
    trips: [
      {
        id: tripId,
        name: 'Japan Autumn 2026',
        destination: 'Japan',
        startDate: '2026-11-10',
        endDate: '2026-11-17',
        description: 'Tokyo, Kyoto and Osaka — first big trip with friends. Aiming for autumn foliage and great food.',
        status: 'Planning',
        coverPhoto: '',
        budget: 2500,
        currency: 'USD',
      },
    ],
    itineraryDays: [
      { id: day1, tripId, date: '2026-11-10', city: 'Tokyo', notes: 'Arrival day — take it easy, adjust to time zone.', completed: false },
      { id: day2, tripId, date: '2026-11-11', city: 'Tokyo', notes: 'Explore Asakusa and Ueno.', completed: false },
      { id: day3, tripId, date: '2026-11-12', city: 'Tokyo', notes: 'Shibuya and Harajuku day.', completed: false },
      { id: day4, tripId, date: '2026-11-13', city: 'Kyoto', notes: 'Shinkansen to Kyoto, evening in Gion.', completed: false },
    ],
    activities: [
      { id: uid(), dayId: day2, time: '07:30', title: 'Senso-ji Temple', notes: 'Go early to avoid crowds', completed: false, placeId: placeShrine },
      { id: uid(), dayId: day2, time: '12:00', title: 'Lunch in Ueno Park', notes: '', completed: false, placeId: '' },
      { id: uid(), dayId: day3, time: '10:00', title: 'Shibuya Crossing', notes: '', completed: false, placeId: '' },
      { id: uid(), dayId: day3, time: '18:30', title: 'Ichiran Ramen dinner', notes: '', completed: false, placeId: placeRamen },
    ],
    places: [
      {
        id: placeRamen, tripId, name: 'Ichiran Ramen Shibuya', category: 'Restaurant',
        customCategory: 'Ramen', tags: ['ramen','solo-booth'], notes: 'Famous tonkotsu, individual booths.',
        website: '', openingHours: '10:00 - 22:00', priceRange: '$$',
        reservationRequired: false, reservationStatus: '', rating: 0,
        status: 'Wishlist', address: 'Shibuya, Tokyo', city: 'Tokyo', files: [],
      },
      {
        id: placeShrine, tripId, name: 'Fushimi Inari Shrine', category: 'Attraction',
        customCategory: '', tags: ['shrine','hiking','iconic','sakura'], notes: 'Thousands of torii gates, go at sunrise.',
        website: '', openingHours: '24 hours', priceRange: 'Free',
        reservationRequired: false, reservationStatus: '', rating: 0,
        status: 'Planned', address: 'Fushimi, Kyoto', city: 'Kyoto', files: [],
      },
      {
        id: placeCafe, tripId, name: '% Arabica Kyoto', category: 'Café',
        customCategory: 'Matcha Café', tags: ['coffee','riverside'], notes: 'Riverside seating, minimalist design.',
        website: '', openingHours: '08:00 - 18:00', priceRange: '$$',
        reservationRequired: false, reservationStatus: '', rating: 0,
        status: 'Wishlist', address: 'Arashiyama, Kyoto', city: 'Kyoto', files: [],
      },
    ],
    hotels: [
      {
        id: hotel1, tripId, name: 'Shinjuku Granbell Hotel', address: '2-14-5 Kabukicho, Shinjuku, Tokyo',
        checkIn: '2026-11-10', checkOut: '2026-11-13', confirmationNumber: 'GB-883201',
        website: '', phone: '', rating: 0, notes: 'Close to station, late checkout requested.', files: [],
        mapLink: '',
      },
    ],
    transport: [
      {
        id: uid(), tripId, type: 'Flight', departure: 'Los Angeles (LAX)', arrival: 'Tokyo (HND)',
        date: '2026-11-10', time: '01:15', bookingStatus: 'Booked', seatInfo: '34C',
        confirmationNumber: 'NH-XJ29K', cost: 780, currency: 'USD', notes: 'ANA direct flight', files: [],
      },
      {
        id: uid(), tripId, type: 'Train', departure: 'Tokyo Station', arrival: 'Kyoto Station',
        date: '2026-11-13', time: '09:00', bookingStatus: 'Booked', seatInfo: 'Car 7, 12A',
        confirmationNumber: 'JR-44213', cost: 130, currency: 'USD', notes: 'Shinkansen Hikari', files: [],
      },
    ],
    routes: [],
    documents: [],
    expenses: [
      { id: uid(), tripId, amount: 780, currency: 'USD', category: 'Transportation', date: '2026-11-10', notes: 'Round trip flight', payment: 'Credit Card', planned: true, attachments: [] },
      { id: uid(), tripId, amount: 450, currency: 'USD', category: 'Accommodation', date: '2026-11-10', notes: '3 nights Shinjuku hotel', payment: 'Credit Card', planned: true, attachments: [] },
      { id: uid(), tripId, amount: 35, currency: 'USD', category: 'Food', date: '2026-11-10', notes: 'Convenience store dinner', payment: 'Cash', planned: false, attachments: [] },
    ],
    memories: [],
    futureNotes: [
      { id: uid(), tripId, destination: 'Tokyo', note: 'Book Ichiran at least a week ahead — long lines at peak hours.', createdAt: '2026-06-01' },
    ],
    stamps: [],
  };
};

