// Shared constants used across the app

// ---------- Constants ----------

export const PASTEL_THEMES = [
  { id: 'sky',    name: 'Sky Mist',     primary: '#5B8DEF', accent: '#E8D5C4', surface: '#F7F4EF', soft: '#E8F0FE' },
  { id: 'sage',   name: 'Sage Garden',  primary: '#5B9A6E', accent: '#E8D5C4', surface: '#F5F7F4', soft: '#E3F0E6' },
  { id: 'lav',    name: 'Lavender Fog', primary: '#8B7EC8', accent: '#E8D5C4', surface: '#F7F5FA', soft: '#EDE8F7' },
  { id: 'peach',  name: 'Peach Sunset', primary: '#E08A6A', accent: '#A8C4D9', surface: '#FBF6F2', soft: '#FBEAE2' },
  { id: 'mint',   name: 'Mint Cloud',   primary: '#4FA89A', accent: '#E8D5C4', surface: '#F4F9F8', soft: '#DFF0EC' },
  { id: 'sand',   name: 'Warm Sand',    primary: '#C49A6C', accent: '#5B8DEF', surface: '#F9F5EF', soft: '#F2E9DC' },
  { id: 'rose',   name: 'Dusty Rose',   primary: '#C97B8A', accent: '#A8C9B5', surface: '#FBF5F6', soft: '#F5E6EA' },
  { id: 'slate',  name: 'Cloud Slate',  primary: '#6B8AAD', accent: '#E8D5C4', surface: '#F5F6F8', soft: '#E6ECF2' },
];

export const CURRENCIES = [
  'USD','EUR','GBP','JPY','CNY','AUD','CAD','CHF','HKD','SGD','SEK','KRW',
  'NOK','NZD','INR','MXN','TWD','ZAR','BRL','DKK','PLN','THB','IDR','HUF',
  'CZK','ILS','CLP','PHP','AED','COP','SAR','MYR','RON','VND','BGN','HRK',
  'ISK','TRY','PKR','EGP','QAR','KWD','BHD','OMR','JOD','MAD','NGN','KES',
  'GHS','ARS','UAH','RUB','PEN','UYU','BOB','PYG','DZD','TND','LKR',
  'BDT','NPR','MMK','KHR','LAK','MNT','KZT','UZS','AZN','GEL','AMD','BYN',
  'MDL','ALL','MKD','RSD','BAM','XOF','XAF','ETB','TZS','UGX','ZMW','MWK',
  'RWF','BIF','SDG','LYD','IQD','IRR','AFN','YER','SYP','LBP','BND','FJD',
  'PGK','WST','TOP','XPF','BBD','BSD','BZD','BMD','KYD','JMD','TTD','XCD',
  'HTG','DOP','GTQ','HNL','NIO','CRC','PAB','SVC',
];

export const PLACE_CATEGORIES = ['Restaurant','Café','Attraction','Shopping','Hidden Gem','Hotel','Other'];
export const PLACE_STATUSES = ['Wishlist','Planned','Visited','Skipped','Favorite'];
export const TRANSPORT_TYPES = ['Flight','Train','Bus','Metro','Car Rental','Ferry','Taxi'];
export const DOC_CATEGORIES_DEFAULT = ['Flights','Hotels','Restaurants','Transportation','Insurance','Visa','Other'];
export const EXPENSE_CATEGORIES_DEFAULT = ['Accommodation','Food','Transportation','Activities','Shopping','Miscellaneous'];
export const TRIP_STATUSES = ['Planning','Upcoming','Active','Completed','Archived'];
export const MEMORY_TYPES = ['Restaurant','Hotel','Place','Daily','Custom'];
export const PAYMENT_METHODS = ['Cash','Credit Card','Debit Card','Mobile Pay','Bank Transfer','Other'];

export const ACHIEVEMENTS = [
  { id: 'ramen',   icon: '🍜', name: 'Ramen Lover',     desc: 'Tag 3 places as "Ramen"' },
  { id: 'cafe',    icon: '☕', name: 'Café Hunter',     desc: 'Visit 5 cafés' },
  { id: 'temple',  icon: '🏯', name: 'Temple Explorer', desc: 'Visit 5 attractions' },
  { id: 'sakura',  icon: '🌸', name: 'Sakura Chaser',   desc: 'Tag a place "sakura"' },
  { id: 'city',    icon: '🗺️', name: 'City Collector',  desc: 'Visit 5 different cities' },
  { id: 'flyer',   icon: '✈️', name: 'Frequent Flyer',  desc: 'Log 5 flights' },
  { id: 'keeper',  icon: '📸', name: 'Memory Keeper',   desc: 'Create 10 memories' },
];

