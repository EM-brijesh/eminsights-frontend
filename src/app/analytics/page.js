'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  RefreshCw,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Smile,
  Frown,
  Meh,
  Clock,
  ExternalLink,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import DottedBackground from '@/components/DottedBackground';
import PlatformBadge from '@/components/PlatformBadge';
import {
  PieChart, Pie, Cell,
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
// Chart colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#f59e0b',
  negative: '#ef4444'
};
// Tooltip styling constant (Phase 1.1)
const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  padding: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
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
          <span className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500">
            • {platform}
          </span>
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
export default function AnalyticsPage() {
  const router = useRouter();
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
  const storageKeyForBrand = (brand) => `keywordGroups:${brand}`;

  // Handle sentiment card click - navigate to inbox with filters
  const handleSentimentClick = useCallback((sentiment) => {
    const params = new URLSearchParams();
    
    // Add sentiment filter
    params.set('sentiment', sentiment);
    
    // Set duration to a very large value (3650 days = ~10 years) to show all matching posts from all time
    // User can manually change duration later if needed
    params.set('duration', '3650');
    
    // Add brand filter if not 'all'
    if (selectedBrand && selectedBrand !== 'all') {
      params.set('brand', selectedBrand);
    }
    
    // Add platform filter if not 'all'
    if (selectedPlatform && selectedPlatform !== 'all') {
      params.set('platform', selectedPlatform);
    }
    
    // Add keyword group filter if not 'all'
    if (selectedGroup && selectedGroup !== 'all') {
      // Construct compound ID format for inbox compatibility
      if (selectedBrand && selectedBrand !== 'all') {
        params.set('keywordGroup', `${selectedBrand}::${selectedGroup}`);
      } else {
        // If 'all brands', just pass the group name
        params.set('keywordGroup', selectedGroup);
      }
    }
    
    // Add keyword filter if not 'all'
    if (selectedKeyword && selectedKeyword !== 'all') {
      params.set('keyword', selectedKeyword);
    }
    
    // Navigate to inbox with query parameters
    router.push(`/inbox?${params.toString()}`);
  }, [router, selectedBrand, selectedPlatform, selectedGroup, selectedKeyword]);
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
        const hasScore = typeof post.sentimentScore === 'number';
        return !post.sentiment || post.sentiment === 'pending' || !hasScore;
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
  const fetchSentimentSummary = useCallback(async ({ brandName, platform, keyword }) => {
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
  useEffect(() => {
    if (!selectedBrand || selectedBrand === 'all') {
      setSummaryData(null);
      setSummaryError(null);
      setLoadingSummary(false);
      return;
    }
    const effectiveKeyword = selectedGroup === 'all' ? selectedKeyword : 'all';
    fetchSentimentSummary({
      brandName: selectedBrand,
      platform: selectedPlatform,
      keyword: effectiveKeyword,
    });
  }, [selectedBrand, selectedPlatform, selectedKeyword, selectedGroup, fetchSentimentSummary]);
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
      const group = keywordGroups.find(
        (g) => (g.groupName || g.name) === selectedGroup,
      );
      return collectKeywordsFromGroup(group);
    }

    const set = new Set(brandKeywords || []);
    keywordGroups.forEach((g) => {
      collectKeywordsFromGroup(g).forEach((k) => set.add(k));
    });
    return Array.from(set);
  }, [selectedGroup, keywordGroups, brandKeywords]);
  const filteredPosts = React.useMemo(() => {
    let filtered = [...analyzedPosts];
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(p => p.platform === selectedPlatform);
    }
    if (selectedGroup !== 'all') {
      const group = keywordGroups.find(
        (g) => (g.groupName || g.name) === selectedGroup,
      );
      if (group?.keywords?.length > 0) {
        filtered = filtered.filter(post => {
          const postKeyword = post.keyword?.toLowerCase().trim();
          return group.keywords.some(k =>
            postKeyword === k.toLowerCase().trim() || postKeyword?.includes(k.toLowerCase().trim())
          );
        });
      }
    }
    if (selectedKeyword !== 'all') {
      filtered = filtered.filter(p =>
        p.keyword?.toLowerCase() === selectedKeyword.toLowerCase()
      );
    }
    return filtered;
  }, [analyzedPosts, selectedPlatform, selectedKeyword, selectedGroup, keywordGroups]);
  const clientStats = useMemo(() => {
    return {
      total: filteredPosts.length,
      byPlatform: filteredPosts.reduce((acc, post) => {
        acc[post.platform] = (acc[post.platform] || 0) + 1;
        return acc;
      }, {}),
      byKeyword: filteredPosts.reduce((acc, post) => {
        acc[post.keyword] = (acc[post.keyword] || 0) + 1;
        return acc;
      }, {}),
      bySentiment: filteredPosts.reduce((acc, post) => {
        const sentimentKey = post.sentiment || 'pending';
        acc[sentimentKey] = (acc[sentimentKey] || 0) + 1;
        return acc;
      }, { positive: 0, neutral: 0, negative: 0, pending: 0 })
    };
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
  const platformChartData = useMemo(() => Object.entries(stats.byPlatform).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    percentage: ((value / stats.total) * 100).toFixed(1)
  })), [stats.byPlatform, stats.total]);
  const sentimentChartData = useMemo(() => Object.entries(stats.bySentiment)
    .filter(([name]) => name !== 'pending') // Exclude pending from pie chart
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      percentage: ((value / stats.total) * 100).toFixed(1)
    })), [stats.bySentiment, stats.total]);
  const keywordChartData = useMemo(() => Object.entries(stats.byKeyword)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, posts: value })), [stats.byKeyword]);
  const clientTimelineData = useMemo(() => filteredPosts.reduce((acc, post) => {
    if (post.createdAt) {
      const date = new Date(post.createdAt).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, positive: 0, neutral: 0, negative: 0, total: 0 };
      }
      acc[date][post.sentiment || 'neutral'] += 1;
      acc[date].total += 1;
    }
    return acc;
  }, {}), [filteredPosts]);
  const combinedTimeline = useMemo(() => {
    // Prefer backend summary timeline when available, otherwise fall back to client aggregation
    const rawTimeline = (summaryUsable && Array.isArray(summaryData?.timeline) && summaryData.timeline.length > 0)
      ? summaryData.timeline
      : Object.values(clientTimelineData);

    // Filter out invalid dates and restrict to the last 14 calendar days (including today)
    const now = new Date();
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 13); // inclusive 14‑day window

    return rawTimeline.filter((item) => {
      if (!item || !item.date) return false;
      const d = new Date(item.date);
      if (Number.isNaN(d.getTime())) return false;
      return d >= fourteenDaysAgo && d <= now;
    });
  }, [summaryUsable, summaryData, clientTimelineData]);
  const timelineChartData = useMemo(() => {
    const sorted = [...combinedTimeline]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-14);
    const withMovingAverages = sorted.map((item, index) => {
      const window7 = sorted.slice(Math.max(0, index - 6), index + 1);
      const window14 = sorted.slice(Math.max(0, index - 13), index + 1);
      const avg7 = window7.length > 0
        ? window7.reduce((sum, d) => sum + (d.positive / d.total || 0), 0) / window7.length
        : 0;
      const avg14 = window14.length > 0
        ? window14.reduce((sum, d) => sum + (d.positive / d.total || 0), 0) / window14.length
        : 0;
      return {
        ...item,
        ma7: avg7,
        ma14: avg14
      };
    });
    return withMovingAverages;
  }, [combinedTimeline]);
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
      const platform = post.platform || 'unknown';
      if (!platformSentiment[platform]) {
        platformSentiment[platform] = { positive: 0, neutral: 0, negative: 0 };
      }
      platformSentiment[platform][post.sentiment || 'neutral'] += 1;
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
      const keyword = post.keyword || 'unknown';
      if (!keywordSentiment[keyword]) {
        keywordSentiment[keyword] = { positive: 0, neutral: 0, negative: 0 };
      }
      keywordSentiment[keyword][post.sentiment || 'neutral'] += 1;
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
    <div className="min-h-screen bg-black text-white p-6 relative">
      <DottedBackground />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-gray-400">Brand performance with sentiment analysis</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={loadingPosts || analyzingSentiment}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingPosts || analyzingSentiment ? 'animate-spin' : ''}`} />
            {analyzingSentiment ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
        {sentimentWarning && (
          <div className="mb-6 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
            {sentimentWarning}
          </div>
        )}
        {/* Filters */}
        <Card className="bg-black border-white/10 mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setSelectedGroup('all');
                    setSelectedKeyword('all');
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
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
                >
                  <option value="all">All Platforms</option>
                  <option value="twitter">Twitter</option>
                  <option value="youtube">YouTube</option>
                  <option value="reddit">Reddit</option>
                  <option value="google">Google</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Keyword Group</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    setSelectedKeyword('all');
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
                    return (
                      <option key={idx} value={label}>
                        {label} ({totalCount})
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
                    setSelectedKeyword(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
                >
                  <option value="all">All Keywords</option>
                  {availableKeywords.map((keyword, idx) => (
                    <option key={idx} value={keyword}>{keyword}</option>
                  ))}
                </select>
              </div>
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
              <p className="text-4xl font-bold">{stats.bySentiment.positive}</p>
              <p className="text-sm text-gray-400 mt-1">
                {stats.total > 0 ? ((stats.bySentiment.positive / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>
          <Card 
            className="bg-gradient-to-br from-yellow-500/20 to-yellow-400/10 border-yellow-500/60 cursor-pointer transition-all hover:scale-105 hover:border-yellow-400/80 hover:shadow-lg hover:shadow-yellow-500/20"
            onClick={() => handleSentimentClick('neutral')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Meh className="w-5 h-5 text-yellow-300" />
                Neutral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.bySentiment.neutral}</p>
              <p className="text-sm text-gray-400 mt-1">
                {stats.total > 0 ? ((stats.bySentiment.neutral / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>
          <Card 
            className="bg-gradient-to-br from-red-500/20 to-red-400/10 border-red-500/60 cursor-pointer transition-all hover:scale-105 hover:border-red-400/80 hover:shadow-lg hover:shadow-red-500/20"
            onClick={() => handleSentimentClick('negative')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Frown className="w-5 h-5 text-red-300" />
                Negative
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.bySentiment.negative}</p>
              <p className="text-sm text-gray-400 mt-1">
                {stats.total > 0 ? ((stats.bySentiment.negative / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sentiment Distribution - Phase 1.3: Added center text */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Sentiment Distribution</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
          {/* Platform Distribution */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Platform Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {platformChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={platformChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      stroke="#cd1766ff"
                      tick={{ fill: '#9ca3af' }}
                      axisLine={{ stroke: '#4b5563' }}
                    />
                    <YAxis
                      stroke="#cd1496ff"
                      tick={{ fill: '#9ca3af' }}
                      axisLine={{ stroke: '#4b5563' }}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                      formatter={(value, name) => [value, 'Posts']}
                      labelFormatter={(label) => `Platform: ${label}`}
                    />
                    <Bar
                      dataKey="value"
                      fill="url(#gradientBar)"
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                      animationBegin={0}
                      activeBar={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  message="No platform data available"
                  helpText="Posts from different platforms will appear here once data is loaded."
                />
              )}
            </CardContent>
          </Card>
        </div>
        {/* Sentiment Timeline - Phase 1.2: Improved X-axis readability */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle>Sentiment Timeline (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timelineChartData}>
                  <defs>
                    <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  {/* Phase 1.2: Improved angle and font size */}
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    angle={-30}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="positive"
                    stackId="1"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPositive)"
                    animationDuration={800}
                  />
                  <Area
                    type="monotone"
                    dataKey="neutral"
                    stackId="1"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorNeutral)"
                    animationDuration={800}
                  />
                  <Area
                    type="monotone"
                    dataKey="negative"
                    stackId="1"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorNegative)"
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="ma7"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="7-Day MA"
                    legendType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="ma14"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                    name="14-Day MA"
                    legendType="line"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                message="No timeline data available"
                helpText="Sentiment trends over time will appear here as data accumulates."
              />
            )}
          </CardContent>
        </Card>
        {/* Sentiment by Platform */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle>Sentiment Distribution by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {sentimentByPlatformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sentimentByPlatformData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="platform" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
                  <Tooltip
                    content={<SentimentByPlatformTooltip />}
                    cursor={{ fill: 'rgba(15, 23, 42, 0.6)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="positive" stackId="a" fill="url(#gradientPos)" radius={[0, 0, 0, 0]} activeBar={false} />
                  <Bar dataKey="neutral" stackId="a" fill="url(#gradientNeu)" radius={[0, 0, 0, 0]} activeBar={false} />
                  <Bar dataKey="negative" stackId="a" fill="url(#gradientNeg)" radius={[8, 8, 0, 0]} activeBar={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                message="No platform sentiment data"
                helpText="Sentiment breakdown by platform will be displayed here."
              />
            )}
          </CardContent>
        </Card>
        {/* Keyword Sentiment Heatmap */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle>Keyword Sentiment Heatmap (Top 10 Keywords)</CardTitle>
          </CardHeader>
          <CardContent>
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
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center">
                              <div
                                className="h-6 rounded px-2 text-xs font-semibold flex items-center justify-center text-white"
                                style={{
                                  backgroundColor: `rgba(16, 185, 129, ${0.3 + (item.positive / maxValue) * 0.7})`,
                                  minWidth: '60px'
                                }}
                              >
                                {item.positive}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center">
                              <div
                                className="h-6 rounded px-2 text-xs font-semibold flex items-center justify-center text-white"
                                style={{
                                  backgroundColor: `rgba(245, 158, 11, ${0.3 + (item.neutral / maxValue) * 0.7})`,
                                  minWidth: '60px'
                                }}
                              >
                                {item.neutral}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center">
                              <div
                                className="h-6 rounded px-2 text-xs font-semibold flex items-center justify-center text-white"
                                style={{
                                  backgroundColor: `rgba(239, 68, 68, ${0.3 + (item.negative / maxValue) * 0.7})`,
                                  minWidth: '60px'
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
          </CardContent>
        </Card>
        {/* Top Keywords */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle>Top Keywords by Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {keywordChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={keywordChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    type="number"
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                    axisLine={{ stroke: '#4b5563' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9ca3af"
                    width={120}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#4b5563' }}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value) => [value, 'Posts']}
                    labelFormatter={(label) => `Keyword: ${label}`}
                    cursor={{ fill: 'rgba(15, 23, 42, 0.6)' }}
                  />
                  <defs>
                    <linearGradient id="gradientKeyword" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <Bar
                    dataKey="posts"
                    fill="url(#gradientKeyword)"
                    radius={[0, 8, 8, 0]}
                    animationDuration={800}
                    animationBegin={0}
                    activeBar={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                message="No keyword volume data"
                helpText="Top performing keywords will be ranked here by post volume."
              />
            )}
          </CardContent>
        </Card>
        {/* Recent Posts */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Recent Posts with Sentiment</CardTitle>
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
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredPosts.slice(0, 10).map((post) => (
                  <AnalyticsMentionCard key={post._id || post.id} post={post} />
                ))}
              </div>
            ) : (
              <EmptyState
                message="No posts found"
                helpText="Try running a search from the Keywords page or adjusting your filters."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
