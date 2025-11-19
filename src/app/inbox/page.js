'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ActivitySquare,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  ExternalLink,
  Filter,
  Inbox,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCcw,
  Search,
  Users,
} from 'lucide-react';
import clsx from 'clsx';

import DottedBackground from '@/components/DottedBackground';
import { useAuth } from '@/app/hooks/useAuth';
import api from '@/lib/api';

const DURATION_PRESETS = [
  { label: 'Today', value: '1' },
  { label: 'Last 2 Days', value: '2' },
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 14 Days', value: '14' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 60 Days', value: '60' },
  { label: 'Last 90 Days', value: '90' },
];

const TABS = [
  { key: 'tickets', label: 'Tickets', icon: Inbox },
  { key: 'all', label: 'All Mentions', icon: ActivitySquare },
  { key: 'user', label: 'User Activity', icon: Users },
  { key: 'brand', label: 'Brand Activity', icon: ActivitySquare },
  { key: 'actionable', label: 'Actionable', icon: CheckCircle2 },
  { key: 'non-actionable', label: 'Non Actionable', icon: Circle },
];

const PLATFORM_OPTIONS = [
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'reddit', label: 'Reddit' },
];

function formatRelative(date) {
  if (!date) return 'NA';
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absDiff < hour) {
    const value = Math.round(diff / minute);
    return formatter.format(value, 'minute');
  }
  if (absDiff < day) {
    const value = Math.round(diff / hour);
    return formatter.format(value, 'hour');
  }
  if (absDiff < week) {
    const value = Math.round(diff / day);
    return formatter.format(value, 'day');
  }
  const value = Math.round(diff / week);
  return formatter.format(value, 'week');
}

function PlatformBadge({ platform }) {
  const map = {
    twitter: { label: 'Public Tweets', color: 'bg-sky-500/15 text-sky-200 border-sky-500/40' },
    youtube: { label: 'YouTube', color: 'bg-red-500/15 text-red-200 border-red-500/40' },
    reddit: { label: 'Reddit', color: 'bg-orange-500/15 text-orange-200 border-orange-500/40' },
    news: { label: 'News', color: 'bg-amber-500/15 text-amber-200 border-amber-500/40' },
  };
  const info = map[platform?.toLowerCase()] || map.news;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        info.color,
      )}
    >
      <Circle className="h-2 w-2" />
      {info.label}
    </span>
  );
}

function MentionCard({ post }) {
  const brandName = post?.brand?.brandName || 'Unknown Brand';
  const author = post?.author?.name || post?.author?.id || 'Anonymous';
  const platform = post?.platform || 'news';
  const sentiment = post?.analysis?.sentiment || 'neutral';
  const underlineColor =
    sentiment === 'negative'
      ? 'border-red-500/60 text-red-300'
      : sentiment === 'positive'
      ? 'border-emerald-500/60 text-emerald-300'
      : 'border-cyan-400/50 text-cyan-200';
  const createdAt = post?.createdAt || post?.fetchedAt;

  const engagement =
    post?.metrics?.likes ?? post?.metrics?.comments ?? post?.metrics?.shares ?? post?.metrics?.views ?? 'NA';
  const reach = post?.analysis?.engagementScore ?? 'NA';

  return (
    <article className="group overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-6 shadow-lg shadow-black/10 transition hover:border-white/15 hover:shadow-black/30">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlatformBadge platform={platform} />
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('rounded-full border px-3 py-1 text-xs font-medium', underlineColor)}>
            {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white">
            <Users className="h-4 w-4 text-indigo-300" />
            {brandName}
          </span>
          <span className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4 text-gray-500" />
            {formatRelative(createdAt)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="font-semibold text-white">{author}</span>
          <span className="text-xs uppercase tracking-widest text-gray-500">• {platform}</span>
        </div>
        <p className="text-base leading-relaxed text-gray-100">
          {post?.content?.text ||
            post?.content?.description ||
            'No text content available for this mention.'}
        </p>
        {post?.sourceUrl && (
          <Link
            href={post.sourceUrl}
            target="_blank"
            className="inline-flex items-center gap-2 text-sm text-indigo-300 transition hover:text-indigo-100"
          >
            View original source
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4 text-sm text-gray-400">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex items-center gap-2">
            Engagement: <span className="font-semibold text-white">{engagement}</span>
          </span>
          <span className="flex items-center gap-2">
            Reach: <span className="font-semibold text-white">{reach}</span>
          </span>
          <span className="flex items-center gap-2">
            Impressions:{' '}
            <span className="font-semibold text-white">
              {post?.metrics?.views ?? post?.metrics?.impressions ?? 'NA'}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {post?.sourceUrl && (
            <Link
              href={post.sourceUrl}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-medium text-white transition hover:border-white/30 hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4" />
              Open Link
            </Link>
          )}
          <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-medium text-white transition hover:border-white/30 hover:bg-white/10">
            <Mail className="h-4 w-4" />
            Send Email
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 font-medium text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/15">
            <CheckCircle2 className="h-4 w-4" />
            Make Actionable
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-medium text-white transition hover:border-white/30 hover:bg-white/10">
            <MoreHorizontal className="h-4 w-4" />
            More
          </button>
        </div>
      </footer>
    </article>
  );
}

function MultiSelect({ options, value, onChange, label }) {
  const [open, setOpen] = useState(false);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      const target = e.target;
      if (!target.closest('.brand-multi-select')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);
  
  const handleToggle = (option) => {
    if (option === '__all__') {
      onChange([]);
      return;
    }
    const exists = value.includes(option);
    if (exists) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const displayLabel =
    value.length === 0
      ? 'All Brands'
      : value.length === 1
      ? value[0]
      : value.length === 2
      ? value.join(', ')
      : `${value.length} brands selected`;

  return (
    <div className="relative brand-multi-select">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-w-[180px] items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
      >
        <span className="flex flex-col items-start leading-tight">
          <span className="text-xs uppercase tracking-widest text-gray-400">{label}</span>
          <span>{displayLabel}</span>
        </span>
        <Filter className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-2 w-64 rounded-xl border border-white/10 bg-[#080808] p-3 shadow-xl shadow-black/40">
          <div className="mb-2 flex items-center justify-between text-xs uppercase text-gray-500">
            <span>Select Brands</span>
            <button
              className="text-indigo-300 transition hover:text-indigo-100"
              onClick={() => {
                onChange([]);
                setOpen(false);
              }}
            >
              Reset
            </button>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto pr-1 text-sm">
            <li>
              <button
                onClick={() => {
                  handleToggle('__all__');
                  setOpen(false);
                }}
                className={clsx(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition',
                  value.length === 0 ? 'bg-indigo-500/20 text-indigo-100 font-semibold' : 'hover:bg-white/5 text-gray-200',
                )}
              >
                All Brands
                {value.length === 0 && <CheckCircle2 className="h-4 w-4 text-indigo-300" />}
              </button>
            </li>
            {options.map((option) => {
              const selected = value.includes(option);
              return (
                <li key={option}>
                  <button
                    onClick={() => {
                      handleToggle(option);
                      setOpen(false);
                    }}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition',
                      selected ? 'bg-indigo-500/20 text-indigo-100' : 'hover:bg-white/5 text-gray-200',
                    )}
                  >
                    {option}
                    {selected && <CheckCircle2 className="h-4 w-4 text-indigo-300" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function DurationPicker({ value, onChange, timeRange, onTimeChange }) {
  const [open, setOpen] = useState(false);
  const current = DURATION_PRESETS.find((item) => item.value === value) || DURATION_PRESETS[1];
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];
  const ampm = ['AM', 'PM'];
  
  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      const target = e.target;
      if (!target.closest('.duration-picker')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);
  
  return (
    <div className="relative duration-picker">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-w-[180px] items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
      >
        <span className="flex flex-col items-start leading-tight">
          <span className="text-xs uppercase tracking-widest text-gray-400">Duration</span>
          <span>{current.label}</span>
        </span>
        <Calendar className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[320px] rounded-xl border border-white/10 bg-[#080808] p-3 shadow-xl shadow-black/40">
          <ul className="space-y-1 text-sm mb-3">
            {DURATION_PRESETS.map((option) => (
              <li key={option.value}>
                <button
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={clsx(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition',
                    option.value === value ? 'bg-indigo-500/20 text-indigo-100' : 'hover:bg-white/5 text-gray-200',
                  )}
                >
                  {option.label}
                  {option.value === value && <CheckCircle2 className="h-4 w-4 text-indigo-300" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="mb-2 text-xs uppercase tracking-widest text-gray-400">Time Range</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">From</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={timeRange.from.h}
                      onChange={(e) => onTimeChange({ ...timeRange, from: { ...timeRange.from, h: e.target.value } })}
                      className="w-16 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-sm"
                    >
                      {hours.map((h) => <option key={`fh-${h}`} value={h}>{h}</option>)}
                    </select>
                    <select
                      value={timeRange.from.m}
                      onChange={(e) => onTimeChange({ ...timeRange, from: { ...timeRange.from, m: e.target.value } })}
                      className="w-16 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-sm"
                    >
                      {minutes.map((m) => <option key={`fm-${m}`} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={timeRange.from.ampm}
                      onChange={(e) => onTimeChange({ ...timeRange, from: { ...timeRange.from, ampm: e.target.value } })}
                      className="w-16 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-sm"
                    >
                      {ampm.map((p) => <option key={`fa-${p}`} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">To</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={timeRange.to.h}
                      onChange={(e) => onTimeChange({ ...timeRange, to: { ...timeRange.to, h: e.target.value } })}
                      className="w-16 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-sm"
                    >
                      {hours.map((h) => <option key={`th-${h}`} value={h}>{h}</option>)}
                    </select>
                    <select
                      value={timeRange.to.m}
                      onChange={(e) => onTimeChange({ ...timeRange, to: { ...timeRange.to, m: e.target.value } })}
                      className="w-16 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-sm"
                    >
                      {minutes.map((m) => <option key={`tm-${m}`} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={timeRange.to.ampm}
                      onChange={(e) => onTimeChange({ ...timeRange, to: { ...timeRange.to, ampm: e.target.value } })}
                      className="w-16 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-sm"
                    >
                      {ampm.map((p) => <option key={`ta-${p}`} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterDrawer({ open, onClose }) {
  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!open}
    >
      <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-[#050505] text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Advanced Filters</h2>
            <p className="text-sm text-gray-400">Narrow down mentions with keyword, sentiment and channel filters.</p>
          </div>
          <button className="text-gray-300 transition hover:text-white" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Keywords</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex flex-col space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                <span className="text-xs uppercase tracking-wide text-gray-400">All these words (AND)</span>
                <input
                  placeholder="govinda, twinkle, divorce"
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
              <label className="flex flex-col space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                <span className="text-xs uppercase tracking-wide text-gray-400">Any of these (OR)</span>
                <input
                  placeholder="rumours OR interview"
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
              <label className="flex flex-col space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">Exclude words (NOT)</span>
                <input
                  placeholder="promo, paid"
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
            </div>
          </section>
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">AI Features</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {['Sentiment', 'Reply Status', 'NPS Rating', 'Influencer Category'].map((feature) => (
                <label
                  key={feature}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:border-white/20 hover:bg-white/10"
                >
                  <span>{feature}</span>
                  <span className="text-xs uppercase tracking-widest text-indigo-300">Coming Soon</span>
                </label>
              ))}
            </div>
          </section>
        </div>
        <footer className="flex items-center justify-between border-t border-white/5 bg-[#050505] px-6 py-4">
          <button className="text-sm font-medium text-gray-300 transition hover:text-white">Reset</button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-white/20 hover:bg-white/10"
            >
              Cancel
            </button>
            <button className="rounded-lg border border-indigo-400/50 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500/30">
              Apply Filters
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const { user, loadings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [duration, setDuration] = useState('2');
  const [timeRange, setTimeRange] = useState({
    from: { h: '12', m: '00', ampm: 'AM' },
    to: { h: '11', m: '59', ampm: 'PM' },
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFreqOpen, setIsFreqOpen] = useState(false);
  const [savingFreq, setSavingFreq] = useState(false);
  const [freqMessage, setFreqMessage] = useState('');
  const [manualRefreshLoading, setManualRefreshLoading] = useState(false);
  const [assignedBrandNames, setAssignedBrandNames] = useState([]);
  const [assignedBrandDetails, setAssignedBrandDetails] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [isChannelMenuOpen, setIsChannelMenuOpen] = useState(false);
  
  // Refs for race condition prevention and memory leak protection
  const fetchDataCallIdRef = useRef(0);
  const brandActivityCallIdRef = useRef(0);
  const isMountedRef = useRef(true);
  
  // Track component mount/unmount for memory leak prevention
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Increment call IDs to invalidate any ongoing fetches
      fetchDataCallIdRef.current++;
      brandActivityCallIdRef.current++;
    };
  }, []);

  // Close channel menu when clicking outside
  useEffect(() => {
    if (!isChannelMenuOpen) return;
    const handleClickOutside = (e) => {
      const target = e.target;
      if (!target.closest('.channel-menu')) {
        setIsChannelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isChannelMenuOpen]);

  // Close frequency menu when clicking outside
  useEffect(() => {
    if (!isFreqOpen) return;
    const handleClickOutside = (e) => {
      const target = e.target;
      if (!target.closest('.freq-menu')) {
        setIsFreqOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFreqOpen]);

  useEffect(() => {
    if (loadings) return;
    
    if (!user?.email) {
      router.push('/login'); // Fixed: redirect to proper login page
      return;
    }
    
    // Increment call ID to track this specific fetch
    const currentCallId = ++fetchDataCallIdRef.current;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Determine role with robust fallback
        let role = user?.role;
        try {
          const raw = localStorage.getItem('user');
          if (!role && raw) role = (JSON.parse(raw)?.role);
        } catch {}

        // Check if still current before proceeding
        if (currentCallId !== fetchDataCallIdRef.current || !isMountedRef.current) {
          return;
        }

        // Admin: prefer all brands first
        let brandNames = [];
        let usedAdminAll = false;
        let assignedDetails = [];
        let allBrandsData = [];
        
        if (role === 'admin') {
          try {
            const all = await api.brands.getAll();
            
            // Check again after async operation
            if (currentCallId !== fetchDataCallIdRef.current || !isMountedRef.current) {
              return;
            }
            
            allBrandsData = all?.brands || [];
            brandNames = allBrandsData.map((b) => b.brandName).filter(Boolean);
            if (brandNames.length) usedAdminAll = true;
          } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('Admin getAll failed:', e?.message);
            }
          }
        }
        
        // Fetch assigned brands
        try {
          const assignedRes = await api.brands.getAssigned(user.email);
          
          if (currentCallId !== fetchDataCallIdRef.current || !isMountedRef.current) {
            return;
          }
          
          assignedDetails = assignedRes?.brands || [];
        } catch (assignedErr) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('getAssigned failed:', assignedErr?.message);
          }
        }
        
        if ((!assignedDetails || !assignedDetails.length) && allBrandsData.length) {
          assignedDetails = allBrandsData;
        }
        
        const assignedNames = assignedDetails.map((b) => b.brandName).filter(Boolean);
        
        if (!brandNames.length) {
          brandNames = assignedNames.slice();
        }
        
        // Check before state updates
        if (currentCallId !== fetchDataCallIdRef.current || !isMountedRef.current) {
          return;
        }
        
        setAssignedBrandDetails(assignedDetails);
        setAssignedBrandNames(assignedNames);
        setBrands(brandNames);
        setSelectedBrands([]);

        // Load mentions/posts
        let postData = [];
        if (brandNames.length > 0) {
          if (!usedAdminAll && role !== 'admin') {
            try {
              const postRes = await api.data.userPosts({ email: user.email, limit: 200, sort: 'desc' });
              
              if (currentCallId !== fetchDataCallIdRef.current || !isMountedRef.current) {
                return;
              }
              
              postData = Array.isArray(postRes?.data) ? postRes.data : [];
            } catch (postErr) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('userPosts endpoint failed, falling back to per-brand fetch:', postErr.message);
              }
            }
          }

          if (!postData.length) {
            // Use allSettled to continue even if some fail
            const perBrandResponses = await Promise.allSettled(
              brandNames.map(async (brandName) => {
                try {
                  const res = await api.dashboard.getPosts({ brandName, limit: 100, sort: 'desc' });
                  const postsForBrand = Array.isArray(res?.data) ? res.data : [];
                  return postsForBrand.map((post) => {
                    const brand = post?.brand || { brandName };
                    return { ...post, brand: { brandName: brand.brandName || brandName } };
                  });
                } catch (brandErr) {
                  if (process.env.NODE_ENV !== 'production') {
                    console.warn(`Failed to load posts for ${brandName}:`, brandErr.message);
                  }
                  return [];
                }
              })
            );
            
            if (currentCallId !== fetchDataCallIdRef.current || !isMountedRef.current) {
              return;
            }
            
            postData = perBrandResponses
              .filter(result => result.status === 'fulfilled')
              .flatMap(result => result.value);
          }
        }

        postData.sort((a, b) => {
          const aDate = new Date(a?.createdAt || a?.fetchedAt || 0).getTime();
          const bDate = new Date(b?.createdAt || b?.fetchedAt || 0).getTime();
          return bDate - aDate;
        });

        // Final check before setting posts
        if (currentCallId !== fetchDataCallIdRef.current || !isMountedRef.current) {
          return;
        }
        
        setPosts(postData);
      } catch (err) {
        if (currentCallId !== fetchDataCallIdRef.current || !isMountedRef.current) {
          return;
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to load inbox data', err);
        }
        setError(err.message || 'Failed to load inbox data.');
      } finally {
        // Only update loading if still current
        if (currentCallId === fetchDataCallIdRef.current && isMountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
  }, [loadings, router, user?.email, reloadKey]);

  // If user switches to Brand Activity and we have brands but no posts yet,
  // try a per-brand fetch to populate the list.
  useEffect(() => {
    if (activeTab !== 'brand') return;
    if (posts.length > 0) return;
    if (!brands || brands.length === 0) return;
    
    // Increment call ID to track this specific fetch
    const currentCallId = ++brandActivityCallIdRef.current;
    
    const loadIfNeeded = async () => {
      try {
        setLoading(true);
        
        // Use allSettled to handle failures gracefully
        const perBrandResponses = await Promise.allSettled(
          brands.map(async (brandName) => {
            try {
              const res = await api.dashboard.getPosts({ brandName, limit: 100, sort: 'desc' });
              const items = Array.isArray(res?.data) ? res.data : [];
              return items.map((post) => {
                const brand = post?.brand || { brandName };
                return { ...post, brand: { brandName: brand.brandName || brandName } };
              });
            } catch {
              return [];
            }
          })
        );
        
        // Check if still current after async operation
        if (currentCallId !== brandActivityCallIdRef.current || !isMountedRef.current) {
          return;
        }
        
        const merged = perBrandResponses
          .filter(result => result.status === 'fulfilled')
          .flatMap(result => result.value)
          .sort((a, b) => {
            const aDate = new Date(a?.createdAt || a?.fetchedAt || 0).getTime();
            const bDate = new Date(b?.createdAt || b?.fetchedAt || 0).getTime();
            return bDate - aDate;
          });
          
        if (merged.length > 0 && currentCallId === brandActivityCallIdRef.current && isMountedRef.current) {
          setPosts(merged);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Brand activity load failed:', err);
        }
      } finally {
        if (currentCallId === brandActivityCallIdRef.current && isMountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    loadIfNeeded();
  }, [activeTab, brands, posts.length]);


  const filteredPosts = useMemo(() => {
    if (!posts?.length) return [];
    const days = Number(duration || '2');
    // Lower bound date (start date based on duration)
    const lower = new Date();
    lower.setDate(lower.getDate() - days + 1);

    // Apply time-of-day window
    const to24 = (h12, ampm) => {
      let h = Number(h12) % 12;
      if (ampm === 'PM') h += 12;
      return h;
    };
    const startHour = to24(timeRange.from.h, timeRange.from.ampm);
    const startMinute = Number(timeRange.from.m);
    lower.setHours(startHour, startMinute, 0, 0);

    const upper = new Date();
    const endHour = to24(timeRange.to.h, timeRange.to.ampm);
    const endMinute = Number(timeRange.to.m);
    upper.setHours(endHour, endMinute, 59, 999);

    return posts.filter((post) => {
      const brandName = post?.brand?.brandName;
      const matchesBrand = selectedBrands.length === 0 || (brandName && selectedBrands.includes(brandName));
      const createdAt = post?.createdAt ? new Date(post.createdAt) : post?.fetchedAt ? new Date(post.fetchedAt) : null;
      const matchesDate = createdAt ? (createdAt >= lower && createdAt <= upper) : true;
      const text = `${post?.content?.text || ''} ${post?.content?.description || ''}`.toLowerCase();
      const matchesSearch = searchTerm.trim()
        ? text.includes(searchTerm.trim().toLowerCase()) || (brandName || '').toLowerCase().includes(searchTerm.trim().toLowerCase())
        : true;
      const platformValue = String(post?.platform || '').toLowerCase();
      const matchesChannel = !selectedChannels.length || selectedChannels.includes(platformValue);

      if (!matchesBrand || !matchesDate || !matchesSearch || !matchesChannel) return false;

      if (activeTab === 'actionable') return (post?.analysis?.sentiment || '').toLowerCase() === 'negative';
      if (activeTab === 'non-actionable') return (post?.analysis?.sentiment || '').toLowerCase() !== 'negative';
      return true;
    });
  }, [posts, selectedBrands, duration, searchTerm, activeTab, selectedChannels]);

  const counts = useMemo(() => {
    const total = posts.length;
    const actionable = posts.filter((post) => (post?.analysis?.sentiment || '').toLowerCase() === 'negative').length;
    const nonActionable = total - actionable;
    return {
      tickets: 0,
      all: total,
      user: total,
      brand: brands.length,
      actionable,
      'non-actionable': nonActionable,
    };
  }, [brands.length, posts]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020202] text-white">
      <DottedBackground />
      <FilterDrawer open={isFilterDrawerOpen} onClose={() => setIsFilterDrawerOpen(false)} />
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10 flex flex-col gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Inbox</h1>
            <p className="text-base text-gray-400">
              Monitor brand mentions, collaborate with your team and triage conversations in real time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isClickable = key === 'all';
              return (
                <button
                  key={key}
                  onClick={() => isClickable && setActiveTab(key)}
                  disabled={!isClickable}
                  className={clsx(
                    'group flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition',
                    !isClickable && 'cursor-not-allowed opacity-60',
                    activeTab === key
                      ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100 shadow-lg shadow-indigo-500/20'
                      : isClickable
                      ? 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white'
                      : 'border-white/10 bg-white/5 text-gray-300',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </header>

        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/50 backdrop-blur-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-3">
              <MultiSelect options={brands} value={selectedBrands} onChange={setSelectedBrands} label="Brands" />
            </div>
            <DurationPicker value={duration} onChange={setDuration} timeRange={timeRange} onTimeChange={setTimeRange} />
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search mentions, authors or keywords"
                className="w-48 bg-transparent text-sm outline-none placeholder:text-gray-500 md:w-64"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={async () => {
                // Guard: prevent multiple simultaneous refreshes
                if (manualRefreshLoading) return;
                
                try {
                  setManualRefreshLoading(true);
                  setFreqMessage('Refreshing data…');
                  setError('');
                  
                  const targets = selectedBrands.length ? selectedBrands : brands;
                  
                  if (targets.length === 0) {
                    // No brands selected, fetch all user data
                    await api.data.getData({ 
                      email: user?.email,
                      limit: 100
                    });
                  } else {
                    // Fetch data for each brand using allSettled
                    const results = await Promise.allSettled(
                      targets.map((brandName) =>
                        api.data.getData({ 
                          email: user?.email,
                          brandName,
                          limit: 100
                        })
                      )
                    );
                    
                    // Check for failures
                    const failures = results.filter(r => r.status === 'rejected');
                    if (failures.length > 0 && process.env.NODE_ENV !== 'production') {
                      console.warn(`${failures.length} brand(s) failed to refresh`);
                    }
                  }
                  
                  setReloadKey((k) => k + 1);
                  setFreqMessage('Latest monitoring data fetched.');
                } catch (err) {
                  setFreqMessage(err?.message || 'Refresh failed');
                  setError(err?.message || 'Refresh failed');
                } finally {
                  setManualRefreshLoading(false);
                }
              }}
              disabled={manualRefreshLoading}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCcw className={`h-4 w-4 ${manualRefreshLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="relative channel-menu">
              <button
                onClick={() => setIsChannelMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
              >
                Channels
                {selectedChannels.length > 0 && (
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-100">
                    {selectedChannels.length}
                  </span>
                )}
              </button>
              {isChannelMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#080808] p-2 shadow-xl shadow-black/40">
                  <div className="flex items-center justify-between px-2 pb-2 text-xs uppercase tracking-widest text-gray-400">
                    <span>Select Channels</span>
                    <button
                      onClick={() => {
                        setSelectedChannels([]);
                        setIsChannelMenuOpen(false);
                      }}
                      className="text-indigo-200 hover:text-indigo-100"
                    >
                      Reset
                    </button>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {PLATFORM_OPTIONS.map(({ value, label }) => {
                      const active = selectedChannels.includes(value);
                      return (
                        <li key={value}>
                          <button
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${active ? 'bg-indigo-500/20 text-indigo-100' : 'hover:bg-white/5 text-gray-200'}`}
                            onClick={() => {
                              setSelectedChannels((prev) =>
                                prev.includes(value)
                                  ? prev.filter((item) => item !== value)
                                  : [...prev, value]
                              );
                            }}
                          >
                            <span>{label}</span>
                            {active && <CheckCircle2 className="h-4 w-4 text-indigo-300" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            <div className="relative freq-menu">
              <button
                onClick={() => setIsFreqOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
              >
                <Filter className="h-4 w-4" />
                Filter
              </button>
              {isFreqOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#080808] p-2 shadow-xl shadow-black/40">
                  <div className="px-2 pb-2 text-xs uppercase tracking-widest text-gray-400">Monitoring Frequency</div>
                  <ul className="space-y-1 text-sm">
                    {[
                      { label: 'Every 5 minutes', value: '5m' },
                      { label: 'Every 10 minutes', value: '10m' },
                      { label: 'Every 30 minutes', value: '30m' },
                      { label: 'Every 1 hour', value: '1h' },
                      { label: 'Every 2 hours', value: '2h' },
                    ].map(({ label, value }) => (
                      <li key={value}>
                        <button
                          disabled={savingFreq}
                          onClick={async () => {
                            // Guard: prevent multiple simultaneous updates
                            if (savingFreq) return;
                            
                            try {
                              setSavingFreq(true);
                              setFreqMessage('');
                              setError('');
                              
                              const targets = selectedBrands.length ? selectedBrands : brands;
                              
                              if (targets.length === 0) {
                                setFreqMessage('No brands available to configure');
                                return;
                              }
                              
                              // Update frequency for each target brand using allSettled
                              const configResults = await Promise.allSettled(
                                targets.map((brandName) =>
                                  api.brands.configure({ brandName, frequency: value })
                                )
                              );
                              
                              const configFailures = configResults.filter(r => r.status === 'rejected');
                              if (configFailures.length > 0) {
                                if (process.env.NODE_ENV !== 'production') {
                                  console.warn(`${configFailures.length} brand(s) failed to configure`);
                                }
                              }
                              
                              setFreqMessage(`Monitoring set to ${label.toLowerCase()}${selectedBrands.length ? '' : ' for all brands'}. Refreshing data…`);
                              
                              // Re-run search for updated brands
                              try {
                                const refreshTargets = selectedBrands.length ? selectedBrands : brands;
                                if (refreshTargets.length === 0) {
                                  await api.data.getData({ 
                                    email: user?.email,
                                    limit: 100
                                  });
                                } else {
                                  await Promise.allSettled(
                                    refreshTargets.map((b) =>
                                      api.data.getData({ 
                                        email: user?.email,
                                        brandName: b,
                                        limit: 100
                                      })
                                    )
                                  );
                                }
                              } catch (refreshErr) {
                                if (process.env.NODE_ENV !== 'production') {
                                  console.warn('Post-frequency refresh failed:', refreshErr);
                                }
                              }
                              
                              setReloadKey((k) => k + 1);
                              setIsFreqOpen(false);
                            } catch (e) {
                              setFreqMessage(e?.message || 'Failed to update frequency');
                              setError(e?.message || 'Failed to update frequency');
                            } finally {
                              setSavingFreq(false);
                            }
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-white/5 disabled:opacity-60"
                        >
                          <span>{label}</span>
                        </button>
                      </li>
                    ))}
            </ul>
                  <div className="mt-2 px-2">
                    <button
                      onClick={() => { setIsFreqOpen(false); setIsFilterDrawerOpen(true); }}
                      className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
                    >
                      Advanced Filters…
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/50 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}
        {freqMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {freqMessage}
          </div>
        )}

        {loading || loadings ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-white/5 bg-black/40">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-300" />
              Loading mentions…
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-white/5 bg-black/40 text-center">
            <Inbox className="h-12 w-12 text-gray-600" />
            <div className="space-y-1">
              <p className="text-lg font-semibold text-white">No mentions found</p>
              <p className="text-sm text-gray-400">
                Try adjusting your filters or expanding the duration range to see more conversations.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedBrands([]);
                setDuration('7');
                setSearchTerm('');
                setActiveTab('all');
              }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span className="font-medium text-white">
                {filteredPosts.length} Mentions Found
              </span>
              <span>
                Showing{' '}
                <span className="font-semibold text-white">
                  {selectedBrands.length ? selectedBrands.join(', ') : 'all assigned brands'}
                </span>{' '}
                over the last{' '}
                <span className="font-semibold text-white">
                  {
                    (DURATION_PRESETS.find((item) => item.value === duration) || DURATION_PRESETS[1])
                      .label
                  }
                </span>
              </span>
            </div>

            <div className="grid gap-5">
              {filteredPosts.map((post) => (
                <MentionCard key={post._id} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
