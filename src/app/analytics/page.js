'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import clsx from 'clsx';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  BarChart3,
  Smile,
  Frown,
  Meh,
  Clock,
  ExternalLink,
  Users,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  X,
} from 'lucide-react';
import WordCloud from '@/components/WordCloud';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import DottedBackground from '@/components/DottedBackground';
import PlatformBadge from '@/components/PlatformBadge';
import {
  PieChart, Pie, Cell,
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, ComposedChart
} from 'recharts';
// Chart colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const LANGUAGE_COLORS = [
  '#6366f1', '#a855f7', '#ec4899', '#f472b6', '#06b6d4',
  '#f97316', '#14b8a6', '#8b5cf6', '#3b82f6', '#10b981',
  '#f59e0b', '#ef4444', '#64748b', '#84cc16', '#e879f9',
  '#22d3ee', '#facc15', '#fb923c', '#a78bfa', '#2dd4bf',
];
const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#f59e0b',
  negative: '#ef4444'
};

const DURATION_PRESETS = [
  { label: 'Today', value: '1' },
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 14 Days', value: '14' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 60 Days', value: '60' },
  { label: 'All Time', value: 'all-time' },
];

const formatYmdLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseYmdLocalMidnight = (ymd) => {
  if (!ymd || typeof ymd !== 'string') return null;
  const [yStr, mStr, dStr] = ymd.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const getLocalDayBounds = (startYmd, endYmd) => {
  const start = parseYmdLocalMidnight(startYmd);
  const end = parseYmdLocalMidnight(endYmd);
  if (!start || !end) return null;
  const startDt = new Date(start);
  const endDt = new Date(end);
  startDt.setHours(0, 0, 0, 0);
  endDt.setHours(23, 59, 59, 999);
  return {
    startMs: startDt.getTime(),
    endMs: endDt.getTime(),
    startIso: startDt.toISOString(),
    endIso: endDt.toISOString(),
  };
};

const isDurationValueValid = (value) => {
  if (!value) return false;
  if (value === 'all-time') return true;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
};

const buildRangeFromDuration = (days) => {
  if (days === 'all-time' || days >= 3650) {
    return { start: '2000-01-01', end: formatYmdLocal(new Date()) };
  }
  const durationNum = Number(days);
  if (Number.isNaN(durationNum) || durationNum <= 0) {
    return { start: '2000-01-01', end: formatYmdLocal(new Date()) };
  }
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - durationNum + 1);
  return {
    start: formatYmdLocal(start),
    end: formatYmdLocal(end),
  };
};

// Aliases used by DateRangePicker (same implementation as the local date utils above)
const formatDateInput = formatYmdLocal;
const parseDateOnly = parseYmdLocalMidnight;

const formatDisplayDate = (value) => {
  const parsed = parseDateOnly(value);
  if (!parsed) return 'Select dates';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const createDefaultDateRange = () => ({
  start: '2000-01-01',
  end: formatYmdLocal(new Date()),
});

const createDefaultTimeRange = () => ({
  from: { h: '12', m: '00', ampm: 'AM' },
  to: { h: '11', m: '59', ampm: 'PM' },
});

const isDefaultTimeRange = (range) => {
  if (!range) return false;
  return (
    range.from?.h === '12' &&
    range.from?.m === '00' &&
    range.from?.ampm === 'AM' &&
    range.to?.h === '11' &&
    range.to?.m === '59' &&
    range.to?.ampm === 'PM'
  );
};

function DateRangePicker({ range, onChange, durationValue, onDurationChange, timeRange, onTimeChange }) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(range || createDefaultDateRange());
  const triggerRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState(null);
  const [viewDateStart, setViewDateStart] = useState(() => {
    const now = new Date();
    // Left calendar = previous month
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  });
  const [viewDateEnd, setViewDateEnd] = useState(() => {
    const now = new Date();
    // Right calendar = current month
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const applyPreset = (days) => {
    const nextRange = normalizeRangeOrder(buildRangeFromDuration(days));
    onDurationChange?.(String(days));
    onChange(nextRange);
    setDraftRange(nextRange);
    setOpen(false);
  };

  const normalizeRangeOrder = (nextRange) => {
    const s = parseDateOnly(nextRange?.start);
    const e = parseDateOnly(nextRange?.end);
    if (s && e && s > e) return { start: nextRange.end, end: nextRange.start };
    return nextRange;
  };

  const startDate = parseDateOnly(draftRange?.start);
  const endDate = parseDateOnly(draftRange?.end);

  useEffect(() => { setDraftRange(range || createDefaultDateRange()); }, [range]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.analytics-duration-picker')) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const desiredWidth = Math.min(560, Math.floor(window.innerWidth * 0.95));
      const leftUnclamped = rect.right - desiredWidth;
      const left = Math.max(8, Math.min(leftUnclamped, window.innerWidth - desiredWidth - 8));
      const top = rect.bottom + 8;
      setPopoverPos({
        top,
        left,
        width: desiredWidth,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    // Capture scrolls from ancestors; fixed-position popover still needs recompute.
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const moveMonth = (calendarType, delta) => {
    const setter = calendarType === 'start' ? setViewDateStart : setViewDateEnd;
    setter((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  };

  const handleDayClick = (date) => {
    const dateStr = formatDateInput(date);
    onDurationChange?.('custom');
    setDraftRange((prev) => {
      // If a full range already exists, restart selection from the clicked date
      const hasBoth = prev?.start && prev?.end && prev.start !== prev.end;
      if (hasBoth) return { start: dateStr, end: dateStr };

      if (prev?.start) {
        if (prev.start === dateStr) return { start: dateStr, end: dateStr };
        // Always keep chronological order: earlier date → start, later date → end
        const earlier = prev.start < dateStr ? prev.start : dateStr;
        const later   = prev.start < dateStr ? dateStr   : prev.start;
        return { start: earlier, end: later };
      }

      return { start: dateStr, end: dateStr };
    });
  };

  const applyDraft = () => {
    const todayStr = formatDateInput(new Date());
    const normalized = normalizeRangeOrder({
      start: draftRange?.start,
      // Cap end at today — future dates cannot be applied
      end: draftRange?.end && draftRange.end > todayStr ? todayStr : draftRange?.end,
    });
    setDraftRange(normalized);
    onChange(normalized);
    onDurationChange?.('custom');
    setOpen(false);
  };

  const handleReset = () => {
    const defaults = createDefaultDateRange();
    const now = new Date();
    setDraftRange(defaults);
    onChange(defaults);
    onDurationChange?.('all-time');
    onTimeChange?.(createDefaultTimeRange());
    setViewDateStart(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    setViewDateEnd(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const renderMonth = (baseDate, calendarType) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    return (
      <div className="rounded-md border border-white/10 bg-black/40 p-2">
        {/* Month header */}
        <div className="mb-1.5 flex items-center justify-between">
          <button type="button" onClick={() => moveMonth(calendarType, -1)}
            className="rounded p-0.5 text-gray-400 transition hover:text-white">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-semibold text-gray-100">
            {new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
          <button type="button" onClick={() => moveMonth(calendarType, 1)}
            className="rounded p-0.5 text-gray-400 transition hover:text-white">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 text-center text-[9px] text-gray-500 mb-0.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            if (!cell) return <span key={`e-${idx}`} />;
            const cellStr = formatDateInput(cell);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const isFuture = cell > today;
            // Clamp range display at today — future dates never appear highlighted
            const rangeStart = startDate && endDate ? (startDate <= endDate ? startDate : endDate) : null;
            const rangeEnd   = startDate && endDate ? (endDate >= startDate ? endDate   : startDate) : null;
            const effectiveEnd = rangeEnd && rangeEnd > today ? today : rangeEnd;
            const inRange = !isFuture && rangeStart && effectiveEnd &&
              cell >= rangeStart && cell <= effectiveEnd;
            // Only show selected highlight if the date is not in the future
            const isSelected = !isFuture && (draftRange?.start === cellStr || draftRange?.end === cellStr);
            return (
              <button key={cellStr} onClick={() => !isFuture && handleDayClick(cell)}
                title={isFuture ? 'Future dates cannot be selected' : cellStr}
                disabled={isFuture}
                className={clsx(
                  'flex h-5 w-full items-center justify-center rounded text-[10px] transition',
                  isFuture ? 'cursor-not-allowed opacity-25 text-gray-600'
                    : isSelected ? 'bg-indigo-500 font-semibold text-white'
                    : inRange ? 'bg-indigo-500/15 text-indigo-200'
                    : 'text-gray-300 hover:bg-white/10'
                )}>
                {cell.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const buttonLabel = `${formatDisplayDate(range?.start)} – ${formatDisplayDate(range?.end)}`;

  return (
    <div className="relative analytics-duration-picker" style={{ zIndex: 9999 }}>
      <label className="block text-sm font-medium mb-2">Duration</label>
      <button
        ref={triggerRef}
        onClick={() => setOpen((p) => !p)}
        className="relative z-[10000] inline-flex w-full items-center justify-between gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition hover:border-gray-600 hover:bg-gray-700">
        <span className="flex items-center gap-2 truncate min-w-0">
          <Calendar className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <span className="truncate text-xs">{buttonLabel}</span>
        </span>
        <ChevronDown className={clsx('h-4 w-4 flex-shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open &&
        popoverPos &&
        createPortal(
          <div
            className="analytics-duration-picker rounded-xl border border-white/10 bg-gray-800 p-2 shadow-2xl shadow-black/60"
            style={{
              position: 'fixed',
              top: popoverPos.top,
              left: popoverPos.left,
              width: popoverPos.width,
              zIndex: 999999,
            }}
          >
            {/* From → To summary */}
            <div className="mb-1.5 flex items-center gap-2 rounded border border-white/10 bg-black/30 px-2.5 py-1 text-[10px]">
              <span className="text-gray-500 uppercase tracking-wider">From</span>
              <span className="font-medium text-white">{formatDisplayDate(draftRange?.start)}</span>
              <span className="text-gray-600 mx-1">→</span>
              <span className="text-gray-500 uppercase tracking-wider">To</span>
              <span className="font-medium text-white">{formatDisplayDate(draftRange?.end)}</span>
            </div>

            {/* Calendars (left) + presets column (right) */}
            <div className="flex gap-2">
              {/* Two month calendars */}
              <div className="grid flex-1 grid-cols-2 gap-1.5">
                {renderMonth(viewDateStart, 'start')}
                {renderMonth(viewDateEnd, 'end')}
              </div>

              {/* Preset pills — vertical column */}
              <div className="flex w-[100px] flex-shrink-0 flex-col gap-1">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => applyPreset(preset.value)}
                    className={clsx(
                      'w-full rounded border px-2 py-1 text-left text-[10px] font-medium transition',
                      durationValue === preset.value
                        ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-200'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200',
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions row */}
            <div className="mt-1.5 flex items-center justify-end gap-1.5">
              <button
                onClick={handleReset}
                className="rounded border border-white/10 px-3 py-1 text-[10px] text-gray-400 transition hover:bg-white/10"
              >
                Reset
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded border border-white/10 px-3 py-1 text-[10px] text-gray-400 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={applyDraft}
                className="rounded border border-indigo-500/40 bg-indigo-500/20 px-3 py-1 text-[10px] font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
              >
                Apply
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

const RADIAN = Math.PI / 180;

const renderPlatformLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof innerRadius !== 'number' ||
    typeof outerRadius !== 'number' ||
    typeof percent !== 'number'
  ) {
    return null;
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#e5e7eb"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs"
    >
      {(percent * 100).toFixed(1)}%
    </text>
  );
};

const renderLanguageLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  value,
  percentage,
  percent,
}) => {
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof outerRadius !== 'number' ||
    typeof value !== 'number'
  ) {
    return null;
  }

  const radius = outerRadius * 0.7;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const pctValue =
    typeof percentage === 'number'
      ? percentage
      : typeof percent === 'number'
        ? percent * 100
        : null;

  const labelText =
    pctValue !== null
      ? `${name} ${value.toLocaleString()} | ${pctValue.toFixed(2)}%`
      : `${name} ${value.toLocaleString()}`;

  return (
    <text
      x={x}
      y={y}
      fill="#e5e7eb"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs"
    >
      {labelText}
    </text>
  );
};

const _intlLanguageNames =
  typeof Intl !== 'undefined'
    ? new Intl.DisplayNames(['en'], { type: 'language' })
    : null;

const LANGUAGE_NAME_FALLBACK = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
  mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi',
  or: 'Odia', as: 'Assamese', ur: 'Urdu', ne: 'Nepali', sa: 'Sanskrit',
  sd: 'Sindhi', ks: 'Kashmiri', bh: 'Bhojpuri', mai: 'Maithili', doi: 'Dogri',
  kok: 'Konkani', mni: 'Manipuri', sat: 'Santali', brx: 'Bodo',
  raj: 'Rajasthani', mag: 'Magahi', awa: 'Awadhi', tcy: 'Tulu',
  hne: 'Chhattisgarhi', gom: 'Goan Konkani', si: 'Sinhala',
  fr: 'French', de: 'German', es: 'Spanish', pt: 'Portuguese', it: 'Italian',
  ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic',
  tr: 'Turkish', pl: 'Polish', nl: 'Dutch', sv: 'Swedish', da: 'Danish',
  no: 'Norwegian', fi: 'Finnish', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian',
  ms: 'Malay', cs: 'Czech', el: 'Greek', he: 'Hebrew', hu: 'Hungarian',
  ro: 'Romanian', uk: 'Ukrainian', ca: 'Catalan', hr: 'Croatian', bg: 'Bulgarian',
  sk: 'Slovak', lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian', fa: 'Persian',
  ps: 'Pashto', af: 'Afrikaans', sw: 'Swahili', my: 'Burmese', lo: 'Lao',
  am: 'Amharic', so: 'Somali', ha: 'Hausa', yo: 'Yoruba', ig: 'Igbo',
  zu: 'Zulu', xh: 'Xhosa', jv: 'Javanese', su: 'Sundanese', tl: 'Filipino',
  ka: 'Georgian', hy: 'Armenian', az: 'Azerbaijani', uz: 'Uzbek',
  kk: 'Kazakh', mn: 'Mongolian', bo: 'Tibetan', sr: 'Serbian', sq: 'Albanian',
  nb: 'Norwegian Bokmål', nn: 'Norwegian Nynorsk', ht: 'Haitian Creole',
  mg: 'Malagasy', sc: 'Sardinian', qu: 'Quechua', km: 'Khmer',
  ceb: 'Cebuano', pam: 'Kapampangan', war: 'Waray', bcl: 'Bikol',
  ilo: 'Ilocano', min: 'Minangkabau', mad: 'Madurese', ban: 'Balinese',
  bug: 'Buginese', vec: 'Venetian', snk: 'Soninke', rmn: 'Romani',
  lus: 'Mizo', mwr: 'Marwari',
};

const languageDisplayName = (code) => {
  if (!code || code === 'undefined' || code === 'und') return 'Undefined';
  if (LANGUAGE_NAME_FALLBACK[code]) return LANGUAGE_NAME_FALLBACK[code];
  try {
    const name = _intlLanguageNames?.of(code);
    if (name && name !== code) return name;
  } catch {
    // Intl couldn't resolve it
  }
  return code;
};
// Tooltip styling constant (Phase 1.1)
const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  padding: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
};
const formatCompactNumber = (n) => {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}m`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
};

const downloadCsv = (baseName, headers, rows) => {
  if (!Array.isArray(headers) || !Array.isArray(rows) || headers.length === 0) {
    return;
  }

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => {
          const stringValue =
            value === null || value === undefined ? '' : value.toString();
          const escaped = stringValue.replace(/"/g, '""');
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(','),
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const datePart = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${baseName}-${datePart}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
const ANALYTICS_POST_LIMIT = 2000;
const ANALYTICS_SENTIMENT_CHUNK_SIZE = 10;
const buildSentimentRequestPayload = (post) => ({
  _id: post._id || post.id,
  platform: post.platform,
  keyword: post.keyword,
  brandName: post.brand?.brandName || post.brandName || post?.brand?.aiFriendlyName || 'unknown',
  content: {
    text:
      post?.content?.text ||
      post?.content?.description ||
      post?.text ||
      post?.summary ||
      '',
    title: post?.content?.title || post?.title || '',
  },
  sourceUrl: post.sourceUrl,
  createdAt: post.createdAt,
});
const analyzeMissingSentiment = async (posts) => {
  if (!posts?.length) return [];
  try {
    const analyzedResults = [];
    for (let i = 0; i < posts.length; i += ANALYTICS_SENTIMENT_CHUNK_SIZE) {
      const chunk = posts.slice(i, i + ANALYTICS_SENTIMENT_CHUNK_SIZE);
      const payload = chunk.map((post) => buildSentimentRequestPayload(post));
      const result = await api.sentiment.analyze(payload);
      const chunkAnalyzed = Array.isArray(result?.data) ? result.data : [];
      if (chunkAnalyzed.length > 0) {
        analyzedResults.push(...chunkAnalyzed);
        try {
          await api.sentiment.save(chunkAnalyzed);
        } catch (saveError) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Fallback sentiment save failed:', saveError);
          }
        }
      }
    }
    return analyzedResults;
  } catch (error) {
    if (error?.message?.includes('aborted') || error?.name === 'AbortError') {
      // Expected when a newer request supersedes the previous one; silently ignore.
    } else {
      console.error('Fallback sentiment analysis failed:', error);
    }
    return [];
  }
};
// Empty State Component (Phase 1.4)
const EmptyState = ({ message = "No data available", helpText }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <BarChart3 className="w-16 h-16 text-gray-600 mb-4" />
    <p className="text-gray-400 text-center font-medium">{message}</p>
    {helpText && (
      <p className="text-gray-500 text-sm text-center mt-2 max-w-md">{helpText}</p>
    )}
  </div>
);

// Custom tooltip for "Sentiment Distribution by Platform" chart
const SentimentByPlatformTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const SENTIMENT_TEXT_COLORS = {
    positive: '#10b981',
    neutral: '#f59e0b',
    negative: '#ef4444',
  };

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <p className="text-xs text-gray-300 mb-2">{`Platform: ${label}`}</p>
      {payload.map((entry) => {
        const rawName = typeof entry.name === 'string' ? entry.name : '';
        const key = rawName.toLowerCase();
        const color = SENTIMENT_TEXT_COLORS[key] || '#e5e7eb';
        const value = entry.value ?? 0;
        const sentimentLabel = rawName
          ? rawName.charAt(0).toUpperCase() + rawName.slice(1)
          : 'Posts';
        const valueLabel = `${value} ${value === 1 ? 'post' : 'posts'}`;

        return (
          <p
            key={rawName || key}
            className="text-xs font-medium"
            style={{ color }}
          >
            {`${sentimentLabel} : ${valueLabel}`}
          </p>
        );
      })}
    </div>
  );
};

// Analytics mention card – visually aligned with Inbox MentionCard
function AnalyticsMentionCard({ post }) {
  const brandName =
    post?.brand?.brandName || post?.brandName || post?.brand?.aiFriendlyName || 'Unknown Brand';
  const author =
    post?.author?.name || post?.author?.id || post?.user?.name || post?.user?.username || 'Anonymous';
  const platform = post?.platform || 'news';
  const sentiment = (post?.sentiment || post?.analysis?.sentiment || 'neutral').toLowerCase();
  const createdAt = post?.createdAt || post?.fetchedAt;

  const underlineColor =
    sentiment === 'negative'
      ? 'border-red-500/60 text-red-300'
      : sentiment === 'positive'
      ? 'border-emerald-500/60 text-emerald-300'
      : 'border-cyan-400/50 text-cyan-200';

  const engagement =
    post?.metrics?.likes ??
    post?.metrics?.comments ??
    post?.metrics?.shares ??
    post?.metrics?.views ??
    'NA';
  const reach = post?.analysis?.engagementScore ?? post?.reach ?? 'NA';

  const mainText =
    post?.content?.text ||
    post?.content?.description ||
    post?.text ||
    post?.summary ||
    'No text content available for this mention.';

  return (
    <article className="group overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-4 md:p-5 shadow-lg shadow-black/10 transition hover:border-white/15 hover:shadow-black/30">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlatformBadge platform={platform} size="xs" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={clsx(
              'rounded-full border px-3 py-1 text-xs font-medium capitalize',
              underlineColor,
            )}
          >
            {sentiment}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs md:text-sm text-white">
            <Users className="h-4 w-4 text-indigo-300" />
            {brandName}
          </span>
          {createdAt && (
            <span className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
              <Clock className="h-4 w-4 text-gray-500" />
              {new Date(createdAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
          <span className="font-semibold text-white">{author}</span>
        </div>
        <p className="text-sm md:text-base leading-relaxed text-gray-100 line-clamp-3">{mainText}</p>

        {post?.sourceUrl && (
          <Link
            href={post.sourceUrl}
            target="_blank"
            className="inline-flex items-center gap-2 text-xs md:text-sm text-indigo-300 transition hover:text-indigo-100 mt-2"
          >
            View original source
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3 text-xs md:text-sm text-gray-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1">
            Engagement: <span className="font-semibold text-white">{engagement}</span>
          </span>
          <span className="flex items-center gap-1">
            Reach: <span className="font-semibold text-white">{reach}</span>
          </span>
        </div>
      </footer>
    </article>
  );
}

// Inner analytics page content that relies on useSearchParams.
// This is wrapped in a Suspense boundary by the default export
// to satisfy Next.js' requirement for searchParams-based rendering.
function AnalyticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Keep track of filters that came from the URL so we can validate them once data loads
  const urlFiltersRef = useRef({
    brand: null,
    platform: null,
    keywordGroup: null,
    keyword: null,
  });
  // Ensure we only run URL-derived filter validation once after data has loaded
  const hasValidatedUrlFiltersRef = useRef(false);

  // Helper to merge filter updates into the current query string and push to URL
  const updateURL = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === 'all') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const queryString = params.toString();
      router.push(queryString ? `?${queryString}` : '?', { scroll: false });
    },
    [router, searchParams],
  );

  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [brandKeywords, setBrandKeywords] = useState([]);
  const [posts, setPosts] = useState([]);
  const [analyzedPosts, setAnalyzedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedKeyword, setSelectedKeyword] = useState('all');
  const [keywordGroups, setKeywordGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [sentimentWarning, setSentimentWarning] = useState('');
  const [topKeywordsPage, setTopKeywordsPage] = useState(1);
  const [topKeywordsRowsPerPage, setTopKeywordsRowsPerPage] = useState(10);
  const [languagePage, setLanguagePage] = useState(1);
  const [languageRowsPerPage, setLanguageRowsPerPage] = useState(10);
  const [wordCloudColorScheme, setWordCloudColorScheme] = useState('multiple');
  const [wordCloudColorMenuOpen, setWordCloudColorMenuOpen] = useState(false);
  const [wordCloudMenuOpen, setWordCloudMenuOpen] = useState(false);
  const [topKeywordsMenuOpen, setTopKeywordsMenuOpen] = useState(false);
  const [mentionsCountMenuOpen, setMentionsCountMenuOpen] = useState(false);
  const [isRecentPostsCollapsed, setIsRecentPostsCollapsed] = useState(true);
  const [incomingOutgoingMenuOpen, setIncomingOutgoingMenuOpen] = useState(false);
  const [duration, setDuration] = useState('all-time');
  const [dateRange, setDateRange] = useState(() => createDefaultDateRange());
  const [timeRange, setTimeRange] = useState(() => createDefaultTimeRange());
  const sentimentChartRef = useRef(null);
  const platformChartRef = useRef(null);
  const timelineChartRef = useRef(null);
  const sentimentByPlatformChartRef = useRef(null);
  const keywordHeatmapRef = useRef(null);
  const pendingPickerRangeRef = useRef(null);
  const storageKeyForBrand = (brand) => `keywordGroups:${brand}`;

  // Read URL parameters and initialize filters so refresh preserves current selection
  useEffect(() => {
    if (!searchParams) return;

    const brand = searchParams.get('brand');
    const platform = searchParams.get('platform');
    // URL decode the keywordGroup to handle encoded colons (::), mirroring Inbox behavior
    const keywordGroup = searchParams.get('keywordGroup')
      ? decodeURIComponent(searchParams.get('keywordGroup'))
      : null;
    const keyword = searchParams.get('keyword');
    const durationParam = searchParams.get('duration');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    urlFiltersRef.current = { brand, platform, keywordGroup, keyword };

    if (brand && brand !== 'all') {
      setSelectedBrand(brand);
    }
    if (platform && platform !== 'all') {
      setSelectedPlatform(platform);
    }
    if (keywordGroup) {
      setSelectedGroup(keywordGroup);
    }
    if (keyword && keyword !== 'all') {
      setSelectedKeyword(keyword);
    }
    if (durationParam === 'custom' && startParam && endParam) {
      setDuration('custom');
      setDateRange({ start: startParam, end: endParam });
    } else if (durationParam && isDurationValueValid(durationParam)) {
      setDuration(durationParam);
      setDateRange(buildRangeFromDuration(durationParam));
    }
  }, [searchParams]);
  // Handle sentiment card click - navigate to inbox with filters
  const handleSentimentClick = useCallback((sentiment) => {
    const params = new URLSearchParams();
    let brandForQuery = null;
    let keywordGroupForQuery = null;

    // Add sentiment filter
    params.set('sentiment', sentiment);

    // Set duration to a very large value (3650 days = ~10 years) to show all matching posts from all time
    // User can manually change duration later if needed
    params.set('duration', '3650');

    // If a specific brand is chosen, use it
    if (selectedBrand && selectedBrand !== 'all') {
      brandForQuery = selectedBrand;
    }

    // Add platform filter if not 'all'
    if (selectedPlatform && selectedPlatform !== 'all') {
      params.set('platform', selectedPlatform);
    }

    // Add keyword group filter if not 'all'
    if (selectedGroup && selectedGroup !== 'all') {
      if (selectedGroup.includes('::')) {
        // Already compound format
        keywordGroupForQuery = selectedGroup;
        const [groupBrand] = selectedGroup.split('::');
        if (!brandForQuery && groupBrand) {
          brandForQuery = groupBrand;
        }
      } else if (selectedBrand && selectedBrand !== 'all') {
        // Construct compound ID format for inbox compatibility
        keywordGroupForQuery = `${selectedBrand}::${selectedGroup}`;
      } else {
        // "All brands" selected - infer brand from group definition if available
        const group = keywordGroups.find(
          (g) => (g.groupName || g.name) === selectedGroup
        );
        if (group?.brandName) {
          keywordGroupForQuery = `${group.brandName}::${selectedGroup}`;
          if (!brandForQuery) {
            brandForQuery = group.brandName;
          }
        } else {
          // Fallback: just pass the group name (inbox will try to find it)
          keywordGroupForQuery = selectedGroup;
        }
      }
    }

    // Always pass keyword when a specific keyword is chosen (even if a group is selected)
    if (selectedKeyword && selectedKeyword !== 'all') {
      params.set('keyword', selectedKeyword);
    }

    if (brandForQuery) {
      params.set('brand', brandForQuery);
    }
    if (keywordGroupForQuery) {
      params.set('keywordGroup', keywordGroupForQuery);
    }

    // Navigate to inbox with query parameters
    router.push(`/inbox?${params.toString()}`);
  }, [router, selectedBrand, selectedPlatform, selectedGroup, selectedKeyword, keywordGroups]);
  // Initialize
  useEffect(() => {
    fetchBrands();
  }, []);
  // Handle brand change
  useEffect(() => {
    if (selectedBrand && brands.length > 0) {
      loadKeywordGroups(selectedBrand);
      fetchKeywords(selectedBrand);
      fetchPostsAndAnalyze(selectedBrand);
    }
  }, [selectedBrand, brands]);
  const fetchBrands = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      let data;
      if (user?.role === 'admin') {
        try {
          data = await api.brands.getAll();
        } catch {
          data = user?.email ? await api.brands.getByUser(user.email) : { brands: [] };
        }
      } else if (user?.email) {
        data = await api.brands.getByUser(user.email);
      } else {
        throw new Error('User not authenticated');
      }
      const fetchedBrands = data?.brands || [];
      setBrands(fetchedBrands);

      // Validate and apply brand coming from URL (case-insensitive), if any
      const urlBrand = urlFiltersRef.current.brand;
      if (fetchedBrands.length > 0 && urlBrand && urlBrand !== 'all') {
        const matchingBrand = fetchedBrands.find(
          (b) => b.brandName?.toLowerCase() === urlBrand.toLowerCase(),
        );
        if (matchingBrand) {
          setSelectedBrand((prev) => {
            // Prefer previously selected non-default brand over URL if already set
            if (prev && prev !== 'all' && prev.toLowerCase() === matchingBrand.brandName.toLowerCase()) {
              return prev;
            }
            return matchingBrand.brandName;
          });
        }
      }

      if (fetchedBrands.length > 0) {
        setSelectedBrand((prev) => {
          if (prev === 'all') return prev;
          const exists = fetchedBrands.some((brand) => brand.brandName === prev);
          return exists ? prev : 'all';
        });
      } else {
        setSelectedBrand('all');
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };
  const loadKeywordGroups = (brandName) => {
    if (!brandName) {
      setKeywordGroups([]);
      return;
    }
    try {
      // Special case: "All Brands" → aggregate groups from every brand
      if (brandName === 'all') {
        const allGroups = [];
        (Array.isArray(brands) ? brands : []).forEach((brand) => {
          const backendGroups = Array.isArray(brand.keywordGroups) ? brand.keywordGroups : [];
          backendGroups.forEach((g, idx) => {
            const baseName = g.groupName || g.name || `Group ${idx + 1}`;
            allGroups.push({
              name: baseName,
              groupName: baseName,
              brandName: brand.brandName,
              keywords: Array.isArray(g.keywords) ? g.keywords : [],
              includeKeywords: Array.isArray(g.includeKeywords) ? g.includeKeywords : [],
              excludeKeywords: Array.isArray(g.excludeKeywords) ? g.excludeKeywords : [],
            });
          });
        });
        setKeywordGroups(allGroups);
        return;
      }

      // 1) Try localStorage (preferred for already-normalized groups)
      const raw = localStorage.getItem(storageKeyForBrand(brandName));
      let groups = raw ? JSON.parse(raw) : [];

      // 2) Fallback: pull groups from the in-memory brand data if none in localStorage
      if (!Array.isArray(groups) || groups.length === 0) {
        const brand = Array.isArray(brands)
          ? brands.find((b) => b.brandName === brandName)
          : null;
        const backendGroups = Array.isArray(brand?.keywordGroups)
          ? brand.keywordGroups
          : [];

        groups = backendGroups.map((g, idx) => ({
          // Normalize into the shape analytics needs; keep AND/OR/NOT keywords
          name: g.groupName || g.name || `Group ${idx + 1}`,
          groupName: g.groupName || g.name || `Group ${idx + 1}`,
          keywords: Array.isArray(g.keywords) ? g.keywords : [],
          includeKeywords: Array.isArray(g.includeKeywords) ? g.includeKeywords : [],
          excludeKeywords: Array.isArray(g.excludeKeywords) ? g.excludeKeywords : [],
        }));

        // Cache normalized version for next time
        if (groups.length > 0) {
          try {
            localStorage.setItem(storageKeyForBrand(brandName), JSON.stringify(groups));
          } catch {
            // Non-fatal if caching fails
          }
        }
      }

      setKeywordGroups(Array.isArray(groups) ? groups : []);
    } catch (err) {
      console.error('Failed to load keyword groups:', err);
      setKeywordGroups([]);
    }
  };
  const fetchKeywords = async (brandName) => {
    if (!brandName) return;
    try {
      if (brandName === 'all') {
        if (!Array.isArray(brands) || brands.length === 0) {
          setBrandKeywords([]);
          return;
        }
        const keywordSet = new Set();
        await Promise.all(
          brands.map(async (brand) => {
            try {
              const data = await api.dashboard.getKeywords(brand.brandName);
              (data.keywords || []).forEach((kw) => keywordSet.add(kw));
            } catch (err) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn(`Failed to load keywords for ${brand.brandName}:`, err);
              }
            }
          }),
        );
        setBrandKeywords(Array.from(keywordSet));
        return;
      }
      const data = await api.dashboard.getKeywords(brandName);
      setBrandKeywords(data.keywords || []);
    } catch (err) {
      console.error('Failed to load keywords:', err);
      setBrandKeywords([]);
    }
  };
  const fetchPostsAndAnalyze = async (brandName) => {
    if (!brandName) return;
    setLoadingPosts(true);
    setSentimentWarning('');
    try {
      const targetBrands =
        brandName === 'all'
          ? (Array.isArray(brands) ? brands.map((b) => b.brandName) : [])
          : [brandName];
      if (targetBrands.length === 0) {
        setPosts([]);
        setAnalyzedPosts([]);
        setSentimentWarning('No brands available for analytics.');
        return;
      }
      const perBrandLimit =
        brandName === 'all'
          ? ANALYTICS_POST_LIMIT
          : ANALYTICS_POST_LIMIT;
      const fetchedPosts = [];
      for (const name of targetBrands) {
        try {
          const params = { brandName: name, limit: perBrandLimit, sort: 'desc' };
          const data = await api.dashboard.getPosts(params);
          const postsWithBrand = (data.data || []).map((post) => ({
            ...post,
            brandName: post.brand?.brandName || post.brandName || name,
          }));
          fetchedPosts.push(...postsWithBrand);
        } catch (brandErr) {
          console.error(`Failed to load posts for ${name}:`, brandErr);
        }
      }
      const sortedPosts = fetchedPosts.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      const limitedPosts =
        brandName === 'all'
          ? sortedPosts
          : sortedPosts.slice(0, ANALYTICS_POST_LIMIT);
      setPosts(limitedPosts);
      const needsSentiment = limitedPosts.filter((post) => {
        const isManual =
          post?.sentimentIsManual === true ||
          (typeof post?.sentimentSource === 'string' &&
            post.sentimentSource.toLowerCase() === 'manual');

        if (isManual) {
          return false;
        }

        const hasScore = typeof post.sentimentScore === 'number';
        const sentimentValue = post.sentiment;

        // Only analyze when sentiment is missing or explicitly pending.
        // Posts with an existing non-pending sentiment (including legacy ones)
        // are trusted as-is, even if they lack a score.
        if (!sentimentValue || sentimentValue === 'pending') {
          return true;
        }

        return false;
      });
      if (needsSentiment.length === 0) {
        setSentimentWarning('');
        setAnalyzedPosts(limitedPosts);
        return;
      }
      setSentimentWarning('Analyzing sentiment for newly fetched posts…');
      setAnalyzingSentiment(true);
      try {
        const analyzedSubset = await analyzeMissingSentiment(needsSentiment);
        if (!analyzedSubset || analyzedSubset.length === 0) {
          setAnalyzedPosts(limitedPosts);
          setSentimentWarning('Sentiment analysis unavailable. Showing posts without sentiment data.');
          return;
        }
        const analyzedMap = new Map();
        analyzedSubset.forEach((post) => {
          const id = post._id || post.id;
          if (id) analyzedMap.set(id.toString(), post);
        });
        const mergedPosts = limitedPosts.map((post) => {
          const id = post._id || post.id;
          if (!id) return post;
          const updated = analyzedMap.get(id.toString());
          if (!updated) return post;
          const existingScore = typeof post.sentimentScore === 'number' ? post.sentimentScore : null;
          return {
            ...post,
            sentiment: updated.sentiment ?? post.sentiment ?? 'pending',
            sentimentScore:
              typeof updated.sentimentScore === 'number' ? updated.sentimentScore : existingScore,
            sentimentAnalyzedAt: updated.sentimentAnalyzedAt || post.sentimentAnalyzedAt,
          };
        });
        setAnalyzedPosts(mergedPosts);
        const unresolved = mergedPosts.filter((post) => {
          const hasScore = typeof post.sentimentScore === 'number';
          return !post.sentiment || !hasScore;
        });
        setSentimentWarning(
          unresolved.length > 0
            ? 'Some posts still lack sentiment data. Please refresh later to retry.'
            : '',
        );
      } catch (analysisErr) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Unexpected error in sentiment analysis:', analysisErr);
        }
        setSentimentWarning('Could not analyze some posts. Showing available data.');
        setAnalyzedPosts(limitedPosts);
      } finally {
        setAnalyzingSentiment(false);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
      setAnalyzedPosts([]);
      setAnalyzingSentiment(false);
      setSentimentWarning('Failed to load sentiment data. Please retry.');
    } finally {
      setLoadingPosts(false);
    }
  };
  const fetchSentimentSummary = useCallback(async ({ brandName, platform, keyword, startDate, endDate }) => {
    if (!brandName) return;
    setLoadingSummary(true);
    try {
      const params = { brandName };
      if (platform && platform !== 'all') {
        params.platform = platform;
      }
      if (keyword && keyword !== 'all') {
        params.keyword = keyword;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await api.sentiment.summary(params);
      setSummaryData(data);
      setSummaryError(null);
    } catch (err) {
      console.error('Failed to load sentiment summary:', err);
      setSummaryData(null);
      setSummaryError(err.message || 'Failed to load summary');
    } finally {
      setLoadingSummary(false);
    }
  }, []);
  const handleRefresh = async () => {
    if (selectedBrand) {
      await fetchPostsAndAnalyze(selectedBrand);
    }
  };
  // dateRange is now a state (managed by DateRangePicker), not derived from duration

  useEffect(() => {
    if (!selectedBrand || selectedBrand === 'all') {
      setSummaryData(null);
      setSummaryError(null);
      setLoadingSummary(false);
      return;
    }
    const effectiveKeyword = selectedGroup === 'all' ? selectedKeyword : 'all';
    const { start, end } = dateRange;
    const bounds = duration !== 'all-time' ? getLocalDayBounds(start, end) : null;
    fetchSentimentSummary({
      brandName: selectedBrand,
      platform: selectedPlatform,
      keyword: effectiveKeyword,
      startDate: bounds?.startIso,
      endDate: bounds?.endIso,
    });
  }, [selectedBrand, selectedPlatform, selectedKeyword, selectedGroup, duration, dateRange, fetchSentimentSummary]);
  const availableKeywords = useMemo(() => {
    // Helper to merge AND / OR keywords into a unique list (exclude NOT keywords)
    const collectKeywordsFromGroup = (group) => {
      if (!group) return [];
      const set = new Set();
      (group.keywords || []).forEach((k) => k && set.add(k));
      (group.includeKeywords || []).forEach((k) => k && set.add(k));
      return Array.from(set);
    };

    if (selectedGroup !== 'all') {
      // Handle compound format (brandName::groupName) when "all brands" is selected
      let groupName = selectedGroup;
      let brandName = null;
      if (selectedGroup.includes('::')) {
        [brandName, groupName] = selectedGroup.split('::');
      }
      
      // Find the matching group
      const group = keywordGroups.find((g) => {
        const gName = g.groupName || g.name;
        if (brandName) {
          return gName === groupName && g.brandName === brandName;
        }
        return gName === groupName;
      });
      
      return collectKeywordsFromGroup(group);
    }

    const set = new Set(brandKeywords || []);
    keywordGroups.forEach((g) => {
      collectKeywordsFromGroup(g).forEach((k) => set.add(k));
    });
    return Array.from(set);
  }, [selectedGroup, keywordGroups, brandKeywords]);

  // After brands / keyword groups are available, validate and normalize URL-derived filters
  useEffect(() => {
    if (hasValidatedUrlFiltersRef.current) return;

    const { brand: urlBrand, keywordGroup: urlGroup, keyword: urlKeyword } = urlFiltersRef.current || {};

    // If there are no URL filters to validate, mark as done
    if (!urlBrand && !urlGroup && !urlKeyword) {
      hasValidatedUrlFiltersRef.current = true;
      return;
    }

    // Require brands to be loaded before validating brand/group
    if (!Array.isArray(brands) || brands.length === 0) {
      return;
    }

    let effectiveBrand = selectedBrand;

    // 1) Validate brand from URL against loaded brands (case-insensitive)
    if (urlBrand && urlBrand !== 'all') {
      const matchingBrand = brands.find(
        (b) => b.brandName?.toLowerCase() === urlBrand.toLowerCase(),
      );

      if (!matchingBrand) {
        // Brand does not exist anymore – reset brand and dependent filters
        setSelectedBrand('all');
        setSelectedGroup('all');
        setSelectedKeyword('all');
        hasValidatedUrlFiltersRef.current = true;
        return;
      }

      effectiveBrand = matchingBrand.brandName;
      setSelectedBrand((prev) => {
        if (!prev || prev === 'all') return matchingBrand.brandName;
        if (prev.toLowerCase() === matchingBrand.brandName.toLowerCase()) return matchingBrand.brandName;
        return prev;
      });
    }

    // 2) Validate and normalize keyword group from URL
    let effectiveGroupId = selectedGroup;
    if (urlGroup) {
      let groupName = urlGroup;
      let groupBrand = null;

      if (urlGroup.includes('::')) {
        [groupBrand, groupName] = urlGroup.split('::');
      } else if (effectiveBrand && effectiveBrand !== 'all') {
        groupBrand = effectiveBrand;
      }

      const group = keywordGroups.find((g) => {
        const gName = g.groupName || g.name;
        if (groupBrand) {
          // When brand is specified, match both brand and group name if brandName is present
          if (g.brandName) {
            return gName === groupName && g.brandName === groupBrand;
          }
          return gName === groupName;
        }
        return gName === groupName;
      });

      if (!group) {
        // Group no longer exists – clear group and dependent keyword filter
        setSelectedGroup('all');
        if (urlKeyword && urlKeyword !== 'all') {
          setSelectedKeyword('all');
        }
        hasValidatedUrlFiltersRef.current = true;
        return;
      }

      const normalizedName = group.groupName || group.name;
      if ((effectiveBrand === 'all' || !effectiveBrand) && group.brandName) {
        // When viewing all brands, use compound ID so groups from different brands are distinct
        effectiveGroupId = `${group.brandName}::${normalizedName}`;
      } else {
        effectiveGroupId = normalizedName;
      }

      setSelectedGroup(effectiveGroupId);
    }

    // 3) Validate keyword from URL against available keywords for the resolved selection
    if (urlKeyword && urlKeyword !== 'all') {
      const keywordLower = urlKeyword.toLowerCase().trim();
      const exists = availableKeywords.some((k) =>
        (k || '').toString().trim().toLowerCase() === keywordLower,
      );

      if (!exists) {
        setSelectedKeyword('all');
      } else {
        setSelectedKeyword(urlKeyword);
      }
    }

    hasValidatedUrlFiltersRef.current = true;
  }, [brands, keywordGroups, availableKeywords, selectedBrand, selectedGroup]);
  const filteredPosts = React.useMemo(() => {
    let filtered = [...analyzedPosts];
    if (duration !== 'all-time' && dateRange.start && dateRange.end) {
      const bounds = getLocalDayBounds(dateRange.start, dateRange.end);
      const startMs = bounds?.startMs ?? 0;
      const endMs = bounds?.endMs ?? Number.MAX_SAFE_INTEGER;
      filtered = filtered.filter((p) => {
        const t = p?.createdAt ? new Date(p.createdAt).getTime() : 0;
        return t >= startMs && t <= endMs;
      });
    }
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(p => p.platform === selectedPlatform);
    }
    if (selectedGroup !== 'all') {
      // Handle compound format (brandName::groupName) when "all brands" is selected
      let groupName = selectedGroup;
      let brandName = null;
      if (selectedGroup.includes('::')) {
        [brandName, groupName] = selectedGroup.split('::');
      }
      
      // Find the matching group
      const group = keywordGroups.find((g) => {
        const gName = g.groupName || g.name;
        if (brandName) {
          // When brand is specified, match both brand and group name
          return gName === groupName && g.brandName === brandName;
        }
        // When single brand is selected, just match group name
        return gName === groupName;
      });
      
      if (group) {
        // Filter by brand if group belongs to a specific brand
        if (brandName && group.brandName) {
          filtered = filtered.filter(post => {
            const postBrandName = post?.brand?.brandName || post?.brandName;
            return postBrandName === brandName;
          });
        } else if (group.brandName && selectedBrand === 'all') {
          // When "all brands" is selected but group has a specific brand, filter by that brand
          filtered = filtered.filter(post => {
            const postBrandName = post?.brand?.brandName || post?.brandName;
            return postBrandName === group.brandName;
          });
        }
        
        // Collect all keywords to match (AND keywords + OR keywords)
        const allKeywords = [
          ...(Array.isArray(group.keywords) ? group.keywords : []),
          ...(Array.isArray(group.includeKeywords) ? group.includeKeywords : [])
        ];
        const excludeKeywords = Array.isArray(group.excludeKeywords) ? group.excludeKeywords : [];
        
        if (allKeywords.length > 0) {
          filtered = filtered.filter(post => {
            // Use same keyword extraction logic as inbox for consistency
            const postKeyword = (
              post?.keyword ||
              post?.content?.keyword ||
              post?.content?.tag ||
              post?.analysis?.keyword ||
              post?.tag ||
              post?.topic ||
              ''
            ).toString().trim().toLowerCase();
            
            if (!postKeyword) return false;
            
            // Check if post matches any of the include keywords (exact match like inbox)
            const matchesInclude = allKeywords.some(k => {
              const keywordLower = (k || '').toString().trim().toLowerCase();
              return postKeyword === keywordLower;
            });
            
            if (!matchesInclude) return false;
            
            // Check if post should be excluded
            if (excludeKeywords.length > 0) {
              const matchesExclude = excludeKeywords.some(k => {
                const keywordLower = (k || '').toString().trim().toLowerCase();
                return postKeyword === keywordLower;
              });
              if (matchesExclude) return false;
            }
            
            return true;
          });
        }
      }
    }
    if (selectedKeyword !== 'all') {
      const keywordLower = selectedKeyword.toLowerCase().trim();
      filtered = filtered.filter(p => {
        // Use same keyword extraction logic as inbox for consistency
        const postKeyword = (
          p?.keyword ||
          p?.content?.keyword ||
          p?.content?.tag ||
          p?.analysis?.keyword ||
          p?.tag ||
          p?.topic ||
          ''
        ).toString().trim().toLowerCase();
        return postKeyword === keywordLower;
      });
    }
    return filtered;
  }, [analyzedPosts, selectedPlatform, selectedKeyword, selectedGroup, keywordGroups, duration, dateRange]);
  const handleExportAnalytics = useCallback(() => {
    if (!filteredPosts.length) return;

    const headers = [
      'Brand',
      'Platform',
      'Keyword',
      'Sentiment',
      'Sentiment Score',
      'Created At',
      'Text',
    ];

    const rows = filteredPosts.map((post) => {
      const brandName =
        post?.brand?.brandName || post?.brandName || post?.brand?.aiFriendlyName || '';
      const platform = post?.platform || '';
      const keyword = post?.keyword || '';
      const sentiment = (post?.sentiment || '').toString();
      const sentimentScore =
        typeof post?.sentimentScore === 'number' ? post.sentimentScore : '';
      const createdAt = post?.createdAt ? new Date(post.createdAt).toISOString() : '';
      const text = (
        post?.content?.text ||
        post?.content?.description ||
        post?.text ||
        post?.summary ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim();

      return [brandName, platform, keyword, sentiment, sentimentScore, createdAt, text];
    });

    downloadCsv('analytics', headers, rows);
  }, [filteredPosts]);

  const clientStats = useMemo(() => {
    return {
      total: filteredPosts.length,
      byPlatform: filteredPosts.reduce((acc, post) => {
        const key = post.platform || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      byKeyword: filteredPosts.reduce((acc, post) => {
        const key = post.keyword || post.content?.keyword || post.content?.tag || post.analysis?.keyword || post.tag || post.topic;
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      bySentiment: filteredPosts.reduce((acc, post) => {
        const sentimentKey = post.sentiment || 'pending';
        acc[sentimentKey] = (acc[sentimentKey] || 0) + 1;
        return acc;
      }, { positive: 0, neutral: 0, negative: 0, pending: 0 })
    };
  }, [filteredPosts]);

  const channelEngagementTableData = useMemo(() => {
    const map = {};
    filteredPosts.forEach((post) => {
      const key = (post.platform || 'unknown').toLowerCase();
      if (!map[key]) map[key] = { platform: key, total: 0, likes: 0, comments: 0, shares: 0, views: 0 };
      map[key].total    += 1;
      map[key].likes    += Number(post.metrics?.likes    ?? 0) || 0;
      map[key].comments += Number(post.metrics?.comments ?? 0) || 0;
      map[key].shares   += Number(post.metrics?.shares   ?? 0) || 0;
      map[key].views    += Number(post.metrics?.views    ?? 0) || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .map((row) => ({
        ...row,
        avgEngagement: row.total > 0
          ? Math.round((row.likes + row.comments + row.shares) / row.total)
          : 0,
      }));
  }, [filteredPosts]);

  const summaryStats = useMemo(() => {
    if (!summaryData?.success) return null;
    const totals = summaryData.totals || {};
    const sentiment = summaryData.sentiment || {};
    const platforms = {};
    (summaryData.platforms || []).forEach((entry) => {
      if (!entry) return;
      const key = entry.platform || 'unknown';
      platforms[key] = entry.total || 0;
    });
    const keywords = {};
    (summaryData.keywords || []).forEach((entry) => {
      if (!entry) return;
      const key = entry.keyword || 'unknown';
      keywords[key] = entry.total || 0;
    });
    return {
      total: totals.analyzedPosts || 0,
      totalTracked: totals.totalPosts || 0,
      pending: totals.pendingPosts ?? Math.max((totals.totalPosts || 0) - (totals.analyzedPosts || 0), 0),
      lastAnalyzedAt: totals.latestAnalyzedAt || null,
      avgSentimentScore:
        typeof totals.avgSentimentScore === 'number' ? totals.avgSentimentScore : null,
      byPlatform: platforms,
      byKeyword: keywords,
      bySentiment: {
        positive: sentiment.positive || 0,
        neutral: sentiment.neutral || 0,
        negative: sentiment.negative || 0,
        pending: sentiment.pending || Math.max((totals.totalPosts || 0) - (totals.analyzedPosts || 0), 0),
      },
    };
  }, [summaryData]);
  const summaryUsable = selectedGroup === 'all' && summaryData?.success;
  const stats = useMemo(() => {
    if (summaryUsable && summaryStats) {
      return summaryStats;
    }
    return clientStats;
  }, [summaryUsable, summaryStats, clientStats]);
  const pendingInfo = useMemo(() => {
    if (summaryUsable && summaryStats) {
      return {
        pending: summaryStats.pending || 0,
        total: summaryStats.totalTracked || 0,
        analyzed: summaryStats.total || 0,
      };
    }
    const pendingCount = stats.bySentiment?.pending || 0;
    return {
      pending: pendingCount,
      total: stats.total,
      analyzed: stats.total - pendingCount,
    };
  }, [summaryUsable, summaryStats, stats]);
  const platformChartData = useMemo(() => {
    const total = stats.total || 0;
    return Object.entries(stats.byPlatform)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
      }));
  }, [stats.byPlatform, stats.total]);
  const sentimentChartData = useMemo(() => {
    const analyzedTotal = (stats.bySentiment?.positive || 0) + (stats.bySentiment?.neutral || 0) + (stats.bySentiment?.negative || 0);
    return Object.entries(stats.bySentiment)
      .filter(([name]) => name !== 'pending')
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        percentage: analyzedTotal > 0 ? ((value / analyzedTotal) * 100).toFixed(1) : '0.0',
      }));
  }, [stats.bySentiment]);
  const keywordChartData = useMemo(() => Object.entries(stats.byKeyword)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, posts: value })), [stats.byKeyword]);
  
  // Keyword frequency for word cloud and top keywords (expands groups to constituent keywords)
  const keywordFrequency = useMemo(() => {
    const getKeywordsFromGroup = (group) => {
      if (!group) return [];
      const set = new Set();
      (group.keywords || []).forEach((k) => k && set.add(String(k).trim()));
      (group.includeKeywords || []).forEach((k) => k && set.add(String(k).trim()));
      return Array.from(set).filter(Boolean);
    };

    const resolveKeywordsForPost = (post) => {
      const raw = (
        post?.keyword ||
        post?.content?.keyword ||
        post?.analysis?.keyword ||
        post?.tag ||
        post?.topic ||
        ''
      ).toString().trim();
      if (!raw || raw.toLowerCase() === 'unknown') return [];

      let groupName = raw;
      let brandName = post?.brand?.brandName || post?.brandName || null;
      if (raw.includes('::')) {
        const parts = raw.split('::');
        brandName = parts[0]?.trim() || brandName;
        groupName = parts[1]?.trim() || raw;
      }

      const group = keywordGroups.find((g) => {
        const gName = (g.groupName || g.name || '').toString().trim();
        if (gName !== groupName) return false;
        if (brandName && g.brandName) return g.brandName === brandName;
        return true;
      });

      if (group) {
        return getKeywordsFromGroup(group);
      }
      return [raw];
    };

    const frequency = {};
    filteredPosts.forEach((post) => {
      const keywords = resolveKeywordsForPost(post);
      if (keywords.length === 0) {
        frequency['unknown'] = (frequency['unknown'] || 0) + 1;
        return;
      }
      keywords.forEach((kw) => {
        const k = String(kw).trim();
        if (k) frequency[k] = (frequency[k] || 0) + 1;
      });
    });
    return frequency;
  }, [filteredPosts, keywordGroups]);
  
  // Top keywords data for table (sorted by frequency)
  const topKeywordsData = useMemo(() => {
    return Object.entries(keywordFrequency)
      .filter(([keyword]) => keyword && keyword.toLowerCase() !== 'unknown')
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count);
  }, [keywordFrequency]);
  
  // Paginated top keywords
  const paginatedTopKeywords = useMemo(() => {
    const start = (topKeywordsPage - 1) * topKeywordsRowsPerPage;
    const end = start + topKeywordsRowsPerPage;
    return topKeywordsData.slice(start, end);
  }, [topKeywordsData, topKeywordsPage, topKeywordsRowsPerPage]);
  
  const totalTopKeywordsPages = useMemo(() => {
    return Math.ceil(topKeywordsData.length / topKeywordsRowsPerPage);
  }, [topKeywordsData.length, topKeywordsRowsPerPage]);
  
  // Export function for top keywords
  const handleExportTopKeywords = useCallback(() => {
    if (!topKeywordsData.length) return;

    const headers = ['Top Keyword', 'Mentions Count'];
    const rows = topKeywordsData.map(({ keyword, count }) => [keyword, count]);

    downloadCsv('top-keywords', headers, rows);
  }, [topKeywordsData]);

  const languageTableData = useMemo(() => {
    if (summaryUsable && Array.isArray(summaryData?.languages) && summaryData.languages.length > 0) {
      const total = summaryData.languages.reduce((s, l) => s + (l.count || 0), 0);
      return summaryData.languages.map((entry) => ({
        code: entry.language || 'undefined',
        name: languageDisplayName(entry.language),
        count: entry.count || 0,
        percent: total > 0 ? ((entry.count / total) * 100).toFixed(2) : '0.00',
      }));
    }
    const langMap = {};
    filteredPosts.forEach((post) => {
      const code = post.language;
      if (!code) return;
      langMap[code] = (langMap[code] || 0) + 1;
    });
    const total = Object.values(langMap).reduce((s, n) => s + n, 0);
    return Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({
        code,
        name: languageDisplayName(code),
        count,
        percent: total > 0 ? ((count / total) * 100).toFixed(2) : '0.00',
      }));
  }, [summaryUsable, summaryData, filteredPosts]);

  const languageChartData = useMemo(() => {
    return languageTableData.slice(0, 6).map((item) => ({
      name: item.name,
      value: item.count,
      percentage: item.percent,
    }));
  }, [languageTableData]);

  const paginatedLanguageData = useMemo(() => {
    const start = (languagePage - 1) * languageRowsPerPage;
    return languageTableData.slice(start, start + languageRowsPerPage);
  }, [languageTableData, languagePage, languageRowsPerPage]);

  const totalLanguagePages = useMemo(() => {
    return Math.ceil(languageTableData.length / languageRowsPerPage);
  }, [languageTableData.length, languageRowsPerPage]);

  const handleExportLanguages = useCallback(() => {
    if (!languageTableData.length) return;
    const headers = ['Language', 'Mention Count', 'Mention Count Percent'];
    const rows = languageTableData.map((item) => [item.name, item.count, `${item.percent}%`]);
    downloadCsv('top-languages', headers, rows);
  }, [languageTableData]);

  const clientTimelineData = useMemo(() => filteredPosts.reduce((acc, post) => {
    if (!post.createdAt) return acc;
    const sentiment = post.sentiment;
    // Only count posts that have a resolved sentiment so pending posts don't
    // inflate the neutral bucket and distort the timeline lines.
    if (!sentiment || !['positive', 'neutral', 'negative'].includes(sentiment)) return acc;
    const date = formatYmdLocal(new Date(post.createdAt));
    if (!acc[date]) {
      acc[date] = { date, positive: 0, neutral: 0, negative: 0, total: 0 };
    }
    acc[date][sentiment] += 1;
    acc[date].total += 1;
    return acc;
  }, {}), [filteredPosts]);
  const combinedTimeline = useMemo(() => {
    // Prefer backend summary timeline when available, otherwise fall back to client aggregation
    const rawTimeline = (summaryUsable && Array.isArray(summaryData?.timeline) && summaryData.timeline.length > 0)
      ? summaryData.timeline
      : Object.values(clientTimelineData);

    const { start, end } = dateRange;
    if (!start || !end) return rawTimeline.filter((item) => item && item.date);

    const bounds = getLocalDayBounds(start, end);
    if (!bounds) {
      return rawTimeline.filter((item) => item && item.date);
    }

    const { startMs, endMs } = bounds;

    let filtered = rawTimeline.filter((item) => {
      if (!item || !item.date) return false;
      const d = parseYmdLocalMidnight(item.date);
      if (!d) return false;
      const t = d.getTime();
      return t >= startMs && t <= endMs;
    });

    const rangeDays = (endMs - startMs) / (24 * 60 * 60 * 1000);
    if (rangeDays > 90) {
      const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
      filtered = sorted.slice(-90);
    }
    return filtered;
  }, [summaryUsable, summaryData, clientTimelineData, dateRange]);
  const timelineChartData = useMemo(() => {
    return [...combinedTimeline]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((item) => {
        const positive = Number(item?.positive ?? 0) || 0;
        const neutral = Number(item?.neutral ?? 0) || 0;
        const negative = Number(item?.negative ?? 0) || 0;
        // Derive total from analyzed counts only — backend total includes pending posts.
        const total = positive + neutral + negative;
        return { ...item, positive, neutral, negative, total };
      });
  }, [combinedTimeline]);

  const mentionCountMetrics = useMemo(() => {
    // Use normalized timeline data (total = positive+neutral+negative, no pending)
    // so this matches exactly what the chart shows.
    const normalizedTimeline = [...timelineChartData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const timelineSum = normalizedTimeline.reduce((s, d) => s + (d.total || 0), 0);
    // Fall back to filteredPosts count when no timeline data is available
    const total = timelineSum > 0 ? timelineSum : filteredPosts.length;
    const daysWithData = Math.max(1, normalizedTimeline.length);
    const avgPerDay = total / daysWithData;

    let percentChangeMentions = null;
    let percentChangeAvg = null;
    // Split timeline in half: second half vs first half
    if (normalizedTimeline.length >= 2) {
      const mid = Math.floor(normalizedTimeline.length / 2);
      const current = normalizedTimeline.slice(mid).reduce((s, d) => s + (d.total || 0), 0);
      const previous = normalizedTimeline.slice(0, mid).reduce((s, d) => s + (d.total || 0), 0);
      if (previous > 0) {
        percentChangeMentions = ((current - previous) / previous) * 100;
        percentChangeAvg = percentChangeMentions;
      }
    }

    const dateSpanFallback = (() => {
      const dates = filteredPosts
        .map((p) => p?.createdAt && formatYmdLocal(new Date(p.createdAt)))
        .filter(Boolean);
      const unique = new Set(dates);
      return Math.max(1, unique.size);
    })();
    const avgPerDayFallback = filteredPosts.length / dateSpanFallback;

    return {
      total,
      avgPerDay: normalizedTimeline.length > 0 ? avgPerDay : avgPerDayFallback,
      percentChangeMentions,
      percentChangeAvg,
      incomingTotal: total,
      outgoingTotal: 0,
    };
  }, [timelineChartData, filteredPosts]);

  const sentimentPercentChange = useMemo(() => {
    // Use normalized timeline (same source as chart) and split in half so the
    // comparison window always matches the selected duration rather than a
    // hardcoded last-7/14 days from "now".
    const sortedTimeline = [...timelineChartData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const result = { positive: null, neutral: null, negative: null };
    if (sortedTimeline.length >= 2) {
      const mid = Math.floor(sortedTimeline.length / 2);
      const current = sortedTimeline.slice(mid);
      const previous = sortedTimeline.slice(0, mid);
      const sum = (arr, key) => arr.reduce((s, d) => s + (Number(d[key]) || 0), 0);
      ['positive', 'neutral', 'negative'].forEach((key) => {
        const curr = sum(current, key);
        const prev = sum(previous, key);
        if (prev > 0) result[key] = ((curr - prev) / prev) * 100;
      });
    }
    return result;
  }, [timelineChartData]);

  const uniqueUsersMetrics = useMemo(() => {
    const getAuthorId = (post) =>
      (post?.author?.id || post?.author?.name || post?.user?.id || post?.user?.username || '').toString().trim() || null;
    const allIds = new Set();
    filteredPosts.forEach((p) => {
      const id = getAuthorId(p);
      if (id) allIds.add(id);
    });
    const total = allIds.size;

    let percentChange = null;
    const sortedByDate = [...filteredPosts]
      .filter((p) => p?.createdAt)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (sortedByDate.length > 0) {
      // Split the visible date range in half; compare first half vs second half.
      // Falls back to absolute 7/14-day windows when only a few posts exist.
      const bounds = duration !== 'all-time'
        ? getLocalDayBounds(dateRange.start, dateRange.end)
        : null;

      const current7Ids = new Set();
      const previous7Ids = new Set();

      if (bounds) {
        const midMs = (bounds.startMs + bounds.endMs) / 2;
        sortedByDate.forEach((p) => {
          const t = new Date(p.createdAt).getTime();
          const id = getAuthorId(p);
          if (!id) return;
          if (t > midMs && t <= bounds.endMs) current7Ids.add(id);
          else if (t >= bounds.startMs && t <= midMs) previous7Ids.add(id);
        });
      } else {
        // All Time fallback: last 7 days vs prior 7 days from today
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(now.getDate() - 14);
        fourteenDaysAgo.setHours(0, 0, 0, 0);
        sortedByDate.forEach((p) => {
          const d = new Date(p.createdAt);
          const id = getAuthorId(p);
          if (!id) return;
          if (d >= sevenDaysAgo && d <= now) current7Ids.add(id);
          else if (d >= fourteenDaysAgo && d < sevenDaysAgo) previous7Ids.add(id);
        });
      }

      if (previous7Ids.size > 0) {
        percentChange = ((current7Ids.size - previous7Ids.size) / previous7Ids.size) * 100;
      }
    }
    return { total, percentChange };
  }, [filteredPosts, duration, dateRange]);

  const sentimentByPlatformData = useMemo(() => {
    if (summaryUsable && Array.isArray(summaryData?.platforms) && summaryData.platforms.length > 0) {
      return summaryData.platforms.map((entry) => {
        const label = entry.platform || 'unknown';
        return {
          platform: label.charAt(0).toUpperCase() + label.slice(1),
          positive: entry.positive || 0,
          neutral: entry.neutral || 0,
          negative: entry.negative || 0,
          total: entry.total || 0,
        };
      });
    }
    const platformSentiment = {};
    filteredPosts.forEach((post) => {
      const sentiment = post.sentiment;
      if (!sentiment || !['positive', 'neutral', 'negative'].includes(sentiment)) return;
      const platform = post.platform || 'unknown';
      if (!platformSentiment[platform]) {
        platformSentiment[platform] = { positive: 0, neutral: 0, negative: 0 };
      }
      platformSentiment[platform][sentiment] += 1;
    });
    return Object.entries(platformSentiment).map(([platform, sentiments]) => ({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      positive: sentiments.positive,
      neutral: sentiments.neutral,
      negative: sentiments.negative,
      total: sentiments.positive + sentiments.neutral + sentiments.negative,
    }));
  }, [summaryUsable, summaryData, filteredPosts]);
  const keywordSentimentHeatmapData = useMemo(() => {
    if (summaryUsable && Array.isArray(summaryData?.keywords) && summaryData.keywords.length > 0) {
      return summaryData.keywords
        .slice(0, 10)
        .map((entry) => ({
          keyword: entry.keyword || 'unknown',
          positive: entry.positive || 0,
          neutral: entry.neutral || 0,
          negative: entry.negative || 0,
          total: entry.total || 0,
        }));
    }
    const keywordSentiment = {};
    filteredPosts.forEach((post) => {
      const sentiment = post.sentiment;
      if (!sentiment || !['positive', 'neutral', 'negative'].includes(sentiment)) return;
      const keyword = post.keyword || 'unknown';
      if (!keywordSentiment[keyword]) {
        keywordSentiment[keyword] = { positive: 0, neutral: 0, negative: 0 };
      }
      keywordSentiment[keyword][sentiment] += 1;
    });
    return Object.entries(keywordSentiment)
      .sort((a, b) => {
        const totalA = a[1].positive + a[1].neutral + a[1].negative;
        const totalB = b[1].positive + b[1].neutral + b[1].negative;
        return totalB - totalA;
      })
      .slice(0, 10)
      .map(([keyword, sentiments]) => ({
        keyword,
        positive: sentiments.positive,
        neutral: sentiments.neutral,
        negative: sentiments.negative,
        total: sentiments.positive + sentiments.neutral + sentiments.negative,
      }));
  }, [summaryUsable, summaryData, filteredPosts]);
  const handleExportSentimentDistribution = useCallback(() => {
    if (!sentimentChartData.length) return;

    const headers = ['Sentiment', 'Posts', 'Percentage'];
    const rows = sentimentChartData.map((item) => [
      item.name,
      item.value,
      item.percentage,
    ]);

    downloadCsv('sentiment-distribution', headers, rows);
  }, [sentimentChartData]);
  const handleExportTimeline = useCallback(() => {
    if (!timelineChartData.length) return;

    const headers = ['Date', 'Positive', 'Neutral', 'Negative', 'Total'];

    const rows = timelineChartData.map((item) => [
      item.date,
      item.positive,
      item.neutral,
      item.negative,
      item.total,
    ]);

    downloadCsv('sentiment-timeline', headers, rows);
  }, [timelineChartData]);
  const handleExportPlatformDistribution = useCallback(() => {
    if (!platformChartData.length) return;

    const headers = ['Platform', 'Posts', 'Percentage'];
    const rows = platformChartData.map((item) => [
      item.name,
      item.value,
      item.percentage,
    ]);

    downloadCsv('platform-distribution', headers, rows);
  }, [platformChartData]);
  const handleExportKeywordHeatmap = useCallback(() => {
    if (!keywordSentimentHeatmapData.length) return;

    const headers = ['Keyword', 'Positive', 'Neutral', 'Negative', 'Total'];
    const rows = keywordSentimentHeatmapData.map((item) => [
      item.keyword,
      item.positive,
      item.neutral,
      item.negative,
      item.total,
    ]);

    downloadCsv('keyword-sentiment-heatmap', headers, rows);
  }, [keywordSentimentHeatmapData]);
  const handleExportSentimentByPlatform = useCallback(() => {
    if (!sentimentByPlatformData.length) return;

    const headers = ['Platform', 'Positive', 'Neutral', 'Negative', 'Total'];
    const rows = sentimentByPlatformData.map((item) => [
      item.platform,
      item.positive,
      item.neutral,
      item.negative,
      item.total,
    ]);

    downloadCsv('sentiment-by-platform', headers, rows);
  }, [sentimentByPlatformData]);

  const handleExportMentionsCount = useCallback(() => {
    const { total, avgPerDay, percentChangeMentions, incomingTotal, outgoingTotal } = mentionCountMetrics;
    const formatPctValue = (v) => (v != null ? `${v.toFixed(2)}%` : '-');
    const headers = ['Metric', 'Value', 'Change (%)'];
    const rows = [
      ['Mentions Count', total.toLocaleString(), formatPctValue(percentChangeMentions)],
      ['Average Mentions/Day', Math.round(avgPerDay).toLocaleString(), formatPctValue(mentionCountMetrics.percentChangeAvg)],
      ['Incoming Mentions Count', incomingTotal.toLocaleString(), formatPctValue(percentChangeMentions)],
      ['Outgoing Mentions Count', outgoingTotal.toLocaleString(), '-'],
      ['Unique Users', uniqueUsersMetrics.total.toLocaleString(), formatPctValue(uniqueUsersMetrics.percentChange)],
    ];
    downloadCsv('mentions-count', headers, rows);
  }, [mentionCountMetrics, uniqueUsersMetrics]);

  const handleDownloadAnalyticsPdf = useCallback(async () => {
    try {
      const [{ jsPDF }, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro'),
      ]);
      const html2canvas = html2canvasModule.default || html2canvasModule;

      const printHideEls = Array.from(document.querySelectorAll('.print-hide'));
      printHideEls.forEach((el) => { el.style.display = 'none'; });

      try {
        const container = document.querySelector('.max-w-7xl');
        if (!container) throw new Error('Analytics container not found');

        const baseScale = 1.5;
        const maxCanvasDimension = 32760; // just under browser canvas dimension limit
        const containerHeight = container.scrollHeight || container.offsetHeight || 0;
        const captureHeight =
          containerHeight > 0 ? Math.min(containerHeight, maxCanvasDimension) : containerHeight;
        const safeScale =
          captureHeight > 0
            ? Math.min(baseScale, maxCanvasDimension / captureHeight)
            : baseScale;

        const canvas = await html2canvas(container, {
          scale: safeScale,
          useCORS: true,
          backgroundColor: '#000000',
          scrollX: 0,
          scrollY: 0,
          width: container.offsetWidth,
          height: captureHeight,
          windowWidth: container.offsetWidth,
          windowHeight: captureHeight,
          ignoreElements: (el) => el.classList.contains('dotted-background'),
        });

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth    = doc.internal.pageSize.getWidth();
        const pageHeight   = doc.internal.pageSize.getHeight();
        const margin       = 8;
        const imgWidth     = pageWidth - margin * 2;
        const mmPerPx      = imgWidth / canvas.width;
        const pageCanvasPx = (pageHeight - margin * 2) / mmPerPx;

        let srcY = 0;
        let firstPage = true;

        while (srcY < canvas.height) {
          if (!firstPage) doc.addPage();

          const sliceH = Math.min(pageCanvasPx, canvas.height - srcY);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width  = canvas.width;
          sliceCanvas.height = Math.ceil(sliceH);

          sliceCanvas.getContext('2d').drawImage(
            canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH,
          );

          doc.addImage(
            sliceCanvas.toDataURL('image/png'),
            'PNG', margin, margin, imgWidth, sliceH * mmPerPx,
          );

          srcY      += pageCanvasPx;
          firstPage  = false;
        }

        const datePart = new Date().toISOString().split('T')[0];
        doc.save(`analytics-report-${datePart}.pdf`);
      } finally {
        printHideEls.forEach((el) => { el.style.display = ''; });
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  }, []);
  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-4 h-4 text-green-500" />;
      case 'negative': return <Frown className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />;
      default: return <Meh className="w-4 h-4 text-yellow-500" />;
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <DottedBackground />
        <div className="relative z-10">Loading analytics...</div>
      </div>
    );
  }
  if (brands.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-6 relative">
        <DottedBackground />
        <div className="max-w-4xl mx-auto relative z-10">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="pt-6 text-center space-y-3">
              <p className="text-gray-400">No brands assigned to your account.</p>
              <p className="text-sm text-gray-500">Contact an administrator to assign brands.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-black text-white p-6 relative" style={{ backgroundColor: '#000000' }}>
      <DottedBackground />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Print hint – visible only in print, reminds user to enable Background Graphics */}
        <div className="hidden print:block mb-4 text-xs text-gray-400">
          Analytics Report &nbsp;·&nbsp; Generated: {new Date().toLocaleString()}
        </div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-gray-400"></p>
          </div>
          <div className="flex items-center gap-3 print-hide">
            <Button
              onClick={handleDownloadAnalyticsPdf}
              disabled={loadingPosts || analyzingSentiment || stats.total === 0}
              variant="outline"
              className="border-white/20 bg-white/5 hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              onClick={handleExportAnalytics}
              disabled={loadingPosts || analyzingSentiment || filteredPosts.length === 0}
              variant="outline"
              className="border-white/20 bg-white/5 hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={loadingPosts || analyzingSentiment}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  loadingPosts || analyzingSentiment ? 'animate-spin' : ''
                }`}
              />
              {analyzingSentiment ? 'Analyzing...' : 'Refresh'}
            </Button>
          </div>
        </div>
        {sentimentWarning && (
          <div className="mb-6 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
            {sentimentWarning}
          </div>
        )}
        {/* Filters */}
        <Card className="bg-black border-white/10 mb-6 print-hide">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedBrand(value);
                    setSelectedGroup('all');
                    setSelectedKeyword('all');
                    updateURL({
                      brand: value,
                      keywordGroup: 'all',
                      keyword: 'all',
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
                >
                  <option value="all">All Brands</option>
                  {brands.map((brand) => (
                    <option key={brand._id} value={brand.brandName}>
                      {brand.brandName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedPlatform(value);
                    updateURL({ platform: value });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
                >
                  <option value="all">All Platforms</option>
                  <option value="twitter">Twitter</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                  <option value="reddit">Reddit</option>
                  <option value="google">Google</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Keyword Group</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedGroup(value);
                    setSelectedKeyword('all');
                    updateURL({
                      keywordGroup: value,
                      keyword: 'all',
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
                  disabled={keywordGroups.length === 0}
                >
                  <option value="all">
                    {keywordGroups.length === 0 ? 'No Groups Available' : 'All Groups'}
                  </option>
                  {keywordGroups.map((group, idx) => {
                    const label = group.groupName || group.name || `Group ${idx + 1}`;
                    const andCount = Array.isArray(group.keywords) ? group.keywords.length : 0;
                    const orCount = Array.isArray(group.includeKeywords) ? group.includeKeywords.length : 0;
                    const totalCount = andCount + orCount;
                    // When "all brands" is selected, use compound format to distinguish groups from different brands
                    const optionValue = selectedBrand === 'all' && group.brandName
                      ? `${group.brandName}::${label}`
                      : label;
                    const displayLabel = selectedBrand === 'all' && group.brandName
                      ? `${label} (${group.brandName})`
                      : label;
                    return (
                      <option key={idx} value={optionValue}>
                        {displayLabel} ({totalCount})
                      </option>
                    );
                  })}
                </select>
                {keywordGroups.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Create keyword groups for this brand on the Keywords page to enable this filter.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Keyword</label>
                <select
                  value={selectedKeyword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedKeyword(value);
                    updateURL({ keyword: value });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
                >
                  <option value="all">All Keywords</option>
                  {availableKeywords.map((keyword, idx) => (
                    <option key={idx} value={keyword}>{keyword}</option>
                  ))}
                </select>
              </div>
              <DateRangePicker
                range={dateRange}
                onChange={(newRange) => {
                  setDateRange(newRange);
                  // Capture for URL sync when custom duration is confirmed right after
                  pendingPickerRangeRef.current = newRange;
                }}
                durationValue={duration}
                onDurationChange={(newDuration) => {
                  setDuration(newDuration);
                  if (newDuration === 'custom') {
                    const r = pendingPickerRangeRef.current;
                    if (r) updateURL({ duration: 'custom', start: r.start, end: r.end });
                  } else {
                    updateURL({ duration: newDuration === 'all-time' ? null : newDuration, start: null, end: null });
                  }
                }}
                timeRange={timeRange}
                onTimeChange={setTimeRange}
              />
            </div>
          </CardContent>
        </Card>
        {summaryError && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
            Failed to load stored sentiment summary. Displaying recent results from the latest fetch instead.
          </div>
        )}
        {summaryUsable && summaryStats && !summaryError && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Analyzed Posts</p>
              <p className="text-2xl font-bold text-white">{summaryStats.total.toLocaleString()}</p>
              <p className="text-xs text-gray-500">of {summaryStats.totalTracked.toLocaleString()} tracked posts</p>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Pending Analysis</p>
              <p className="text-2xl font-bold text-yellow-300">{summaryStats.pending.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Awaiting processing</p>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Last Sentiment Sync</p>
              <p className="text-base font-semibold text-white">
                {summaryStats.lastAnalyzedAt ? new Date(summaryStats.lastAnalyzedAt).toLocaleString() : 'Not available'}
              </p>
              {loadingSummary && (
                <p className="text-xs text-gray-500 mt-1">Refreshing summary…</p>
              )}
            </div>
          </div>
        )}
        {pendingInfo.pending > 0 && (
          <div className="mb-6 rounded-xl border border-yellow-600/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            {pendingInfo.pending === pendingInfo.total
              ? 'No stored sentiment is available for this selection yet. Run a refresh or recent search to populate analytics.'
              : `${pendingInfo.pending.toLocaleString()} of ${pendingInfo.total.toLocaleString()} posts are still awaiting sentiment analysis.`}
          </div>
        )}
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Total Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card 
            className="bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border-emerald-500/60 cursor-pointer transition-all hover:scale-105 hover:border-emerald-400/80 hover:shadow-lg hover:shadow-emerald-500/20"
            onClick={() => handleSentimentClick('positive')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smile className="w-5 h-5 text-emerald-300" />
                Positive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{formatCompactNumber(stats.bySentiment.positive)}</p>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {stats.total > 0 ? ((stats.bySentiment.positive / stats.total) * 100).toFixed(2) : 0} %
              </p>
              <p className={clsx('flex items-center gap-1 mt-1 text-sm', sentimentPercentChange.positive == null ? 'text-gray-500' : sentimentPercentChange.positive >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {sentimentPercentChange.positive != null ? (
                  <>
                    {sentimentPercentChange.positive >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {sentimentPercentChange.positive >= 0 ? '+' : ''}{sentimentPercentChange.positive.toFixed(2)}%
                  </>
                ) : (
                  '—'
                )}
              </p>
            </CardContent>
          </Card>
          <Card 
            className="bg-gradient-to-br from-yellow-500/20 to-yellow-400/10 border-yellow-500/60 cursor-pointer transition-all hover:scale-105 hover:border-yellow-400/80 hover:shadow-lg hover:shadow-yellow-500/20 "
            onClick={() => handleSentimentClick('neutral')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Meh className="w-5 h-5 text-yellow-300" />
                Neutral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{formatCompactNumber(stats.bySentiment.neutral)}</p>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {stats.total > 0 ? ((stats.bySentiment.neutral / stats.total) * 100).toFixed(2) : 0} %
              </p>
              <p className={clsx('flex items-center gap-1 mt-1 text-sm', sentimentPercentChange.neutral == null ? 'text-gray-500' : sentimentPercentChange.neutral >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {sentimentPercentChange.neutral != null ? (
                  <>
                    {sentimentPercentChange.neutral >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {sentimentPercentChange.neutral >= 0 ? '+' : ''}{sentimentPercentChange.neutral.toFixed(2)}%
                  </>
                ) : (
                  '—'
                )}
              </p>
            </CardContent>
          </Card>
          <Card 
            className="bg-gradient-to-br from-red-500/20 to-red-400/10 border-red-500/60 cursor-pointer transition-all hover:scale-105 hover:border-red-400/80 hover:shadow-lg hover:shadow-red-500/20 "
            onClick={() => handleSentimentClick('negative')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Frown className="w-5 h-5 text-red-300" />
                Negative
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{formatCompactNumber(stats.bySentiment.negative)}</p>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                {stats.total > 0 ? ((stats.bySentiment.negative / stats.total) * 100).toFixed(2) : 0} %
              </p>
              <p className={clsx('flex items-center gap-1 mt-1 text-sm', sentimentPercentChange.negative == null ? 'text-gray-500' : sentimentPercentChange.negative >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {sentimentPercentChange.negative != null ? (
                  <>
                    {sentimentPercentChange.negative >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {sentimentPercentChange.negative >= 0 ? '+' : ''}{sentimentPercentChange.negative.toFixed(2)}%
                  </>
                ) : (
                  '—'
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mentions Count, Incoming/Outgoing, Unique User */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Panel 1: Mentions Count */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Mentions Count</CardTitle>
              <div className="flex items-center gap-2 print-hide">
                <Button
                  onClick={handleExportMentionsCount}
                  size="sm"
                  variant="outline"
                  className="border-white/20 bg-white/5 hover:bg-white/10"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <div className="relative">
                  <button
                    onClick={() => setMentionsCountMenuOpen((v) => !v)}
                    className="rounded-md border border-white/20 bg-white/5 p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {mentionsCountMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 min-w-[140px] rounded-md border border-gray-700 bg-gray-900 py-1 shadow-lg">
                      <button
                        onClick={() => {
                          handleExportMentionsCount();
                          setMentionsCountMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition"
                      >
                        <Download className="h-3 w-3" />
                        Export CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Mentions Count</p>
                  <p className="text-3xl font-bold text-white">{formatCompactNumber(mentionCountMetrics.total)}</p>
                  {mentionCountMetrics.percentChangeMentions != null && (
                    <p className="flex items-center gap-1 mt-1 text-sm text-emerald-400">
                      <TrendingUp className="h-4 w-4" />
                      {mentionCountMetrics.percentChangeMentions.toFixed(2)}%
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Average Mentions/Day</p>
                  <p className="text-3xl font-bold text-white">{formatCompactNumber(Math.round(mentionCountMetrics.avgPerDay))}</p>
                  {mentionCountMetrics.percentChangeAvg != null && (
                    <p className="flex items-center gap-1 mt-1 text-sm text-emerald-400">
                      <TrendingUp className="h-4 w-4" />
                      {mentionCountMetrics.percentChangeAvg.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Panel 2: Incoming and Outgoing Mentions */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Incoming and Outgoing Mentions</CardTitle>
              <div className="flex items-center gap-2 print-hide">
                <Button
                  onClick={handleExportMentionsCount}
                  size="sm"
                  variant="outline"
                  className="border-white/20 bg-white/5 hover:bg-white/10"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <div className="relative">
                  <button
                    onClick={() => setIncomingOutgoingMenuOpen((v) => !v)}
                    className="rounded-md border border-white/20 bg-white/5 p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {incomingOutgoingMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 min-w-[140px] rounded-md border border-gray-700 bg-gray-900 py-1 shadow-lg">
                      <button
                        onClick={() => {
                          handleExportMentionsCount();
                          setIncomingOutgoingMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition"
                      >
                        <Download className="h-3 w-3" />
                        Export CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Incoming Mentions Count</p>
                  <p className="text-3xl font-bold text-white">{formatCompactNumber(mentionCountMetrics.incomingTotal)}</p>
                  {mentionCountMetrics.percentChangeMentions != null && (
                    <p className="flex items-center gap-1 mt-1 text-sm text-emerald-400">
                      <TrendingUp className="h-4 w-4" />
                      {mentionCountMetrics.percentChangeMentions.toFixed(2)}%
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Outgoing Mentions Count</p>
                  <p className="text-3xl font-bold text-white">{formatCompactNumber(mentionCountMetrics.outgoingTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Panel 3: Unique User */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Unique User</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Includes user activity only</p>
              </div>
              <div className="flex items-center gap-2 print-hide">
                <Button
                  onClick={handleExportMentionsCount}
                  size="sm"
                  variant="outline"
                  className="border-white/20 bg-white/5 hover:bg-white/10"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Unique User</p>
                <p className="text-3xl font-bold text-white">{formatCompactNumber(uniqueUsersMetrics.total)}</p>
                {uniqueUsersMetrics.percentChange != null && (
                  <p className={clsx('flex items-center gap-1 mt-1 text-sm', uniqueUsersMetrics.percentChange >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {uniqueUsersMetrics.percentChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {uniqueUsersMetrics.percentChange >= 0 ? '+' : ''}{uniqueUsersMetrics.percentChange.toFixed(2)}%
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sentiment Distribution - Phase 1.3: Added center text */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Sentiment Distribution</CardTitle>
              <Button
                onClick={handleExportSentimentDistribution}
                disabled={sentimentChartData.length === 0}
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 print-hide"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div ref={sentimentChartRef}>
                {sentimentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <defs>
                      <linearGradient id="gradientPositive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="gradientNeutral" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="gradientNegative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={sentimentChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={110}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                      paddingAngle={2}
                    >
                      {sentimentChartData.map((entry, index) => {
                        const colorMap = {
                          'positive': 'url(#gradientPositive)',
                          'neutral': 'url(#gradientNeutral)',
                          'negative': 'url(#gradientNegative)'
                        };
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={colorMap[entry.name.toLowerCase()] || SENTIMENT_COLORS[entry.name.toLowerCase()]}
                            stroke="#1f2937"
                            strokeWidth={2}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{ ...CHART_TOOLTIP_STYLE, color: '#ffffff' }}
                      itemStyle={{ color: '#ffffff' }}
                      labelStyle={{ color: '#ffffff' }}
                    />
                    {/* Phase 1.3: Center text showing total */}
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-3xl font-bold">
                      {stats.total.toLocaleString()}
                    </text>
                    <text x="50%" y="50%" dy={24} textAnchor="middle" dominantBaseline="middle" className="fill-gray-400 text-sm">
                      Total Posts
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                ) : (
                  <EmptyState
                    message="No sentiment data available"
                    helpText="Try adjusting your filters or refresh the data to see sentiment distribution."
                  />
                )}
              </div>
            </CardContent>
          </Card>
          {/* Platform Distribution */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Platform Distribution</CardTitle>
              <Button
                onClick={handleExportPlatformDistribution}
                disabled={platformChartData.length === 0}
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 print-hide"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div ref={platformChartRef}>
                {platformChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderPlatformLabel}
                      outerRadius={105}
                      innerRadius={55}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                      paddingAngle={2}
                    >
                      {platformChartData.map((entry, index) => (
                        <Cell
                          key={`platform-cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="#1f2937"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ ...CHART_TOOLTIP_STYLE, color: '#ffffff', backgroundColor: '#111827' }}
                      itemStyle={{ color: '#ffffff' }}
                      labelStyle={{ color: '#ffffff' }}
                      formatter={(value) => [value.toLocaleString(), 'Posts']}
                      labelFormatter={(label) => `Platform: ${label}`}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '16px' }}
                      formatter={(value) => value}
                    />
                  </PieChart>
                </ResponsiveContainer>
                ) : (
                  <EmptyState
                    message="No platform data available"
                    helpText="Posts from different platforms will appear here once data is loaded."
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Sentiment Timeline */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 mb-6 print-page-break print-avoid-break">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>
              Sentiment Timeline
              {duration !== 'all-time' ? (
                <span className="text-gray-400 font-normal ml-2">
                  ({DURATION_PRESETS.find((p) => p.value === duration)?.label ?? `${duration} days`})
                </span>
              ) : (
                <span className="text-gray-400 font-normal ml-2">(All Time)</span>
              )}
            </CardTitle>
            <Button
              onClick={handleExportTimeline}
              disabled={timelineChartData.length === 0}
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 hover:bg-white/10 print-hide"
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={timelineChartRef}>
              {timelineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={timelineChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="2 6" stroke="#374151" opacity={0.25} />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      interval="preserveStartEnd"
                      tickFormatter={(dateStr) => {
                        const d = parseYmdLocalMidnight(dateStr);
                        if (!d) return dateStr;
                        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                      }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      domain={[0, (dataMax) => Math.ceil(dataMax * 1.1) || 10]}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelFormatter={(dateStr) => {
                        const d = parseYmdLocalMidnight(dateStr);
                        return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : dateStr;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconType="line"
                      wrapperStyle={{ paddingTop: '16px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls
                      name="Total Posts"
                    />
                    <Line
                      type="monotone"
                      dataKey="positive"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls
                      name="Positive"
                    />
                    <Line
                      type="monotone"
                      dataKey="neutral"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls
                      name="Neutral"
                    />
                    <Line
                      type="monotone"
                      dataKey="negative"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls
                      name="Negative"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  message="No timeline data available"
                  helpText="Sentiment trends over time will appear here as data accumulates."
                />
              )}
            </div>
          </CardContent>
        </Card>
        {/* Sentiment by Platform */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 mb-6 print-page-break print-avoid-break">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Sentiment Distribution by Platform</CardTitle>
            <Button
              onClick={handleExportSentimentByPlatform}
              disabled={sentimentByPlatformData.length === 0}
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 hover:bg-white/10 print-hide"
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={sentimentByPlatformChartRef} className="min-h-[340px]">
              {sentimentByPlatformData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={sentimentByPlatformData}
                  margin={{ top: 24, right: 24, left: 24, bottom: 60 }}
                  layout="vertical"
                  barCategoryGap="12%"
                  barGap={4}
                >
                  <defs>
                    <linearGradient id="gradientPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="gradientNeu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="gradientNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" stroke="#374151" horizontal={false} vertical={true} opacity={0.25} />
                  <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={{ stroke: '#4b5563' }} />
                  <YAxis type="category" dataKey="platform" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={{ stroke: '#4b5563' }} width={90} tickLine={false} />
                  <Tooltip
                    content={<SentimentByPlatformTooltip />}
                    cursor={{ fill: 'rgba(15, 23, 42, 0.6)' }}
                  />
                  <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: 16 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="positive" stackId="a" fill="url(#gradientPos)" radius={[0, 0, 0, 0]} activeBar={false} />
                  <Bar dataKey="neutral" stackId="a" fill="url(#gradientNeu)" radius={[0, 0, 0, 0]} activeBar={false} />
                  <Bar dataKey="negative" stackId="a" fill="url(#gradientNeg)" radius={[0, 4, 4, 0]} activeBar={false} />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <EmptyState
                  message="No platform sentiment data"
                  helpText="Sentiment breakdown by platform will be displayed here."
                />
              )}
            </div>
          </CardContent>
        </Card>
        {/* Keyword Sentiment Heatmap */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 mb-6 print-page-break print-avoid-break">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Keyword Sentiment Heatmap (Top 10 Keywords)</CardTitle>
            <Button
              onClick={handleExportKeywordHeatmap}
              disabled={keywordSentimentHeatmapData.length === 0}
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 hover:bg-white/10 print-hide"
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={keywordHeatmapRef}>
              {keywordSentimentHeatmapData.length > 0 ? (
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-400 font-semibold">Keyword</th>
                      <th className="text-center p-3 text-gray-400 font-semibold">Positive</th>
                      <th className="text-center p-3 text-gray-400 font-semibold">Neutral</th>
                      <th className="text-center p-3 text-gray-400 font-semibold">Negative</th>
                      <th className="text-center p-3 text-gray-400 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywordSentimentHeatmapData.map((item, index) => {
                      const maxValue = Math.max(item.positive, item.neutral, item.negative);
                      return (
                        <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                          <td className="p-3 font-medium">{item.keyword}</td>
                          <td className="p-3">
                            <div className="relative h-7 w-full rounded overflow-hidden bg-gray-800">
                              <div
                                className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white transition-all"
                                style={{
                                  backgroundColor: `rgba(16, 185, 129, ${0.25 + (item.positive / item.total) * 0.75})`,
                                }}
                              >
                                {item.positive}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="relative h-7 w-full rounded overflow-hidden bg-gray-800">
                              <div
                                className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white transition-all"
                                style={{
                                  backgroundColor: `rgba(245, 158, 11, ${0.25 + (item.neutral / item.total) * 0.75})`,
                                }}
                              >
                                {item.neutral}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="relative h-7 w-full rounded overflow-hidden bg-gray-800">
                              <div
                                className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white transition-all"
                                style={{
                                  backgroundColor: `rgba(239, 68, 68, ${0.25 + (item.negative / item.total) * 0.75})`,
                                }}
                              >
                                {item.negative}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center text-gray-300 font-semibold">{item.total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              ) : (
                <EmptyState
                  message="No keyword data available"
                  helpText="Keyword sentiment breakdown will appear here once you have tracked keywords."
                />
              )}
            </div>
          </CardContent>
        </Card>
        {/* Word Cloud and Top Keywords */}
        <div className="space-y-6 mb-6">
          {/* Word Cloud Card */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 relative">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Word Cloud</CardTitle>
              <div className="flex items-center gap-2 print-hide">
                {/* Color Scheme Selector */}
                <div className="relative">
                  <button
                    onClick={() => setWordCloudColorMenuOpen((v) => !v)}
                    className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition"
                  >
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{
                        background: wordCloudColorScheme === 'multiple'
                          ? 'linear-gradient(135deg, #10B981, #3B82F6, #EC4899)'
                          : '#3B82F6',
                      }}
                    />
                    {wordCloudColorScheme === 'multiple' ? 'Multiple Colour' : 'Single Colour'}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {wordCloudColorMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] rounded-md border border-gray-700 bg-gray-900 py-1 shadow-lg">
                      {['multiple', 'single'].map((scheme) => (
                        <button
                          key={scheme}
                          onClick={() => {
                            setWordCloudColorScheme(scheme);
                            setWordCloudColorMenuOpen(false);
                          }}
                          className={clsx(
                            'flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-gray-800 transition',
                            wordCloudColorScheme === scheme ? 'text-white' : 'text-gray-400',
                          )}
                        >
                          <span
                            className="h-3 w-3 rounded-sm"
                            style={{
                              background: scheme === 'multiple'
                                ? 'linear-gradient(135deg, #10B981, #3B82F6, #EC4899)'
                                : '#3B82F6',
                            }}
                          />
                          {scheme === 'multiple' ? 'Multiple Colour' : 'Single Colour'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => setWordCloudMenuOpen((v) => !v)}
                    className="rounded-md border border-white/20 bg-white/5 p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {wordCloudMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 min-w-[140px] rounded-md border border-gray-700 bg-gray-900 py-1 shadow-lg">
                      <button
                        onClick={() => {
                          handleExportTopKeywords();
                          setWordCloudMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition"
                      >
                        <Download className="h-3 w-3" />
                        Export CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topKeywordsData.length > 0 ? (
                <WordCloud keywordFrequency={keywordFrequency} colorScheme={wordCloudColorScheme} />
              ) : (
                <EmptyState
                  message="No keyword data for word cloud"
                  helpText="Keywords from your posts will be visualized here."
                />
              )}
            </CardContent>
          </Card>

          {/* Channel Wise Engagement — Bar Chart + Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Channel Wise Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                {channelEngagementTableData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart
                      data={channelEngagementTableData.map((r) => ({
                        ...r,
                        platform: r.platform.charAt(0).toUpperCase() + r.platform.slice(1),
                      }))}
                      margin={{ top: 16, right: 56, left: 8, bottom: 70 }}
                      barCategoryGap="25%"
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="2 6" stroke="#374151" opacity={0.25} vertical={false} />
                      <XAxis
                        dataKey="platform"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        height={65}
                      />
                      {/* Left axis — Video Views */}
                      <YAxis
                        yAxisId="views"
                        orientation="left"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        tickFormatter={(v) => formatCompactNumber(v)}
                        width={48}
                        label={{ value: 'Video Views', angle: -90, position: 'insideLeft', dx: -4, fill: '#6b7280', fontSize: 10 }}
                      />
                      {/* Right axis — Interactions (Likes / Shares / Comments) */}
                      <YAxis
                        yAxisId="interactions"
                        orientation="right"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        tickFormatter={(v) => formatCompactNumber(v)}
                        width={48}
                        label={{ value: 'Interactions', angle: 90, position: 'insideRight', dx: 14, fill: '#6b7280', fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value, name) => [formatCompactNumber(Number(value)), name]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                      />
                      <Bar yAxisId="views" dataKey="views" name="Video Views" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={20} />
                      <Bar yAxisId="interactions" dataKey="likes" name="Post Likes" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={20} />
                      <Bar yAxisId="interactions" dataKey="shares" name="Post Shares" fill="#ec4899" radius={[3, 3, 0, 0]} maxBarSize={20} />
                      <Bar yAxisId="interactions" dataKey="comments" name="Post Comments" fill="#f9a8d4" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    message="No channel engagement data"
                    helpText="Channel metrics will appear here once post data is loaded."
                  />
                )}
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Channel Wise Engagement</CardTitle>
                <Button
                  onClick={() => {
                    if (!channelEngagementTableData.length) return;
                    const headers = ['Channel', 'Total Post', 'Likes', 'Comments', 'Shares', 'Video Views', 'Avg. Engagement'];
                    const rows = channelEngagementTableData.map((r) => [
                      r.platform, r.total, r.likes, r.comments, r.shares, r.views, r.avgEngagement,
                    ]);
                    downloadCsv('channel-wise-engagement', headers, rows);
                  }}
                  disabled={channelEngagementTableData.length === 0}
                  size="sm"
                  variant="outline"
                  className="border-white/20 bg-white/5 hover:bg-white/10 print-hide"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {channelEngagementTableData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-700">
                          {['Channel', 'Total Post', 'Likes', 'Comments', 'Shares', 'Video Views', 'Avg. Engagement'].map((h) => (
                            <th key={h} className="py-3 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {channelEngagementTableData.map((row) => (
                          <tr key={row.platform} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3">
                              <PlatformBadge platform={row.platform} />
                            </td>
                            <td className="py-3 px-3 text-white font-medium">{row.total.toLocaleString()}</td>
                            <td className="py-3 px-3 text-gray-300">{formatCompactNumber(row.likes)}</td>
                            <td className="py-3 px-3 text-gray-300">{formatCompactNumber(row.comments)}</td>
                            <td className="py-3 px-3 text-gray-300">{formatCompactNumber(row.shares)}</td>
                            <td className="py-3 px-3 text-gray-300">{formatCompactNumber(row.views)}</td>
                            <td className="py-3 px-3 text-gray-300">{formatCompactNumber(row.avgEngagement)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    message="No channel engagement data"
                    helpText="Channel metrics will appear here once post data is loaded."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Keywords Card */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Top Keywords</CardTitle>
              <div className="flex items-center gap-2 print-hide">
                <Button
                  onClick={handleExportTopKeywords}
                  disabled={topKeywordsData.length === 0}
                  size="sm"
                  variant="outline"
                  className="border-white/20 bg-white/5 hover:bg-white/10"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <div className="relative">
                  <button
                    onClick={() => setTopKeywordsMenuOpen((v) => !v)}
                    className="rounded-md border border-white/20 bg-white/5 p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {topKeywordsMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 min-w-[140px] rounded-md border border-gray-700 bg-gray-900 py-1 shadow-lg">
                      <button
                        onClick={() => {
                          handleExportTopKeywords();
                          setTopKeywordsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition"
                      >
                        <Download className="h-3 w-3" />
                        Export CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topKeywordsData.length > 0 ? (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-gray-400 font-semibold text-sm">Top Keywords</th>
                          <th className="text-right p-3 text-gray-400 font-semibold text-sm">Mentions Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTopKeywords.map((item, index) => (
                          <tr
                            key={item.keyword}
                            className="border-b border-gray-800/50 hover:bg-gray-800/40 transition"
                          >
                            <td className="p-3 text-sm text-gray-200">{item.keyword}</td>
                            <td className="p-3 text-sm text-right text-gray-300 font-medium">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className="flex items-center justify-between px-3 pt-4 pb-1 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>Rows per page</span>
                      <select
                        value={topKeywordsRowsPerPage}
                        onChange={(e) => {
                          setTopKeywordsRowsPerPage(Number(e.target.value));
                          setTopKeywordsPage(1);
                        }}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
                      >
                        {[5, 10, 20, 50].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>
                        {(topKeywordsPage - 1) * topKeywordsRowsPerPage + 1}-
                        {Math.min(topKeywordsPage * topKeywordsRowsPerPage, topKeywordsData.length)} of {topKeywordsData.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setTopKeywordsPage((p) => Math.max(1, p - 1))}
                          disabled={topKeywordsPage === 1}
                          className="rounded p-1 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: totalTopKeywordsPages }, (_, i) => i + 1)
                          .filter((p) => Math.abs(p - topKeywordsPage) <= 1 || p === 1 || p === totalTopKeywordsPages)
                          .map((p, idx, arr) => {
                            const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                            return (
                              <span key={p} className="flex items-center">
                                {showEllipsis && <span className="px-1 text-gray-600">…</span>}
                                <button
                                  onClick={() => setTopKeywordsPage(p)}
                                  className={clsx(
                                    'min-w-[24px] rounded px-1.5 py-0.5 text-xs transition',
                                    topKeywordsPage === p
                                      ? 'bg-blue-600 text-white'
                                      : 'hover:bg-gray-700 text-gray-400',
                                  )}
                                >
                                  {p}
                                </button>
                              </span>
                            );
                          })}
                        <button
                          onClick={() => setTopKeywordsPage((p) => Math.min(totalTopKeywordsPages, p + 1))}
                          disabled={topKeywordsPage === totalTopKeywordsPages}
                          className="rounded p-1 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  message="No keyword data available"
                  helpText="Top keywords and their mention counts will appear here."
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Languages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Language Pie Chart */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Top Languages</CardTitle>
              <Button
                onClick={handleExportLanguages}
                disabled={languageTableData.length === 0}
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 print-hide"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {languageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <defs>
                      {languageChartData.map((_, idx) => (
                        <linearGradient key={`langGrad${idx}`} id={`langGrad${idx}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={LANGUAGE_COLORS[idx % LANGUAGE_COLORS.length]} stopOpacity={1} />
                          <stop offset="100%" stopColor={LANGUAGE_COLORS[idx % LANGUAGE_COLORS.length]} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={languageChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={130}
                      innerRadius={0}
                      dataKey="value"
                      label={renderLanguageLabel}
                      labelLine={false}
                      animationBegin={0}
                      animationDuration={800}
                      paddingAngle={1}
                    >
                      {languageChartData.map((_, idx) => (
                        <Cell
                          key={`lang-cell-${idx}`}
                          fill={`url(#langGrad${idx})`}
                          stroke="#1f2937"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ ...CHART_TOOLTIP_STYLE, color: '#ffffff', backgroundColor: '#111827' }}
                      itemStyle={{ color: '#ffffff' }}
                      labelStyle={{ color: '#ffffff' }}
                      formatter={(value, name) => [`${value.toLocaleString()} mentions`, name]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '16px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  message="No language data available"
                  helpText="Language detection data will appear here once posts are analyzed."
                />
              )}
            </CardContent>
          </Card>

          {/* Language Table */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>
                Top Languages{' '}
                <span className="text-sm font-normal text-gray-400">
                  (Showing Top {languageTableData.length})
                </span>
              </CardTitle>
              <Button
                onClick={handleExportLanguages}
                disabled={languageTableData.length === 0}
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 print-hide"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {languageTableData.length > 0 ? (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-gray-400 font-semibold text-sm">Language</th>
                          <th className="text-center p-3 text-gray-400 font-semibold text-sm">Mention Count</th>
                          <th className="text-center p-3 text-gray-400 font-semibold text-sm">Mention Count Percent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLanguageData.map((item) => (
                          <tr
                            key={item.code}
                            className="border-b border-gray-800/50 hover:bg-gray-800/40 transition"
                          >
                            <td className="p-3 text-sm text-gray-200 font-medium">{item.name}</td>
                            <td className="p-3 text-sm text-center text-gray-300">{item.count.toLocaleString()}</td>
                            <td className="p-3 text-sm text-center text-gray-300">{item.percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className="flex items-center justify-between px-3 pt-4 pb-1 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>Rows per page</span>
                      <select
                        value={languageRowsPerPage}
                        onChange={(e) => {
                          setLanguageRowsPerPage(Number(e.target.value));
                          setLanguagePage(1);
                        }}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
                      >
                        {[5, 10, 20, 50].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>
                        {(languagePage - 1) * languageRowsPerPage + 1}-
                        {Math.min(languagePage * languageRowsPerPage, languageTableData.length)} of {languageTableData.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setLanguagePage((p) => Math.max(1, p - 1))}
                          disabled={languagePage === 1}
                          className="rounded p-1 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: totalLanguagePages }, (_, i) => i + 1)
                          .filter((p) => Math.abs(p - languagePage) <= 1 || p === 1 || p === totalLanguagePages)
                          .map((p, idx, arr) => {
                            const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                            return (
                              <span key={p} className="flex items-center">
                                {showEllipsis && <span className="px-1 text-gray-600">...</span>}
                                <button
                                  onClick={() => setLanguagePage(p)}
                                  className={clsx(
                                    'min-w-[24px] rounded px-1.5 py-0.5 text-xs transition',
                                    languagePage === p
                                      ? 'bg-blue-600 text-white'
                                      : 'hover:bg-gray-700 text-gray-400',
                                  )}
                                >
                                  {p}
                                </button>
                              </span>
                            );
                          })}
                        <button
                          onClick={() => setLanguagePage((p) => Math.min(totalLanguagePages, p + 1))}
                          disabled={languagePage === totalLanguagePages}
                          className="rounded p-1 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  message="No language data available"
                  helpText="Language breakdown will appear here once posts are analyzed."
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Posts */}
        <section id="analytics-recent-posts-section" className="print-hide">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Recent Posts with Sentiment</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 print-hide"
                onClick={() => setIsRecentPostsCollapsed((v) => !v)}
                aria-expanded={!isRecentPostsCollapsed}
              >
                <ChevronDown
                  className={clsx(
                    'h-4 w-4 flex-shrink-0 transition-transform',
                    !isRecentPostsCollapsed && 'rotate-180',
                  )}
                />
                {isRecentPostsCollapsed ? 'Show comments' : 'Hide comments'}
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPosts || analyzingSentiment ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="ml-3 text-gray-400">
                    {analyzingSentiment ? 'Analyzing sentiment...' : 'Loading posts...'}
                  </p>
                </div>
              ) : filteredPosts.length > 0 ? (
                <div className="space-y-4">
                  {isRecentPostsCollapsed ? (
                    <div className="py-6 text-center text-sm text-gray-400">
                      Comments hidden.
                    </div>
                  ) : (
                    filteredPosts.map((post) => (
                      <AnalyticsMentionCard key={post._id || post.id} post={post} />
                    ))
                  )}
                </div>
              ) : (
                <EmptyState
                  message="No posts found"
                  helpText="Try running a search from the Keywords page or adjusting your filters."
                />
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

// Wrap the searchParams-using content in a Suspense boundary so that
// Next.js can safely prerender / hydrate the page without a CSR bailout.
export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <DottedBackground />
          <div className="relative z-10">Loading analytics...</div>
        </div>
      )}
    >
      <AnalyticsPageContent />
    </Suspense>
  );
}
