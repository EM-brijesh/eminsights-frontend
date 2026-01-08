// Inbox Page Constants

// Data fetching limits
export const DATA_LIMITS = {
  USER_POSTS: 200,
  BRAND_POSTS: 100,
  REFRESH_LIMIT: 100,
};

// Z-index layers for dropdowns
export const Z_INDEX = {
  BRAND_DROPDOWN: 40,
  DURATION_DROPDOWN: 50,
  CHANNEL_MENU: 50,
  FILTER_MENU: 50,
  FILTER_DRAWER: 50,
};

// Duration presets for date filtering
export const DURATION_PRESETS = [
  { label: 'Today', value: '1' },
  { label: 'Last 2 Days', value: '2' },
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 14 Days', value: '14' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 60 Days', value: '60' },
  { label: 'Last 90 Days', value: '90' },
];

// Tab configuration
export const TABS = [
  { key: 'tickets', label: 'Tickets', enabled: false },
  { key: 'all', label: 'All Mentions', enabled: true },
  { key: 'user', label: 'User Activity', enabled: false },
  { key: 'brand', label: 'Brand Activity', enabled: false },
  { key: 'actionable', label: 'Actionable', enabled: false },
  { key: 'non-actionable', label: 'Non Actionable', enabled: false },
];

// Platform options for filtering
export const PLATFORM_OPTIONS = [
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'instagram', label: 'Instagram' },
  
];

// Platform badge configuration
export const PLATFORM_BADGES = {
  twitter: {
    label: 'Public Tweets',
    color: 'bg-sky-500/15 text-sky-200 border-sky-500/40',
  },
  youtube: {
    label: 'YouTube',
    color: 'bg-red-500/15 text-red-200 border-red-500/40',
  },
  reddit: {
    label: 'Reddit',
    color: 'bg-orange-500/15 text-orange-200 border-orange-500/40',
  },
  news: {
    label: 'News',
    color: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
  },
  instagram: {
    label: 'Instagram',
    color: 'bg-pink-500/15 text-pink-200 border-pink-500/40',
  },
};

// Sentiment styling
export const SENTIMENT_STYLES = {
  negative: 'border-red-500/60 text-red-300',
  positive: 'border-emerald-500/60 text-emerald-300',
  neutral: 'border-cyan-400/50 text-cyan-200',
};

// Monitoring frequency options
export const FREQUENCY_OPTIONS = [
  { label: 'Every 5 minutes', value: '5m' },
  { label: 'Every 10 minutes', value: '10m' },
  { label: 'Every 30 minutes', value: '30m' },
  { label: 'Every 1 hour', value: '1h' },
  { label: 'Every 2 hours', value: '2h' },
];

// Time picker configuration
export const TIME_PICKER = {
  hours: Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
  minutes: ['00', '15', '30', '45'],
  periods: ['AM', 'PM'],
  defaultFrom: { h: '12', m: '00', ampm: 'AM' },
  defaultTo: { h: '11', m: '59', ampm: 'PM' },
};

// Error messages
export const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Authentication required. Please login.',
  LOAD_FAILED: 'Failed to load inbox data.',
  REFRESH_FAILED: 'Refresh failed. Please try again.',
  FREQUENCY_UPDATE_FAILED: 'Failed to update frequency.',
  NO_BRANDS: 'No brands available to configure.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  DATA_REFRESHED: 'Latest monitoring data fetched.',
  FREQUENCY_UPDATED: (label, selectedBrands) =>
    `Monitoring set to ${label.toLowerCase()}${selectedBrands.length ? '' : ' for all brands'}. Refreshing data…`,
};

// Default values
export const DEFAULTS = {
  DURATION: '2',
  SORT_ORDER: 'desc',
  ACTIVE_TAB: 'all',
};

// Performance thresholds
export const PERFORMANCE = {
  MAX_ERROR_COUNT: 3, // Max errors before showing critical error screen
  DEBOUNCE_DELAY: 300, // ms for debouncing operations
  STALE_TIME: 5 * 60 * 1000, // 5 minutes for cache
};

