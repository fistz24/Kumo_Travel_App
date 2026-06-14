// Persists the entire Kumo data object to localStorage.
import { useState, useEffect } from 'react';
import {
  DOC_CATEGORIES_DEFAULT, EXPENSE_CATEGORIES_DEFAULT, PLACE_CATEGORIES,
} from './constants';
import { createDemoData } from './utils';

export const STORAGE_KEY = 'kumo-data';

export function useKumoData() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Backfill settings for forward-compat
        parsed.settings = {
          theme: 'sky', defaultCurrency: 'USD', name: 'Traveler',
          docCategories: [...DOC_CATEGORIES_DEFAULT],
          expenseCategories: [...EXPENSE_CATEGORIES_DEFAULT],
          placeCategories: [...PLACE_CATEGORIES],
          anthropicApiKey: '',
          ...(parsed.settings || {}),
        };
        parsed.routes = parsed.routes || [];
        parsed.documents = parsed.documents || [];
        parsed.memories = parsed.memories || [];
        parsed.futureNotes = parsed.futureNotes || [];
        parsed.stamps = parsed.stamps || [];
        setData(parsed);
      } else {
        setData(createDemoData());
      }
    } catch {
      setData(createDemoData());
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !data) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        // localStorage may be full (e.g. too many large photos) — fail silently
        console.warn('Kumo: failed to save to localStorage', err);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [data, loaded]);

  return [data, setData, loaded];
}
