'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, TrendingUp, MessageSquare, BarChart3, Smile, Frown, Meh, Clock } from 'lucide-react';
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

const ANALYTICS_POST_LIMIT = 1000;
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
    // Handle request cancellation and other errors gracefully
    // Don't throw - return empty array so UI can still display posts
    if (error?.message?.includes('aborted') || error?.name === 'AbortError') {
      // Expected when a newer request supersedes the previous one; silently ignore.
    } else {
      // Only log non-cancellation errors
      console.error('Fallback sentiment analysis failed:', error);
    }
    // Return empty array instead of throwing - allows UI to continue
    return [];
  }
};

export default function AnalyticsPage() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
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

  // Filter changes are handled automatically via useMemo for filteredPosts

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
        setSelectedBrand(fetchedBrands[0].brandName);
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  const loadKeywordGroups = (brandName) => {
    if (!brandName) return;

    try {
      const raw = localStorage.getItem(storageKeyForBrand(brandName));
      const groups = raw ? JSON.parse(raw) : [];
      setKeywordGroups(groups);
    } catch (err) {
      console.error('Failed to load keyword groups:', err);
      setKeywordGroups([]);
    }
  };

  const fetchKeywords = async (brandName) => {
    if (!brandName) return;

    try {
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
      const params = { brandName, limit: ANALYTICS_POST_LIMIT, sort: 'desc' };
      const data = await api.dashboard.getPosts(params);
      const fetchedPosts = data.data || [];
      setPosts(fetchedPosts);

      const needsSentiment = fetchedPosts.filter(post => {
        const hasScore = typeof post.sentimentScore === 'number';
        return !post.sentiment || post.sentiment === 'pending' || !hasScore;
      });

      if (needsSentiment.length === 0) {
        setSentimentWarning('');
        setAnalyzedPosts(fetchedPosts);
        return;
      }

      setSentimentWarning('Analyzing sentiment for newly fetched posts…');
      setAnalyzingSentiment(true);
      try {
        const analyzedSubset = await analyzeMissingSentiment(needsSentiment);

        // If analysis returned empty (due to error/cancellation), use original posts
        if (!analyzedSubset || analyzedSubset.length === 0) {
          setAnalyzedPosts(fetchedPosts);
          setSentimentWarning('Sentiment analysis unavailable. Showing posts without sentiment data.');
          return;
        }

        const analyzedMap = new Map();
        analyzedSubset.forEach(post => {
          const id = post._id || post.id;
          if (id) analyzedMap.set(id.toString(), post);
        });

        const mergedPosts = fetchedPosts.map(post => {
          const id = post._id || post.id;
          if (!id) return post;
          const updated = analyzedMap.get(id.toString());
          if (!updated) return post;
          const existingScore = typeof post.sentimentScore === 'number' ? post.sentimentScore : null;
          return {
            ...post,
            sentiment: updated.sentiment ?? post.sentiment ?? 'pending',
            sentimentScore: typeof updated.sentimentScore === 'number'
              ? updated.sentimentScore
              : existingScore,
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
            : ''
        );
      } catch (analysisErr) {
        // This catch block should rarely be hit now since analyzeMissingSentiment doesn't throw
        // But keep it as a safety net
        if (process.env.NODE_ENV !== 'production') {
          console.error('Unexpected error in sentiment analysis:', analysisErr);
        }
        setSentimentWarning('Could not analyze some posts. Showing available data.');
        setAnalyzedPosts(fetchedPosts);
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
    if (!selectedBrand) return;
    const effectiveKeyword = selectedGroup === 'all' ? selectedKeyword : 'all';
    fetchSentimentSummary({
      brandName: selectedBrand,
      platform: selectedPlatform,
      keyword: effectiveKeyword,
    });
  }, [selectedBrand, selectedPlatform, selectedKeyword, selectedGroup, fetchSentimentSummary]);

  // Apply filters with useMemo for performance
  const filteredPosts = React.useMemo(() => {
    let filtered = [...analyzedPosts];

    // Platform filter
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(p => p.platform === selectedPlatform);
    }

    // Group filter
    if (selectedGroup !== 'all') {
      const group = keywordGroups.find(g => g.name === selectedGroup);
      if (group?.keywords?.length > 0) {
        filtered = filtered.filter(post => {
          const postKeyword = post.keyword?.toLowerCase().trim();
          return group.keywords.some(k =>
            postKeyword === k.toLowerCase().trim() || postKeyword?.includes(k.toLowerCase().trim())
          );
        });
      }
    }

    // Keyword filter
    if (selectedKeyword !== 'all' && selectedGroup === 'all') {
      filtered = filtered.filter(p =>
        p.keyword?.toLowerCase() === selectedKeyword.toLowerCase()
      );
    }

    return filtered;
  }, [analyzedPosts, selectedPlatform, selectedKeyword, selectedGroup, keywordGroups]);

  // Calculate statistics with useMemo
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

  // Chart data with useMemo
  const platformChartData = useMemo(() => Object.entries(stats.byPlatform).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    percentage: ((value / stats.total) * 100).toFixed(1)
  })), [stats.byPlatform, stats.total]);

  const sentimentChartData = useMemo(() => Object.entries(stats.bySentiment).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    percentage: ((value / stats.total) * 100).toFixed(1)
  })), [stats.bySentiment, stats.total]);

  const keywordChartData = useMemo(() => Object.entries(stats.byKeyword)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, posts: value })), [stats.byKeyword]);

  // Timeline with sentiment
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
    if (summaryUsable && Array.isArray(summaryData?.timeline) && summaryData.timeline.length > 0) {
      return summaryData.timeline;
    }
    return Object.values(clientTimelineData);
  }, [summaryUsable, summaryData, clientTimelineData]);

  const timelineChartData = useMemo(() => {
    const sorted = [...combinedTimeline]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-14);

    // Calculate moving averages
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

  // Sentiment by Platform data
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

  // Keyword Sentiment Heatmap data
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
          <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
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

              {keywordGroups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Keyword Group</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => {
                      setSelectedGroup(e.target.value);
                      if (e.target.value !== 'all') setSelectedKeyword('all');
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
                  >
                    <option value="all">All Groups</option>
                    {keywordGroups.map((group, idx) => (
                      <option key={idx} value={group.name}>
                        {group.name} ({group.keywords?.length || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Keyword</label>
                <select
                  value={selectedKeyword}
                  onChange={(e) => {
                    setSelectedKeyword(e.target.value);
                    if (e.target.value !== 'all') setSelectedGroup('all');
                  }}
                  disabled={selectedGroup !== 'all'}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md disabled:opacity-50"
                >
                  <option value="all">All Keywords</option>
                  {brandKeywords.map((keyword, idx) => (
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

          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smile className="w-5 h-5 text-green-400" />
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

          <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border-yellow-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Meh className="w-5 h-5 text-yellow-400" />
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

          <Card className="bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Frown className="w-5 h-5 text-red-400" />
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
          {/* Sentiment Distribution */}
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
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-8">No data available</p>
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
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                      axisLine={{ stroke: '#4b5563' }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                      axisLine={{ stroke: '#4b5563' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
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
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sentiment Timeline */}
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
                  <XAxis dataKey="date" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  />
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
              <p className="text-gray-400 text-center py-8">No data available</p>
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
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px' }}
                    formatter={(value) => [value, 'Posts']}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="positive" stackId="a" fill="url(#gradientPos)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="neutral" stackId="a" fill="url(#gradientNeu)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="negative" stackId="a" fill="url(#gradientNeg)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">No data available</p>
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
              <p className="text-gray-400 text-center py-8">No data available</p>
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
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    formatter={(value) => [value, 'Posts']}
                    labelFormatter={(label) => `Keyword: ${label}`}
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
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">No data available</p>
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
              <p className="text-gray-400 text-center py-8">
                {analyzingSentiment ? 'Analyzing sentiment...' : 'Loading posts...'}
              </p>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredPosts.slice(0, 10).map((post) => (
                  <div key={post._id} className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition border border-gray-700">
                    <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={post.platform} size="xs" />
                        <span className="text-xs px-2 py-1 rounded-lg bg-purple-600/20 border border-purple-600/50 text-purple-300 font-semibold">
                          {post.keyword}
                        </span>
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-700 border border-gray-600">
                          {getSentimentIcon(post.sentiment)}
                          {post.sentiment || 'pending'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-3">
                      {post.content?.text || post.text || 'No content'}
                    </p>
                    {post.createdAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                No posts found. Try running a search from the Keywords page.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}