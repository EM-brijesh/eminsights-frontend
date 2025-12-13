'use client';

import { useEffect, useMemo, useState, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ActivitySquare,
  Calendar,
  ChevronLeft,
  ChevronRight,
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
  Play,
  X,
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
  { label: 'All Time', value: 'all-time' },
 

];

const TABS = [
  //  { key: 'tickets', label: 'Tickets', icon: Inbox },
 // { key: 'all', label: 'All Mentions', icon: ActivitySquare },
  // { key: 'user', label: 'User Activity', icon: Users },
  // { key: 'brand', label: 'Brand Activity', icon: ActivitySquare },
  // { key: 'actionable', label: 'Actionable', icon: CheckCircle2 },
  //{ key: 'non-actionable', label: 'Non Actionable', icon: Circle },
];

const PLATFORM_OPTIONS = [
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'google', label: 'Google' },
  {value:  'facebook', label: 'Facebook' },
  {value: 'instagram', label: 'Instagram' },
];

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const DEFAULT_DURATION = '1';
const DEFAULT_POSTS_LIMIT = 100;
const EXTENDED_POSTS_LIMIT = 1000;
const MAX_RANGE_POSTS_LIMIT = 3000;
const RANGE_POSTS_PER_DAY = 150;

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const createDefaultDateRange = () => {
  const today = new Date();
  const todayStr = formatDateInput(today);
  return { start: todayStr, end: todayStr };
};

const formatDisplayDate = (value) => {
  const parsed = parseDateOnly(value);
  if (!parsed) return 'Select dates';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const buildRangeFromDuration = (days) => {
  // Special case: full history
  if (days === 'all-time') {
    const end = new Date();
    // Pick a very early anchor so we include all historical posts
    const start = new Date(2000, 0, 1);
    return { start: formatDateInput(start), end: formatDateInput(end) };
  }

  const durationNum = Number(days);
  if (Number.isNaN(durationNum) || durationNum <= 0) {
    return createDefaultDateRange();
  }
  
  // For very large durations (>= 3650 days ~10 years), use same "all-time" behavior
  // This ensures consistency when redirecting from analytics with large duration values
  if (durationNum >= 3650) {
    const end = new Date();
    const start = new Date(2000, 0, 1);
    return { start: formatDateInput(start), end: formatDateInput(end) };
  }
  
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - durationNum + 1);
  return { start: formatDateInput(start), end: formatDateInput(end) };
};

const isDefaultDateRange = (range) => {
  if (!range) return false;
  const today = formatDateInput(new Date());
  return range.start === today && range.end === today;
};

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

const getRangeDays = (range) => {
  const start = parseDateOnly(range?.start);
  const end = parseDateOnly(range?.end);
  if (!start || !end) return 1;
  const ms = Math.abs(end.getTime() - start.getTime());
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
};

const rangeAwareLimit = (range) => {
  const days = getRangeDays(range);
  const estimated = Math.ceil(days * RANGE_POSTS_PER_DAY);
  return Math.min(MAX_RANGE_POSTS_LIMIT, Math.max(DEFAULT_POSTS_LIMIT, estimated));
};

const normalizeName = (value) => (value || '').toString().trim();

const makeGroupId = (brandName, group) => {
  const brandKey = normalizeName(brandName) || 'brand';
  const groupKey = normalizeName(group?._id || group?.groupName || group?.name) || 'group';
  return `${brandKey}::${groupKey}`;
};

const splitKeywordCompoundId = (compoundId) => {
  if (!compoundId || typeof compoundId !== 'string') {
    return { groupId: '', keywordValue: '' };
  }
  const delimiter = '::';
  const lastIndex = compoundId.lastIndexOf(delimiter);
  if (lastIndex === -1) {
    return { groupId: '', keywordValue: compoundId };
  }
  return {
    groupId: compoundId.slice(0, lastIndex),
    keywordValue: compoundId.slice(lastIndex + delimiter.length),
  };
};

const getPostKeyword = (post) => {
  const keyword =
    post?.keyword ||
    post?.content?.keyword ||
    post?.content?.tag ||
    post?.analysis?.keyword ||
    post?.tag ||
    post?.topic;
  return normalizeName(keyword).toLowerCase();
};

const flattenMediaValues = (value, bucket) => {
  if (!value) return;
  if (typeof value === 'string') {
    bucket.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => flattenMediaValues(item, bucket));
    return;
  }
  if (typeof value === 'object') {
    const possibleKeys = [
      'url',
      'media_url',
      'media_url_https',
      'preview_image_url',
      'image',
      'imageUrl',
      'mediaUrl',
      'source',
      'src',
    ];
    possibleKeys.forEach((key) => {
      if (value[key]) {
        flattenMediaValues(value[key], bucket);
      }
    });
  }
};

const extractMediaAssets = (post) => {
  const collected = [];
  flattenMediaValues(post?.content?.mediaUrl, collected);
  flattenMediaValues(post?.mediaUrl, collected);
  flattenMediaValues(post?.content?.imageUrl, collected);
  flattenMediaValues(post?.content?.mediaUrls, collected);
  flattenMediaValues(post?.content?.media, collected);
  flattenMediaValues(post?.media, collected);
  flattenMediaValues(post?.attachments, collected);
  flattenMediaValues(post?.content?.videoUrl, collected);
  flattenMediaValues(post?.videoUrl, collected);
  flattenMediaValues(post?.content?.videoVariants, collected);

  const unique = [...new Set(collected.filter(Boolean))];
  const videos = [];
  const images = [];

  unique.forEach((url) => {
    const lower = url.toLowerCase();
    if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      videos.push(url);
    } else if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      images.push(url);
    } else if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      videos.push(url);
    } else {
      images.push(url);
    }
  });

  return {
    videos,
    images,
  };
};

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
    google: { label: 'Google', color: 'bg-indigo-500/20 text-indigo-100 border-indigo-400/60' },
  };
  const info = map[platform?.toLowerCase()] || map.google;
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

function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function VideoModal({ modalContent, onClose }) {
  if (!modalContent) return null;

  const isYouTube = modalContent.type === 'youtube';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-black/90 p-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white transition hover:border-white/40"
        >
          Close
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          {isYouTube ? (
            <iframe
              src={`https://www.youtube.com/embed/${modalContent.youtubeId}?autoplay=1`}
              className="h-full w-full"
              title="YouTube player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              className="h-full w-full object-contain"
              controls
              autoPlay
              poster={modalContent.poster}
            >
              <source src={modalContent.url} type={modalContent.mimeType || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaPreview({ post }) {
  const [modalContent, setModalContent] = useState(null);
  const platform = (post?.platform || '').toLowerCase();
  const sourceUrl = post?.sourceUrl || post?.content?.url || '';
  const youtubeId = getYouTubeId(sourceUrl);
  const { videos, images } = useMemo(() => extractMediaAssets(post), [post]);

  const youtubePreview =
    (platform === 'youtube' || youtubeId) && youtubeId ? (
      <div className="mt-3 w-full max-w-xs overflow-hidden rounded-lg border border-white/10 bg-black">
        <button
          type="button"
          className="group relative block w-full"
          onClick={() =>
            setModalContent({
              type: 'youtube',
              youtubeId,
            })
          }
        >
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
            alt="Video thumbnail"
            className="h-auto w-full object-cover opacity-80 transition group-hover:opacity-100"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-110">
              <Play className="ml-1 h-5 w-5 fill-current" />
            </div>
          </div>
        </button>
      </div>
    ) : null;

  if (youtubePreview) {
    return (
      <>
        {youtubePreview}
        <VideoModal modalContent={modalContent} onClose={() => setModalContent(null)} />
      </>
    );
  }

  if (videos.length > 0) {
    const videoUrl = videos[0];
    const videoType = VIDEO_EXTENSIONS.find((ext) => videoUrl.toLowerCase().endsWith(ext)) || '.mp4';
    const mimeMap = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.m4v': 'video/mp4',
    };
    return (
      <>
        <div className="mt-3 w-full max-w-xs overflow-hidden rounded-lg border border-white/10 bg-black/40">
          <button
            type="button"
            className="relative block w-full"
            onClick={() =>
              setModalContent({
                type: 'video',
                url: videoUrl,
                poster: images.length > 0 ? images[0] : undefined,
                mimeType: mimeMap[videoType],
              })
            }
          >
            {images.length > 0 ? (
              <img
                src={images[0]}
                alt="Video poster"
                className="h-auto w-full object-cover opacity-80 transition group-hover:opacity-100"
                loading="lazy"
              />
            ) : (
              <div className="aspect-video w-full bg-black/60" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition group-hover:scale-110">
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </div>
            </div>
          </button>
        </div>
        <VideoModal modalContent={modalContent} onClose={() => setModalContent(null)} />
      </>
    );
  }

  if (images.length > 0) {
    const displayImages = images.slice(0, 3);
    return (
      <div className="mt-3 flex flex-wrap gap-3">
        {displayImages.map((img, index) => {
          const remaining = images.length - displayImages.length;
          const showOverlay = index === displayImages.length - 1 && remaining > 0;
          return (
            <div
              key={`${img}-${index}`}
              className="relative inline-block overflow-hidden rounded-lg border border-white/10 bg-black/20"
            >
              <img
                src={img}
                alt="Post preview"
                className="max-h-48 max-w-xs cursor-pointer object-contain transition hover:opacity-90"
                loading="lazy"
                onClick={() => window.open(img, '_blank', 'noopener,noreferrer')}
              />
              {showOverlay && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-semibold text-white">
                  +{remaining}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

function MentionCard({ post }) {
  const brandName = post?.brand?.brandName || 'Unknown Brand';
  const author = post?.author?.name || post?.author?.id || 'Anonymous';
  const platform = post?.platform || 'google';
  const sentiment = post?.analysis?.sentiment || 'neutral';
  const keywordValue = getPostKeyword(post);
  const underlineColor =
    sentiment === 'negative'
      ? 'border-red-500/60 text-red-300'
      : sentiment === 'positive'
        ? 'border-emerald-500/60 text-emerald-300'
        : 'border-yellow-500/60 text-yellow-300';
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
          <span
            className="inline-flex max-w-[180px] items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-100"
            title={keywordValue ? `Keyword: ${keywordValue}` : 'Keyword unavailable'}
          >
            <Search className="h-4 w-4 text-indigo-200" />
            <span className="truncate">
              {keywordValue || 'Keyword N/A'}
            </span>
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
        <MediaPreview post={post} />
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

function MultiSelect({
  options,
  value,
  onChange,
  label,
  brandDetails = [],
  selectedKeywordGroups = [],
  onToggleKeywordGroup = () => { },
  selectedKeywords = [],
  onToggleKeyword = () => { },
  expandedGroups = {},
  onToggleExpand = () => { },
}) {
  const [open, setOpen] = useState(false);
  const [activeBrand, setActiveBrand] = useState(value[0] || options[0] || '');

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

  useEffect(() => {
    if (value.length === 0) {
      setActiveBrand('');
      return;
    }
    if (!value.includes(activeBrand)) {
      setActiveBrand(value[value.length - 1]);
    }
  }, [value, activeBrand]);

  const handleToggle = (option) => {
    if (option === '__all__') {
      onChange([]);
      setActiveBrand('');
      return;
    }
    setActiveBrand(option);
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
    <div className="relative brand-multi-select w-full sm:w-auto">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex w-full min-w-[180px] items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10 sm:w-auto"
      >
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">{label}</span>
          <span>{displayLabel}</span>
        </span>
        <Filter className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <div className="absolute left-0 z-[200] mt-2 w-[min(90vw,720px)] rounded-xl border border-white/10 bg-[#080808] p-3 shadow-xl shadow-black/40">
          <div className="mb-3 flex items-center justify-between text-xs uppercase text-gray-500">
            <span>Select Brands</span>
            <button
              className="text-indigo-300 transition hover:text-indigo-100"
              onClick={() => {
                onChange([]);
                setActiveBrand('');
              }}
            >
              Reset
            </button>
          </div>
          <div className="flex flex-col gap-4 md:flex-row">
            <ul className="max-h-64 flex-1 space-y-1 overflow-y-auto pr-1 text-sm">
              <li>
                <button
                  onClick={() => {
                    handleToggle('__all__');
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
                      onClick={() => handleToggle(option)}
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
            {brandDetails && brandDetails.length > 0 && (
              <div className="flex-1 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 text-xs uppercase tracking-widest text-gray-500">
                  {value.length === 0
                    ? 'All Brands Keywords'
                    : value.length === 1
                      ? `${value[0]} Keywords`
                      : 'Selected Brands Keywords'}
                </div>
                <KeywordTree
                  brandDetails={brandDetails}
                  // When no specific brands are selected, pass an empty array so
                  // KeywordTree falls back to showing all brands' keyword groups.
                  visibleBrands={value}
                  selectedGroups={selectedKeywordGroups}
                  onToggleGroup={onToggleKeywordGroup}
                  selectedKeywords={selectedKeywords}
                  onToggleKeyword={onToggleKeyword}
                  expandedGroups={expandedGroups}
                  onToggleExpand={onToggleExpand}
                  className="max-h-64 border-none bg-transparent p-0"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DateRangePicker({ range, onChange, durationValue, onDurationChange, timeRange, onTimeChange }) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(range || createDefaultDateRange());
  const [selectionMode, setSelectionMode] = useState(durationValue === 'custom' ? 'custom' : 'preset');
  const [timeError, setTimeError] = useState('');
  const [lastClickedDate, setLastClickedDate] = useState(null);
  const [viewDateStart, setViewDateStart] = useState(() => {
    const start = parseDateOnly(range?.start) || new Date();
    return new Date(start.getFullYear(), start.getMonth(), 1);
  });

  const [viewDateEnd, setViewDateEnd] = useState(() => {
    const start = parseDateOnly(range?.start) || new Date();
    return new Date(start.getFullYear(), start.getMonth() + 1, 1);
  });

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];
  const ampm = ['AM', 'PM'];
  const quickRanges = [...DURATION_PRESETS, { label: 'custom', value: 'custom' }];

  const normalizeRangeOrder = (nextRange) => {
    const start = parseDateOnly(nextRange?.start);
    const end = parseDateOnly(nextRange?.end);
    if (start && end && start > end) {
      return { start: nextRange.end, end: nextRange.start };
    }
    return nextRange;
  };

  const startDate = parseDateOnly(draftRange?.start);
  const endDate = parseDateOnly(draftRange?.end);

  useEffect(() => {
    setDraftRange(range || createDefaultDateRange());
  }, [range]);

  // Default to today's date when picker opens for the first time
  useEffect(() => {
    if (open && !range) {
      const todayRange = createDefaultDateRange();
      setDraftRange(todayRange);
    }
  }, [open]);

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

  const moveMonth = (calendarType, delta) => {
    if (calendarType === 'start') {
      setViewDateStart((prev) => {
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + delta);
        return new Date(next.getFullYear(), next.getMonth(), 1);
      });
    } else if (calendarType === 'end') {
      setViewDateEnd((prev) => {
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + delta);
        return new Date(next.getFullYear(), next.getMonth(), 1);
      });
    }
  };

  const applyPreset = (days) => {
    const nextRange = normalizeRangeOrder(buildRangeFromDuration(days));
    onDurationChange?.(String(days));
    onChange(nextRange);
    // Preserve time range instead of resetting it
    setDraftRange(nextRange);
    setSelectionMode('preset');
    setTimeError('');
    setOpen(false);
  };

  const enableCustomMode = () => {
    setSelectionMode('custom');
    onDurationChange?.('custom');
    setTimeError('');
    // Keep picker open for custom selection
  };

  const handleDayClick = (date) => {
    const dateStr = formatDateInput(date);
    setSelectionMode('custom');
    onDurationChange?.('custom');
    setTimeError('');

    setDraftRange((prev) => {
      const hasStart = prev?.start;
      const hasEnd = prev?.end;
      const prevStartStr = prev?.start;
      const prevEndStr = prev?.end;
      
      // Check if both dates are already selected and different
      if (hasStart && hasEnd && prevStartStr !== prevEndStr) {
        // If clicking a different date, reset to new "from" date only
        setLastClickedDate(dateStr);
        return {
          start: dateStr,
          end: dateStr
        };
      }
      
      // If start and end are the same (single day range) or only start is set
      if (hasStart) {
        // If clicking the same date as start (double-click), keep both as that date
        if (prevStartStr === dateStr) {
          setLastClickedDate(dateStr);
          return {
            start: dateStr,
            end: dateStr
          };
        }
        // Otherwise, set as end date (completing the range)
        setLastClickedDate(dateStr);
        return {
          start: prevStartStr,
          end: dateStr
        };
      }
      
      // No dates selected, set as start date (single day range initially)
      setLastClickedDate(dateStr);
      return {
        start: dateStr,
        end: dateStr
      };
    });
  };

  const validateTimeRange = () => {
    const start = parseDateOnly(draftRange.start);
    const end = parseDateOnly(draftRange.end);

    // Only validate if same day
    if (start && end && start.getTime() === end.getTime()) {
      const fromHour = (parseInt(timeRange.from.h) % 12) + (timeRange.from.ampm === 'PM' ? 12 : 0);
      const fromMins = fromHour * 60 + parseInt(timeRange.from.m);
      const toHour = (parseInt(timeRange.to.h) % 12) + (timeRange.to.ampm === 'PM' ? 12 : 0);
      const toMins = toHour * 60 + parseInt(timeRange.to.m);

      if (fromMins >= toMins) {
        setTimeError('End time must be after start time for same-day ranges');
        return false;
      }
    }

    setTimeError('');
    return true;
  };

  const applyDraft = () => {
    if (!validateTimeRange()) return;

    const normalized = normalizeRangeOrder(draftRange);
    setDraftRange(normalized);
    onChange(normalized);
    onDurationChange?.('custom');
    setOpen(false);
  };

  const handleReset = () => {
    const defaults = createDefaultDateRange();
    setDraftRange(defaults);
    onChange(defaults);
    onDurationChange?.(DEFAULT_DURATION);
    onTimeChange(createDefaultTimeRange());
    setSelectionMode('preset');
    setLastClickedDate(null);
    setTimeError('');
  };

  const renderMonth = (baseDate, calendarType) => {
    const isStartCalendar = calendarType === 'start';
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = startOfMonth.getDay(); // 0-6
    const cells = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    const borderColor = isStartCalendar ? 'border-emerald-500/20' : 'border-indigo-500/20';

    return (
      <div className={clsx('rounded-lg border bg-black/40 p-3', borderColor)}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => moveMonth(calendarType, -1)}
            className="rounded-full border border-white/10 p-1 text-gray-300 transition hover:border-white/20 hover:text-white"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-xs font-semibold text-gray-100">
            {startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>

          <button
            type="button"
            onClick={() => moveMonth(calendarType, 1)}
            className="rounded-full border border-white/10 p-1 text-gray-300 transition hover:border-white/20 hover:text-white"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] capitalize tracking-widest text-gray-400">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7  text-xs">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <span key={`empty-${idx}`} />;
            }
            const cellStr = formatDateInput(cell);
            const isStart = draftRange?.start && cellStr === draftRange.start;
            const isEnd = draftRange?.end && cellStr === draftRange.end;
            const inRange =
              startDate &&
              endDate &&
              cell >= (startDate <= endDate ? startDate : endDate) &&
              cell <= (endDate >= startDate ? endDate : startDate);

            // Check for future dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isFuture = cell > today;

            return (
              <button
                key={cellStr}
                onClick={() => !isFuture && handleDayClick(cell)}
                className={clsx(
                  'relative flex h-6 flex-col items-center justify-center rounded-md transition',
                  isFuture
                    ? 'cursor-not-allowed text-gray-200 opacity-70'
                    : isStart || isEnd
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : inRange
                        ? 'bg-indigo-500/10 text-indigo-100'
                        : 'text-gray-200 hover:bg-white/5'
                )}
                title={isFuture ? 'Future dates not available' : (isStart ? 'From date' : isEnd ? 'To date' : '')}
              >
                <span>{cell.getDate()}</span>
                {isFuture && (
                  <X className="absolute inset-0 m-auto h-4 w-4 text-gray-500 opacity-70" strokeWidth={2.5} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const getButtonLabel = () => {
    const fromDate = formatDisplayDate(range?.start);
    const toDate = formatDisplayDate(range?.end);
    const modeLabel = selectionMode === 'preset'
      ? (DURATION_PRESETS.find(p => p.value === durationValue)?.label || 'Preset')
      : 'Custom';

    const isDefaultTime = isDefaultTimeRange(timeRange);
    const timeLabel = !isDefaultTime
      ? ` (${timeRange.from.h}:${timeRange.from.m} ${timeRange.from.ampm} - ${timeRange.to.h}:${timeRange.to.m} ${timeRange.to.ampm})`
      : '';

    return `${modeLabel}: ${fromDate} - ${toDate}${timeLabel}`;
  };

  const buttonLabel = getButtonLabel();

  return (
    <div className="relative duration-picker w-full min-w-[220px] sm:w-auto">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex w-full min-w-[220px] items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xss font-medium text-white transition hover:border-white/20 hover:bg-white/10 sm:w-auto"
      >
        <span className="flex flex-col items-start leading-tight">
          <span className="text-sm uppercase tracking-widest text-gray-400">Date </span>
          <span className="text-[15px]">{buttonLabel}</span>
        </span>
        <Calendar className="h-4 w-4 text-gray-300" />
      </button>

      {open && (
        <div className="absolute left-1/2 z-[200] mt-2 w-[580px] min-w-[50px] max-w-[50vw] -translate-x-1/2 rounded-xl border border-white/10 bg-[#080808] p-2.5 shadow-2xl shadow-black/50">
          

          <div className="mb-2 flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="text-xss uppercase tracking-widest text-gray-400">From:</span>
              <span className="font-medium text-white">{formatDisplayDate(draftRange?.start)}</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-xss uppercase tracking-widest text-gray-400">To:</span>
              <span className="font-medium text-white">{formatDisplayDate(draftRange?.end)}</span>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_180px] gap-1">
            <div className="space-y-0">
              <div className="grid grid-cols-2 gap-1">
                {renderMonth(viewDateStart, 'start')}
                {renderMonth(viewDateEnd, 'end')}
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                <div className="mb-2 text-xs uppercase tracking-widest text-gray-400"></div>
                {timeError && (
                  <div className="mb-2 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
                    {timeError}
                  </div>
                )}
                <div className="grid grid-cols-2 justify-between gap-1 text-[10px]">
                  <div className="space-y-0">
                    <div className="text-xss text-gray-400"></div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={timeRange.from.h}
                        onChange={(e) => onTimeChange({ ...timeRange, from: { ...timeRange.from, h: e.target.value } })}
                        className="w-11 rounded-md border border-white/10 bg-black/60 px-1 py-1 text-xss"
                      >
                        {hours.map((h) => <option key={`fh-${h}`} value={h}>{h}</option>)}
                      </select>
                      <select
                        value={timeRange.from.m}
                        onChange={(e) => onTimeChange({ ...timeRange, from: { ...timeRange.from, m: e.target.value } })}
                        className="w-11 rounded-md border border-white/10 bg-black/60 px-1 py-1 text-xss"
                      >
                        {minutes.map((m) => <option key={`fm-${m}`} value={m}>{m}</option>)}
                      </select>
                      <select
                        value={timeRange.from.ampm}
                        onChange={(e) => onTimeChange({ ...timeRange, from: { ...timeRange.from, ampm: e.target.value } })}
                        className="w-12 rounded-md border border-white/10 bg-black/60 px-1 py-1 text-xss"
                      >
                        {ampm.map((p) => <option key={`fa-${p}`} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-0">
                    <div className="text-xss text-gray-400">
                      
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={timeRange.to.h}
                        onChange={(e) => onTimeChange({ ...timeRange, to: { ...timeRange.to, h: e.target.value } })}
                        className="w-11 rounded-md border border-white/10 bg-black/60 px-1 py-1 text-xss"
                      >
                        {hours.map((h) => <option key={`th-${h}`} value={h}>{h}</option>)}
                      </select>
                      <select
                        value={timeRange.to.m}
                        onChange={(e) => onTimeChange({ ...timeRange, to: { ...timeRange.to, m: e.target.value } })}
                        className="w-11 rounded-md border border-white/10 bg-black/60 px-1 py-1 text-xss"
                      >
                        {minutes.map((m) => <option key={`tm-${m}`} value={m}>{m}</option>)}
                      </select>
                      <select
                        value={timeRange.to.ampm}
                        onChange={(e) => onTimeChange({ ...timeRange, to: { ...timeRange.to, ampm: e.target.value } })}
                        className="w-12 rounded-md border border-white/10 bg-black/60 px-1 py-1 text-xss"
                      >
                        {ampm.map((p) => <option key={`ta-${p}`} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-[10px]">
              
              <div className="flex-1 space-y-1 overflow-y-auto pr-1">
                {quickRanges.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => option.value === 'custom' ? enableCustomMode() : applyPreset(option.value)}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition',
                      durationValue === option.value
                        ? 'bg-indigo-500/20 text-indigo-100'
                        : 'bg-white/5 text-gray-200 hover:bg-white/10'
                    )}
                  >
                    <span className="capitalize">{option.label}</span>
                    {durationValue === option.value && <CheckCircle2 className="h-4 w-4 text-indigo-300" />}
                  </button>
                ))}
              </div>
              <button
                onClick={handleReset}
                className="mt-1 inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-200 transition hover:border-white/20 hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-end gap-4">
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/10 px-4 py-2 text-[10px] font-medium text-gray-200 transition hover:border-white/20 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={applyDraft}
              className=" items-end justify-end rounded-lg border border-indigo-400/50 bg-indigo-500/20 px-4 py-2 text-[10px] font-semibold text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500/30"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KeywordTree({
  brandDetails,
  visibleBrands,
  selectedGroups,
  onToggleGroup,
  selectedKeywords,
  onToggleKeyword,
  expandedGroups,
  onToggleExpand,
  className = '',
}) {
  if (!brandDetails.length) {
    return (
      <div className="mt-2 rounded-xl border border-white/5 bg-black/30 p-3 text-sm text-gray-400">
        No keyword groups configured.
      </div>
    );
  }

  const brandSet = new Set(visibleBrands.length ? visibleBrands : brandDetails.map((b) => b.brandName));
  const filteredBrands = brandDetails.filter((brand) =>
    !visibleBrands.length ? true : brandSet.has(brand.brandName)
  );

  const hasGroups = filteredBrands.some((brand) => (brand?.keywordGroups || []).length);

  return (
    <div className={clsx("max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3", className)}>
      {!hasGroups && (
        <div className="text-sm text-gray-400">No keyword groups available for the selected brands.</div>
      )}
      {filteredBrands.map((brand) => {
        const groups = brand?.keywordGroups || [];
        if (!groups.length) return null;
        return (
          <div key={brand._id || brand.brandName} className="mb-4 last:mb-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {brand.brandName || brand.aiFriendlyName || 'Untitled Brand'}
            </div>
            <div className="mt-2 space-y-2">
              {groups.map((group) => {
                const groupId = makeGroupId(brand.brandName, group);
                const expanded = expandedGroups[groupId] ?? true;
                const andKeywords = Array.isArray(group?.keywords) ? group.keywords : [];
                const orKeywords = Array.isArray(group?.includeKeywords) ? group.includeKeywords : [];
                const keywords = [...andKeywords, ...orKeywords];
                // Check if group is explicitly selected OR if all keywords in this group are selected
                const isGroupExplicitlySelected = selectedGroups.includes(groupId);
                const allKeywordsSelected = keywords.length > 0 && keywords.every((keyword) => {
                  const keywordValue = (keyword || '').toLowerCase().trim();
                  const keywordId = `${groupId}::${keywordValue}`;
                  return selectedKeywords.includes(keywordId);
                });
                const selectedGroup = isGroupExplicitlySelected || allKeywordsSelected;

                return (
                  <div key={groupId} className="rounded-xl border border-white/5 bg-white/5 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-400 bg-black text-indigo-500 focus:ring-indigo-400"
                          checked={selectedGroup}
                          onChange={() => onToggleGroup(groupId)}
                        />
                        <span className="flex-1 text-white">
                          {group.groupName || group.name || 'Keyword Group'}
                          <span className="ml-2 text-xs text-gray-400">{keywords.length} keywords</span>
                        </span >
                      </label >
                      {
                        keywords.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onToggleExpand(groupId)}
                            className="rounded-full border border-white/10 px-2 py-1 text-xs text-gray-300 transition hover:border-white/30"
                          >
                            {expanded ? 'Hide' : 'Show'}
                          </button>
                        )
                      }
                    </div >
                    {expanded && keywords.length > 0 && (
                      <div className="mt-2 space-y-1 pl-6">
                        {keywords.map((keyword) => {
                          const keywordValue = (keyword || '').toLowerCase().trim();
                          const keywordId = `${groupId}::${keywordValue}`;
                          const isKeywordSelected = selectedKeywords.includes(keywordId);
                          return (
                            <label
                              key={keywordId}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-gray-200 transition hover:bg-white/5"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-400 bg-black text-indigo-500 focus:ring-indigo-400"
                                checked={isKeywordSelected}
                                onChange={() => onToggleKeyword(keywordId)}
                              />
                              <span className="capitalize">{keyword}</span>
                            </label>
                          );
                        })}
                      </div>
                    )
                    }
                  </div >
                );
              })}
            </div >
          </div >
        );
      })}
    </div >
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
  return (
    <Suspense fallback={<div className="p-6 text-white">Loading…</div>}>
      <InboxPageContent />
    </Suspense>
  );
}

function InboxPageContent() {
  const router = useRouter();
  const { user, loadings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [dateRange, setDateRange] = useState(() => createDefaultDateRange());
  const [timeRange, setTimeRange] = useState(() => createDefaultTimeRange());
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
  const [selectedKeywordGroups, setSelectedKeywordGroups] = useState([]);
  const [selectedKeywordsFilter, setSelectedKeywordsFilter] = useState([]);
  const [expandedKeywordGroups, setExpandedKeywordGroups] = useState({});
  const [postsLimit, setPostsLimit] = useState(DEFAULT_POSTS_LIMIT);
  const [selectedSentiments, setSelectedSentiments] = useState([]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // Refs for race condition prevention and memory leak protection
  const fetchDataCallIdRef = useRef(0);
  const brandActivityCallIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const freqMessageTimerRef = useRef(null);
  const errorMessageTimerRef = useRef(null);

  const clearFreqMessageTimer = useCallback(() => {
    if (freqMessageTimerRef.current) {
      clearTimeout(freqMessageTimerRef.current);
      freqMessageTimerRef.current = null;
    }
  }, []);

  const clearErrorMessageTimer = useCallback(() => {
    if (errorMessageTimerRef.current) {
      clearTimeout(errorMessageTimerRef.current);
      errorMessageTimerRef.current = null;
    }
  }, []);

  const showFreqMessage = useCallback(
    (message) => {
      clearFreqMessageTimer();
      setFreqMessage(message || '');
      if (message) {
        freqMessageTimerRef.current = setTimeout(() => {
          setFreqMessage('');
          freqMessageTimerRef.current = null;
        }, 5000);
      }
    },
    [clearFreqMessageTimer],
  );

  const showErrorMessage = useCallback(
    (message) => {
      clearErrorMessageTimer();
      setError(message || '');
      if (message) {
        errorMessageTimerRef.current = setTimeout(() => {
          setError('');
          errorMessageTimerRef.current = null;
        }, 5000);
      }
    },
    [clearErrorMessageTimer],
  );

  // Track component mount/unmount for memory leak prevention
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Increment call IDs to invalidate any ongoing fetches
      fetchDataCallIdRef.current++;
      brandActivityCallIdRef.current++;
      clearFreqMessageTimer();
      clearErrorMessageTimer();
    };
  }, [clearErrorMessageTimer, clearFreqMessageTimer]);

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

  // Close filter menu when clicking outside
  useEffect(() => {
    if (!isFilterMenuOpen) return;
    const handleClickOutside = (e) => {
      const target = e.target;
      if (!target.closest('.filter-menu')) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterMenuOpen]);

  // Read URL parameters and apply filters
  const searchParams = useSearchParams();
  const urlParamsRef = useRef({ sentiment: null, brand: null, platform: null, keywordGroup: null, keyword: null });

  useEffect(() => {
    const sentiment = searchParams.get('sentiment');
    const brand = searchParams.get('brand');
    const platform = searchParams.get('platform');
    // URL decode the keywordGroup to handle encoded colons (::)
    const keywordGroup = searchParams.get('keywordGroup') ? decodeURIComponent(searchParams.get('keywordGroup')) : null;
    const keyword = searchParams.get('keyword');
    const durationParam = searchParams.get('duration');

    // Store URL params in ref for later use
    urlParamsRef.current = { sentiment, brand, platform, keywordGroup, keyword };

    // Set sentiment filter (support single value from URL, convert to array)
    if (sentiment && ['positive', 'neutral', 'negative'].includes(sentiment.toLowerCase())) {
      setSelectedSentiments([sentiment.toLowerCase()]);
    } else {
      setSelectedSentiments([]);
    }

    // Set duration filter - if coming from analytics (sentiment param exists), use duration from URL
    // Accept any valid number (not just presets) to allow showing all posts
    if (durationParam) {
      const durationNum = Number(durationParam);
      if (!isNaN(durationNum) && durationNum > 0) {
        setDuration(durationParam);
        setDateRange(buildRangeFromDuration(durationNum));
      }
    } else if (sentiment) {
      // If sentiment filter is set but no duration, set to large value to show all matching posts
      // User can manually change duration later if needed
      setDuration('3650');
      setDateRange(buildRangeFromDuration(3650));
    }

    // Set brand filter (will be validated when brands are loaded)
    // Note: Brand will be matched case-insensitively and set with correct case after brands load
    if (brand && brand !== 'all') {
      setSelectedBrands([brand]);
    }

    // Set platform/channel filter
    if (platform && platform !== 'all') {
      setSelectedChannels([platform.toLowerCase()]);
    }

    // Set keyword group filter (will be validated when brands are loaded)
    if (keywordGroup) {
      let groupIdToSet = null;
      // Check if it's already in compound format (brandName::groupName)
      if (keywordGroup.includes('::')) {
        groupIdToSet = keywordGroup;
        setSelectedKeywordGroups([keywordGroup]);
      } else if (brand && brand !== 'all') {
        // Construct compound ID format
        groupIdToSet = `${brand}::${keywordGroup}`;
        setSelectedKeywordGroups([groupIdToSet]);
      } else {
        // Store for later validation when brands are loaded
        setSelectedKeywordGroups([keywordGroup]);
      }
      // Expand the keyword group so it's visible when the brand button is opened
      if (groupIdToSet) {
        setExpandedKeywordGroups((prev) => ({
          ...prev,
          [groupIdToSet]: true,
        }));
      }
    }

    // Set keyword filter
    if (keyword && keyword !== 'all') {
      // If keywordGroup is provided, construct compound keyword ID: groupId::keywordValue
      if (keywordGroup) {
        const groupId = keywordGroup.includes('::')
          ? keywordGroup
          : (brand && brand !== 'all' ? `${brand}::${keywordGroup}` : keywordGroup);
        const keywordId = `${groupId}::${keyword.toLowerCase().trim()}`;
        setSelectedKeywordsFilter([keywordId]);
      }
      // If no keywordGroup, we'll need to find matching keywords when brands are loaded
    }
  }, [searchParams]);

  // Validate and apply filters after brands are loaded
  useEffect(() => {
    if (!assignedBrandDetails?.length) return;

    const { keywordGroup, brand, keyword } = urlParamsRef.current;

    // Validate brand filter
    if (brand && brand !== 'all') {
      // Use case-insensitive matching to find the brand
      const matchingBrand = assignedBrandDetails.find(b => 
        b.brandName?.toLowerCase() === brand?.toLowerCase()
      );
      
      if (!matchingBrand) {
        // Brand doesn't exist, clear brand filter
        setSelectedBrands([]);
        // Also clear keyword group and keyword filters since they depend on brand
        if (keywordGroup) {
          setSelectedKeywordGroups([]);
          if (keyword) {
            setSelectedKeywordsFilter([]);
          }
        }
        return;
      } else {
        // Brand exists, ensure it's selected with the correct case from database
        setSelectedBrands((prev) => {
          // Check if the correct brand name is already selected
          if (prev.includes(matchingBrand.brandName)) {
            return prev;
          }
          // Replace any case-variant of the brand with the correct one
          const filtered = prev.filter(b => 
            b?.toLowerCase() !== brand?.toLowerCase()
          );
          return [...filtered, matchingBrand.brandName];
        });
      }
    }

    // Handle keyword-only filtering (when keyword is provided but no keywordGroup)
    if (!keywordGroup && keyword && keyword !== 'all') {
      const keywordLower = keyword.toLowerCase().trim();
      const matchingKeywordIds = [];

      // Find all groups that contain this keyword
      assignedBrandDetails.forEach((brandDetail) => {
        // Skip if brand filter is set and this brand doesn't match
        if (brand && brand !== 'all' && brandDetail.brandName !== brand) {
          return;
        }

        brandDetail.keywordGroups?.forEach((group) => {
          const andKeywords = Array.isArray(group?.keywords) ? group.keywords : [];
          const orKeywords = Array.isArray(group?.includeKeywords) ? group.includeKeywords : [];
          const merged = [...andKeywords, ...orKeywords];
          const groupKeywords = merged.map((k) => (k || '').toString().trim().toLowerCase()).filter(Boolean);

          // Check if this group contains the keyword
          if (groupKeywords.includes(keywordLower)) {
            const groupId = makeGroupId(brandDetail.brandName, group);
            matchingKeywordIds.push(`${groupId}::${keywordLower}`);
          }
        });
      });

      if (matchingKeywordIds.length > 0) {
        setSelectedKeywordsFilter(matchingKeywordIds);
        // Extract unique group IDs from matching keyword IDs and expand them
        const groupIdsToExpand = new Set();
        matchingKeywordIds.forEach((keywordId) => {
          const { groupId } = splitKeywordCompoundId(keywordId);
          if (groupId) {
            groupIdsToExpand.add(groupId);
          }
        });
        // Expand all groups that contain the matching keyword
        if (groupIdsToExpand.size > 0) {
          setExpandedKeywordGroups((prev) => {
            const next = { ...prev };
            let changed = false;
            groupIdsToExpand.forEach((groupId) => {
              if (next[groupId] === undefined) {
                next[groupId] = true;
                changed = true;
              }
            });
            return changed ? next : prev;
          });
        }
      } else {
        // Keyword not found in any group, clear filter
        setSelectedKeywordsFilter([]);
      }
      return;
    }

    // Validate keyword group filter
    if (!keywordGroup) return;

    // Helper function to populate keywords from a group
    const populateKeywordsFromGroup = (groupId, group) => {
      const andKeywords = Array.isArray(group?.keywords) ? group.keywords : [];
      const orKeywords = Array.isArray(group?.includeKeywords) ? group.includeKeywords : [];
      const merged = [...andKeywords, ...orKeywords];
      const groupKeywords = merged.map((k) => (k || '').toLowerCase().trim()).filter(Boolean);

      // If a specific keyword is provided in URL, use only that
      if (urlParamsRef.current.keyword) {
        const keywordId = `${groupId}::${urlParamsRef.current.keyword.toLowerCase().trim()}`;
        setSelectedKeywordsFilter([keywordId]);
      } else {
        // Otherwise, populate all keywords from the group
        const keywordIds = groupKeywords.map((keyword) => `${groupId}::${keyword}`);
        setSelectedKeywordsFilter(keywordIds);
      }
      
      // Expand the keyword group so it's visible when the brand button is opened
      setExpandedKeywordGroups((prev) => ({
        ...prev,
        [groupId]: true,
      }));
    };

    // If keyword group is already in compound format, validate it exists
    if (keywordGroup.includes('::')) {
      const [brandName, groupName] = keywordGroup.split('::');
      const brandDetail = assignedBrandDetails.find(b => 
        b.brandName?.toLowerCase() === brandName?.toLowerCase()
      );
      if (brandDetail) {
        // Case-insensitive group name matching
        const group = brandDetail.keywordGroups?.find(
          g => {
            const gName = (g.groupName || g.name || '').toLowerCase();
            return gName === groupName?.toLowerCase();
          }
        );
        if (group) {
          // Use the actual group name from the data to ensure consistency
          const actualGroupId = makeGroupId(brandDetail.brandName, group);
          // Group exists, replace any old ID (including case variants) with the actual one
          setSelectedKeywordGroups((prev) => {
            // Remove any ID that matches the keywordGroup (case-insensitive) or the actualGroupId
            const filtered = prev.filter(id => {
              const idLower = (id || '').toLowerCase();
              const keywordGroupLower = (keywordGroup || '').toLowerCase();
              const actualGroupIdLower = (actualGroupId || '').toLowerCase();
              return idLower !== keywordGroupLower && idLower !== actualGroupIdLower;
            });
            // Add the actual group ID if not already present
            if (!filtered.includes(actualGroupId)) {
              return [...filtered, actualGroupId];
            }
            return filtered;
          });
          populateKeywordsFromGroup(actualGroupId, group);
        } else {
          // Group doesn't exist, clear the filter
          setSelectedKeywordGroups([]);
          setSelectedKeywordsFilter([]);
        }
      }
    } else if (brand && brand !== 'all') {
      // Validate the group exists for the specified brand
      const brandDetail = assignedBrandDetails.find(b => 
        b.brandName?.toLowerCase() === brand?.toLowerCase()
      );
      if (brandDetail) {
        // Case-insensitive group name matching
        const group = brandDetail.keywordGroups?.find(
          g => {
            const gName = (g.groupName || g.name || '').toLowerCase();
            return gName === keywordGroup?.toLowerCase();
          }
        );
        if (group) {
          // Update to compound format using actual brand name and group name
          const groupId = makeGroupId(brandDetail.brandName, group);
          setSelectedKeywordGroups([groupId]);
          // Populate keywords from the group and expand it
          populateKeywordsFromGroup(groupId, group);
        } else {
          // Group doesn't exist, clear the filter
          setSelectedKeywordGroups([]);
          setSelectedKeywordsFilter([]);
        }
      }
    } else {
      // No brand specified, try to find matching groups across all brands (case-insensitive)
      let foundGroupId = null;
      let foundGroup = null;
      const keywordGroupLower = (keywordGroup || '').toLowerCase();
      for (const brandDetail of assignedBrandDetails) {
        const group = brandDetail.keywordGroups?.find(
          g => {
            const gName = (g.groupName || g.name || '').toLowerCase();
            return gName === keywordGroupLower;
          }
        );
        if (group) {
          foundGroupId = makeGroupId(brandDetail.brandName, group);
          foundGroup = group;
          break;
        }
      }
      if (foundGroupId && foundGroup) {
        // Replace any old ID with the found one
        setSelectedKeywordGroups((prev) => {
          const filtered = prev.filter(id => {
            const idLower = (id || '').toLowerCase();
            const keywordGroupLower = (keywordGroup || '').toLowerCase();
            const foundGroupIdLower = (foundGroupId || '').toLowerCase();
            return idLower !== keywordGroupLower && idLower !== foundGroupIdLower;
          });
          if (!filtered.includes(foundGroupId)) {
            return [...filtered, foundGroupId];
          }
          return filtered;
        });
        // Populate keywords from the group and expand it
        populateKeywordsFromGroup(foundGroupId, foundGroup);
      } else {
        // Group not found, clear the filter
        setSelectedKeywordGroups([]);
        setSelectedKeywordsFilter([]);
      }
    }
  }, [assignedBrandDetails]);

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
        showErrorMessage('');

        // Determine role with robust fallback
        let role = user?.role;
        try {
          const raw = localStorage.getItem('user');
          if (!role && raw) role = (JSON.parse(raw)?.role);
        } catch { }

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
        // Preserve previously selected brands when refreshing,
        // but drop any that no longer exist in the latest brand list.
        setSelectedBrands((prevSelected) => {
          if (!prevSelected || prevSelected.length === 0) return [];
          if (!brandNames || brandNames.length === 0) return prevSelected;

          // Build a lowercase lookup to keep URL-provided brands (case-insensitive)
          const brandLowerMap = new Map(
            brandNames.map((n) => [String(n).toLowerCase(), n]),
          );

          const normalized = prevSelected
            .map((name) => brandLowerMap.get(String(name).toLowerCase()))
            .filter(Boolean);

          return normalized;
        });

        // Load mentions/posts
        let postData = [];
        if (brandNames.length > 0) {
          if (!usedAdminAll && role !== 'admin') {
            try {
              const postRes = await api.data.userPosts({ email: user.email, sort: 'desc', limit: postsLimit });

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
                  const res = await api.dashboard.getPosts({ brandName, sort: 'desc', limit: postsLimit });
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
        showErrorMessage(err.message || 'Failed to load inbox data.');
      } finally {
        // Only update loading if still current
        if (currentCallId === fetchDataCallIdRef.current && isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [loadings, router, user?.email, reloadKey, postsLimit, dateRange?.start, dateRange?.end]);

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
              const res = await api.dashboard.getPosts({ brandName, sort: 'desc', limit: postsLimit });
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
  }, [activeTab, brands, posts.length, postsLimit]);

  useEffect(() => {
    const searchActive = Boolean(searchTerm.trim());
    const dateRangeChanged = !isDefaultDateRange(dateRange);
    const timeRangeChanged = !isDefaultTimeRange(timeRange);
    const desired = rangeAwareLimit(dateRange);
    const targetLimit = (searchActive || dateRangeChanged || timeRangeChanged)
      ? Math.max(desired, EXTENDED_POSTS_LIMIT)
      : desired;

    setPostsLimit((prev) => (prev === targetLimit ? prev : targetLimit));
  }, [searchTerm, dateRange, timeRange]);


  const visibleBrandDetails = useMemo(() => {
    if (!assignedBrandDetails?.length) return [];
    if (!selectedBrands.length) return assignedBrandDetails;
    const brandSet = new Set(selectedBrands);
    return assignedBrandDetails.filter((brand) => brandSet.has(brand.brandName));
  }, [assignedBrandDetails, selectedBrands]);

  const visibleGroupIds = useMemo(() => {
    const groupSet = new Set();
    visibleBrandDetails.forEach((brand) => {
      brand?.keywordGroups?.forEach((group) => {
        groupSet.add(makeGroupId(brand.brandName, group));
      });
    });
    return groupSet;
  }, [visibleBrandDetails]);

  const visibleKeywordValues = useMemo(() => {
    const keywordSet = new Set();
    visibleBrandDetails.forEach((brand) => {
      brand?.keywordGroups?.forEach((group) => {
        const andKeywords = Array.isArray(group?.keywords) ? group.keywords : [];
        const orKeywords = Array.isArray(group?.includeKeywords) ? group.includeKeywords : [];
        [...andKeywords, ...orKeywords].forEach((keyword) => {
          if (keyword) keywordSet.add(keyword.toLowerCase());
        });
      });
    });
    return keywordSet;
  }, [visibleBrandDetails]);

  useEffect(() => {
    setSelectedKeywordGroups((prev) => prev.filter((id) => visibleGroupIds.has(id)));
  }, [visibleGroupIds]);

  useEffect(() => {
    setSelectedKeywordsFilter((prev) => {
      return prev.filter((compoundId) => {
        const { keywordValue } = splitKeywordCompoundId(compoundId);
        if (!keywordValue) return false;
        return visibleKeywordValues.has(keywordValue);
      });
    });
  }, [visibleKeywordValues]);

  useEffect(() => {
    setExpandedKeywordGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      // Expand visible groups
      visibleGroupIds.forEach((id) => {
        if (next[id] === undefined) {
          next[id] = true;
          changed = true;
        }
      });
      // Also expand any selected keyword groups (from URL params or user selection)
      // This ensures groups from URL params are expanded even if they're not in visibleGroupIds yet
      selectedKeywordGroups.forEach((groupId) => {
        if (groupId && next[groupId] === undefined) {
          next[groupId] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [visibleGroupIds, selectedKeywordGroups]);
  // Handler for toggling keyword groups
  const handleToggleKeywordGroup = useCallback((groupId) => {
    // Find the group and its keywords (AND + OR) from brandDetails
    let groupKeywords = [];
    assignedBrandDetails.forEach((brand) => {
      brand?.keywordGroups?.forEach((group) => {
        const currentGroupId = makeGroupId(brand.brandName, group);
        if (currentGroupId === groupId) {
          const andKeywords = Array.isArray(group?.keywords) ? group.keywords : [];
          const orKeywords = Array.isArray(group?.includeKeywords) ? group.includeKeywords : [];
          const merged = [...andKeywords, ...orKeywords];
          groupKeywords = merged.map((k) => (k || '').toLowerCase().trim()).filter(Boolean);
        }
      });
    });

    setSelectedKeywordsFilter((prev) => {
      // Check if all keywords in this group are currently selected
      const allKeywordsInGroup = groupKeywords.map((kw) => `${groupId}::${kw}`);
      const allSelected = allKeywordsInGroup.length > 0 &&
        allKeywordsInGroup.every((id) => prev.includes(id));

      if (allSelected) {
        // Deselect all keywords in this group
        const newKeywords = prev.filter((kw) => !kw.startsWith(`${groupId}::`));
        // Update group state - React will batch these
        setSelectedKeywordGroups((groupPrev) => groupPrev.filter((id) => id !== groupId));
        return newKeywords;
      } else {
        // Select all keywords in this group
        // groupKeywords are already lowercased and trimmed, so use them directly
        const newKeywords = groupKeywords.map((keyword) =>
          `${groupId}::${keyword}`
        );

        // Remove any existing keywords from this group, then add all new ones
        const updatedKeywords = [
          ...prev.filter((kw) => !kw.startsWith(`${groupId}::`)),
          ...newKeywords
        ];

        // Update group state - React will batch these
        setSelectedKeywordGroups((groupPrev) => {
          if (!groupPrev.includes(groupId)) {
            return [...groupPrev, groupId];
          }
          return groupPrev;
        });

        return updatedKeywords;
      }
    });
  }, [assignedBrandDetails]);

  // Handler for toggling individual keywords
  const handleToggleKeyword = useCallback((keywordId) => {
    if (!keywordId || typeof keywordId !== 'string') return;

    const { groupId, keywordValue } = splitKeywordCompoundId(keywordId);
    if (!groupId || !keywordValue) return;

    // Use functional update to ensure we have the latest state
    setSelectedKeywordsFilter((prev) => {
      // Check if keyword is currently selected (exact match)
      const isSelected = prev.some((kw) => {
        // Exact match first
        if (kw === keywordId) return true;
        // Also check if format matches (handle any edge cases)
        const { groupId: kwGroupId, keywordValue: kwValue } = splitKeywordCompoundId(kw);
        if (kwGroupId && kwValue) {
          return kwGroupId === groupId && kwValue === keywordValue;
        }
        return false;
      });

      if (isSelected) {
        // Remove the keyword - filter out exact match and any format variations
        const newKeywords = prev.filter((kw) => {
          if (kw === keywordId) return false; // Exact match
          const { groupId: kwGroupId, keywordValue: kwValue } = splitKeywordCompoundId(kw);
          if (kwGroupId && kwValue) {
            // Don't remove if it's a different keyword (even if same group)
            return !(kwGroupId === groupId && kwValue === keywordValue);
          }
          return true; // Keep invalid formats
        });

        // Check if any keywords remain in this group
        const remainingInGroup = newKeywords.filter((kw) => kw.startsWith(`${groupId}::`));

        // Update group state - remove group if no keywords remain
        if (remainingInGroup.length === 0) {
          setSelectedKeywordGroups((groupPrev) => groupPrev.filter((id) => id !== groupId));
        }

        return newKeywords;
      } else {
        // Add the keyword - check if it already exists to avoid duplicates
        if (prev.includes(keywordId)) {
          return prev; // Already exists
        }

        // Ensure parent group is selected
        setSelectedKeywordGroups((groupPrev) => {
          if (!groupPrev.includes(groupId)) {
            return [...groupPrev, groupId];
          }
          return groupPrev;
        });

        return [...prev, keywordId];
      }
    });
  }, []);

  const handleToggleGroupExpand = useCallback((groupId) => {
    setExpandedKeywordGroups((prev) => ({
      ...prev,
      [groupId]: !(prev[groupId] ?? true),
    }));
  }, []);

  const filteredPosts = useMemo(() => {
    if (!posts?.length) return [];

    // Apply time-of-day window
    const to24 = (h12, ampm) => {
      let h = Number(h12) % 12;
      if (ampm === 'PM') h += 12;
      return h;
    };
    const startHour = to24(timeRange.from.h, timeRange.from.ampm);
    const startMinute = Number(timeRange.from.m);
    const endHour = to24(timeRange.to.h, timeRange.to.ampm);
    const endMinute = Number(timeRange.to.m);

    const startDate = parseDateOnly(dateRange?.start);
    const endDate = parseDateOnly(dateRange?.end);

    let lower = startDate ? new Date(startDate) : null;
    let upper = endDate ? new Date(endDate) : null;

    if (lower && upper && lower > upper) {
      const temp = lower;
      lower = upper;
      upper = temp;
    }

    if (lower) {
      lower.setHours(startHour, startMinute, 0, 0);
    }
    if (upper) {
      upper.setHours(endHour, endMinute, 59, 999);
    }

    return posts.filter((post) => {
      const brandName = post?.brand?.brandName;
      const matchesBrand = selectedBrands.length === 0 || (brandName && selectedBrands.includes(brandName));
      const createdAt = post?.createdAt ? new Date(post.createdAt) : post?.fetchedAt ? new Date(post.fetchedAt) : null;
      const matchesDate = createdAt
        ? (!lower || createdAt >= lower) && (!upper || createdAt <= upper)
        : true;
      const text = `${post?.content?.text || ''} ${post?.content?.description || ''}`.toLowerCase();
      const authorValue = (post?.author?.name || post?.author?.id || '').toLowerCase();
      const keywordValue = getPostKeyword(post);
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch = normalizedSearch
        ? text.includes(normalizedSearch) ||
        authorValue.includes(normalizedSearch) ||
        (brandName || '').toLowerCase().includes(normalizedSearch) ||
        (keywordValue || '').includes(normalizedSearch)
        : true;
      const platformValue = String(post?.platform || '').toLowerCase();
      const matchesChannel = !selectedChannels.length || selectedChannels.includes(platformValue);
      const matchesKeyword =
        selectedKeywordsFilter.length === 0
          ? true
          : (keywordValue && selectedKeywordsFilter.some((compoundId) => {
            const { keywordValue: compoundKeyword } = splitKeywordCompoundId(compoundId);
            return compoundKeyword === keywordValue;
          }));

      if (!matchesBrand || !matchesDate || !matchesSearch || !matchesChannel || !matchesKeyword) return false;

      // Apply sentiment filter if set
      if (selectedSentiments.length > 0) {
        const postSentiment = (post?.analysis?.sentiment || post?.sentiment || '').toLowerCase();
        if (!selectedSentiments.includes(postSentiment)) return false;
      }

      if (activeTab === 'actionable') return (post?.analysis?.sentiment || '').toLowerCase() === 'negative';
      if (activeTab === 'non-actionable') return (post?.analysis?.sentiment || '').toLowerCase() !== 'negative';
      return true;
    });
  }, [posts, selectedBrands, dateRange, searchTerm, activeTab, selectedChannels, timeRange, selectedKeywordsFilter, selectedSentiments]);

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

  const rangeSummaryLabel = useMemo(() => {
    const startLabel = formatDisplayDate(dateRange?.start);
    const endLabel = formatDisplayDate(dateRange?.end);
    if (!dateRange?.start || !dateRange?.end || startLabel === 'Select dates' || endLabel === 'Select dates') {
      return 'for the selected date range';
    }
    if (dateRange.start === dateRange.end) {
      return `on ${startLabel}`;
    }
    return `from ${startLabel} to ${endLabel}`;
  }, [dateRange]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020202] text-white">
      <DottedBackground />
      <FilterDrawer open={isFilterDrawerOpen} onClose={() => setIsFilterDrawerOpen(false)} />
      <div className="relative z-1 mx-auto max-w-7xl px-10 py-10">
        <header className="">
          
          <div className="flex flex-wrap items-center gap-3">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isClickable = key === 'all';
              return (
                <button
                  key={key}
                  onClick={() => isClickable && setActiveTab(key)}
                  disabled={!isClickable}
                  className={clsx(
                    'group flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition cursor-pointer',
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

        <section className="relative z-1 mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/50 backdrop-blur-sm xl:flex-row xl:flex-wrap xl:items-start xl:justify-between">
          <div className="relative z-30 flex min-w-0 flex-1 flex-wrap items-center gap-4">
            <div className="flex flex-col gap-3">
              <MultiSelect
                options={brands}
                value={selectedBrands}
                onChange={setSelectedBrands}
                label="Brands"
                brandDetails={assignedBrandDetails}
                selectedKeywordGroups={selectedKeywordGroups}
                onToggleKeywordGroup={handleToggleKeywordGroup}
                selectedKeywords={selectedKeywordsFilter}
                onToggleKeyword={handleToggleKeyword}
                expandedGroups={expandedKeywordGroups}
                onToggleExpand={handleToggleGroupExpand}
              />
            </div>
            <DateRangePicker
              range={dateRange}
              onChange={setDateRange}
              durationValue={duration}
              onDurationChange={setDuration}
              timeRange={timeRange}
              onTimeChange={setTimeRange}
            />
            <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search mentions, authors or keywords"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500 sm:w-64 lg:w-72"
              />
            </label>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-3 justify-start xl:flex-none xl:justify-end">
            <button
              onClick={async () => {
                // Guard: prevent multiple simultaneous refreshes
                if (manualRefreshLoading) return;

                try {
                  setManualRefreshLoading(true);
                  showFreqMessage('Refreshing data…');
                  showErrorMessage('');

                  const targets = selectedBrands.length ? selectedBrands : brands;

                  if (targets.length === 0) {
                    // No brands selected, fetch all user data
                    await api.data.getData({
                      email: user?.email,
                    });
                  } else {
                    // Fetch data for each brand using allSettled
                    const results = await Promise.allSettled(
                      targets.map((brandName) =>
                        api.data.getData({
                          email: user?.email,
                          brandName,
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
                  showFreqMessage('Latest monitoring data fetched.');
                } catch (err) {
                  showFreqMessage(err?.message || 'Refresh failed');
                  showErrorMessage(err?.message || 'Refresh failed');
                } finally {
                  setManualRefreshLoading(false);
                }
              }}
              disabled={manualRefreshLoading}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCcw className={`h-4 w-4 ${manualRefreshLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="relative channel-menu">
              <button
                onClick={() => setIsChannelMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10 cursor-pointer"
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
                      className="text-indigo-200 hover:text-indigo-100 cursor-pointer"
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
            <div className="relative filter-menu">
              <button
                onClick={() => setIsFilterMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10 cursor-pointer"
              >
                <Filter className="h-4 w-4" />
                Filter
                {selectedSentiments.length > 0 && (
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-100">
                    {selectedSentiments.length}
                  </span>
                )}
              </button>
              {isFilterMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#080808] p-2 shadow-xl shadow-black/40">
                  <div className="flex items-center justify-between px-2 pb-2 text-xs uppercase tracking-widest text-gray-400">
                    <span>Sentiment Filter</span>
                    <button
                      onClick={() => {
                        setSelectedSentiments([]);
                        setIsFilterMenuOpen(false);
                      }}
                      className="text-indigo-200 hover:text-indigo-100 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {[
                      { value: 'positive', label: 'Positive' },
                      { value: 'neutral', label: 'Neutral' },
                      { value: 'negative', label: 'Negative' },
                    ].map(({ value, label }) => {
                      const active = selectedSentiments.includes(value);
                      return (
                        <li key={value}>
                          <button
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${active ? 'bg-indigo-500/20 text-indigo-100' : 'hover:bg-white/5 text-gray-200'}`}
                            onClick={() => {
                              setSelectedSentiments((prev) =>
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
                Try adjusting your filters or widening the date/time range to see more conversations.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedBrands([]);
                setDuration('7');
                setDateRange(buildRangeFromDuration(7));
                setTimeRange(createDefaultTimeRange());
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
                {rangeSummaryLabel}
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
