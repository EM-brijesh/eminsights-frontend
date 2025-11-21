'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, TrendingUp, MessageSquare, BarChart3, Smile, Frown, Meh } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import DottedBackground from '@/components/DottedBackground';
import PlatformBadge from '@/components/PlatformBadge';
import {
  PieChart, Pie, Cell,
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Chart colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#f59e0b',
  negative: '#ef4444'
};

// Sentiment Analysis using Backend API with Smart Caching
const analyzeSentimentWithCaching = async (posts) => {
  if (!posts || posts.length === 0) {
    return [];
  }

  try {
    // Check which posts already have sentiment
    const status = await api.sentiment.check(posts);
    
    // Combine posts with existing sentiment and posts that need analysis
    let allAnalyzedPosts = [...status.postsWithSentiment];
    
    // Only analyze posts that don't have sentiment
    if (status.postsToAnalyze.length > 0) {
      const analysisResult = await api.sentiment.analyze(status.postsToAnalyze);
      allAnalyzedPosts = [...allAnalyzedPosts, ...analysisResult.data];
      
      // Save analyzed posts to database
      try {
        await api.sentiment.save(analysisResult.data);
      } catch (saveError) {
        console.error('Failed to save sentiment to DB:', saveError);
        // Continue even if save fails
      }
    }
    
    // Map back to original posts order
    const postMap = new Map();
    allAnalyzedPosts.forEach(post => {
      const id = post._id || post.id;
      if (id) postMap.set(id.toString(), post);
    });
    
    return posts.map(post => {
      const id = post._id || post.id;
      const analyzed = postMap.get(id?.toString());
      if (analyzed) {
        return {
          ...post,
          sentiment: analyzed.sentiment || 'neutral',
          sentimentScore: analyzed.sentimentScore || 0.5,
          sentimentAnalyzedAt: analyzed.sentimentAnalyzedAt
        };
      }
      // Post without text or analysis - return neutral
      return {
        ...post,
        sentiment: 'neutral',
        sentimentScore: 0.5
      };
    });
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    // Return neutral sentiment on error
    return posts.map(p => ({
      ...p,
      sentiment: p.sentiment || 'neutral',
      sentimentScore: p.sentimentScore || 0.5
    }));
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
    try {
      const params = { brandName, limit: 100, sort: 'desc' };
      const data = await api.dashboard.getPosts(params);
      const fetchedPosts = data.data || [];
      setPosts(fetchedPosts);

      // Perform sentiment analysis with smart caching
      setAnalyzingSentiment(true);
      const analyzed = await analyzeSentimentWithCaching(fetchedPosts);
      setAnalyzedPosts(analyzed);
      setAnalyzingSentiment(false);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
      setAnalyzedPosts([]);
      setAnalyzingSentiment(false);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleRefresh = async () => {
    if (selectedBrand) {
      await fetchPostsAndAnalyze(selectedBrand);
    }
  };

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
  const stats = useMemo(() => {
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
        acc[post.sentiment || 'neutral'] = (acc[post.sentiment || 'neutral'] || 0) + 1;
        return acc;
      }, { positive: 0, neutral: 0, negative: 0 })
    };
  }, [filteredPosts]);

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
  const timelineData = useMemo(() => filteredPosts.reduce((acc, post) => {
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

  const timelineChartData = useMemo(() => {
    const sorted = Object.values(timelineData)
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
  }, [timelineData]);

  // Sentiment by Platform data
  const sentimentByPlatformData = useMemo(() => {
    const platformSentiment = {};
    filteredPosts.forEach(post => {
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
      total: sentiments.positive + sentiments.neutral + sentiments.negative
    }));
  }, [filteredPosts]);

  // Engagement vs Sentiment data
  const engagementSentimentData = useMemo(() => {
    return filteredPosts
      .filter(post => post.sentimentScore !== undefined && post.metrics)
      .map(post => ({
        sentimentScore: post.sentimentScore || 0.5,
        engagement: (post.metrics?.likes || 0) + (post.metrics?.comments || 0) + (post.metrics?.shares || 0),
        views: post.metrics?.views || 0,
        platform: post.platform || 'unknown',
        keyword: post.keyword || 'unknown'
      }));
  }, [filteredPosts]);

  // Keyword Sentiment Heatmap data
  const keywordSentimentHeatmapData = useMemo(() => {
    const keywordSentiment = {};
    filteredPosts.forEach(post => {
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
        total: sentiments.positive + sentiments.neutral + sentiments.negative
      }));
  }, [filteredPosts]);

  // Overall sentiment score for gauge
  const overallSentimentScore = useMemo(() => {
    if (filteredPosts.length === 0) return 50;
    const totalScore = filteredPosts.reduce((sum, post) => {
      return sum + (post.sentimentScore || 0.5);
    }, 0);
    return Math.round((totalScore / filteredPosts.length) * 100);
  }, [filteredPosts]);

  // Radar chart data (sentiment by platform)
  const radarChartData = useMemo(() => {
    const platforms = ['twitter', 'youtube', 'reddit'];
    return platforms.map(platform => {
      const platformPosts = filteredPosts.filter(p => p.platform === platform);
      const total = platformPosts.length;
      if (total === 0) {
        return {
          platform: platform.charAt(0).toUpperCase() + platform.slice(1),
          positive: 0,
          neutral: 0,
          negative: 0
        };
      }
      return {
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        positive: (platformPosts.filter(p => p.sentiment === 'positive').length / total) * 100,
        neutral: (platformPosts.filter(p => p.sentiment === 'neutral').length / total) * 100,
        negative: (platformPosts.filter(p => p.sentiment === 'negative').length / total) * 100
      };
    });
  }, [filteredPosts]);

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-4 h-4 text-green-500" />;
      case 'negative': return <Frown className="w-4 h-4 text-red-500" />;
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

        {/* Engagement vs Sentiment */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle>Engagement vs Sentiment Correlation</CardTitle>
          </CardHeader>
          <CardContent>
            {engagementSentimentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    type="number" 
                    dataKey="sentimentScore" 
                    name="Sentiment Score" 
                    domain={[0, 1]}
                    stroke="#9ca3af" 
                    tick={{ fill: '#9ca3af' }}
                    axisLine={{ stroke: '#4b5563' }}
                    label={{ value: 'Sentiment Score', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="engagement" 
                    name="Engagement" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#9ca3af' }}
                    axisLine={{ stroke: '#4b5563' }}
                    label={{ value: 'Engagement (Likes + Comments + Shares)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px' }}
                    formatter={(value, name, props) => {
                      if (name === 'sentimentScore') return [value.toFixed(2), 'Sentiment Score'];
                      if (name === 'engagement') return [value, 'Engagement'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Platform: ${label}`}
                  />
                  <Scatter 
                    name="Posts" 
                    data={engagementSentimentData} 
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Overall Sentiment Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Overall Sentiment Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative w-48 h-48">
                  <svg className="transform -rotate-90" width="192" height="192">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="#374151"
                      strokeWidth="16"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke={overallSentimentScore >= 70 ? "#10b981" : overallSentimentScore >= 40 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 80}`}
                      strokeDashoffset={`${2 * Math.PI * 80 * (1 - overallSentimentScore / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'all 0.8s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-bold" style={{ color: overallSentimentScore >= 70 ? "#10b981" : overallSentimentScore >= 40 ? "#f59e0b" : "#ef4444" }}>
                        {overallSentimentScore}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">out of 100</div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-4 text-center">
                  {overallSentimentScore >= 70 ? "Positive" : overallSentimentScore >= 40 ? "Neutral" : "Negative"} Overall Sentiment
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Sentiment by Platform (Radar View)</CardTitle>
            </CardHeader>
            <CardContent>
              {radarChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="platform" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                    <Radar name="Positive" dataKey="positive" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Radar name="Neutral" dataKey="neutral" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                    <Radar name="Negative" dataKey="negative" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px' }}
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Percentage']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

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
                          {post.sentiment || 'neutral'}
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