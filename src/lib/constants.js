// Shared constants used across the app

// ---------- Constants ----------

export const PASTEL_THEMES = [
  { id: 'sky',    name: 'Sky Mist',     primary: '#7FA8D9', accent: '#F4A896', surface: '#FAF7F2', soft: '#E8EEF7' },
  { id: 'sage',   name: 'Sage Garden',  primary: '#8FAE8C', accent: '#F2C2A0', surface: '#F8F9F4', soft: '#E9F0E6' },
  { id: 'lav',    name: 'Lavender Fog', primary: '#A89AD4', accent: '#F6C6CC', surface: '#FAF8FC', soft: '#EFEAF7' },
  { id: 'peach',  name: 'Peach Sunset', primary: '#EFA98E', accent: '#9CC9C5', surface: '#FFF8F4', soft: '#FBEAE2' },
  { id: 'mint',   name: 'Mint Cloud',   primary: '#7CBAB0', accent: '#F4C6A8', surface: '#F5FAF9', soft: '#E3F2EE' },
  { id: 'sand',   name: 'Warm Sand',    primary: '#D2AC7A', accent: '#A8C4D9', surface: '#FCF8F2', soft: '#F2E7D6' },
  { id: 'rose',   name: 'Dusty Rose',   primary: '#D08FA0', accent: '#A8C9B5', surface: '#FCF6F7', soft: '#F5E6EA' },
  { id: 'slate',  name: 'Cloud Slate',  primary: '#90A4BD', accent: '#E8C2A0', surface: '#F7F8FA', soft: '#E8EDF2' },
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

