'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, MessageSquare, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import DottedBackground from '@/components/DottedBackground';
import PlatformBadge from '@/components/PlatformBadge';
import {
  PieChart, Pie, Cell, 
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Chart colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brandKeywords, setBrandKeywords] = useState([]);
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]); // Store all fetched posts for filtering
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedKeyword, setSelectedKeyword] = useState('all');
  const [keywordGroups, setKeywordGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const storageKeyForBrand = (brand) => `keywordGroups:${brand}`;
  const [collecting, setCollecting] = useState(false);

  // Fetch brands on mount
  useEffect(() => {
    fetchBrands();
  }, []);

  // Load keyword groups and fetch keywords when brand changes
  useEffect(() => {
    if (selectedBrand && brands.length > 0) {
      loadKeywordGroups(selectedBrand);
      fetchKeywords(selectedBrand);
      (async () => {
        setCollecting(true);
        try { await api.search.runForBrand({ brandName: selectedBrand }); } catch {}
        let attempts = 3;
        while (attempts-- > 0) {
          await fetchPosts(selectedBrand);
          if ((allPosts || []).length > 0) break;
          await new Promise(r => setTimeout(r, 2000));
        }
        setCollecting(false);
      })();
    }
  }, [selectedBrand, brands]);

  // Fetch posts when filters change
  useEffect(() => {
    if (selectedBrand) {
      fetchPosts(selectedBrand);
    }
  }, [selectedPlatform, selectedKeyword, selectedGroup]);

  const fetchBrands = async () => {
    try {
      setLoading(true);

      // Determine logged-in user from storage
      let user = null;
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) user = JSON.parse(userStr);
      } catch (err) {
        console.error('Failed to parse user from storage:', err);
      }

      let data;
      if (user?.role === 'admin') {
        try {
          data = await api.brands.getAll();
        } catch (adminErr) {
          console.warn('Admin brands fetch failed, falling back to user-specific brands:', adminErr.message);
          if (user?.email) {
            data = await api.brands.getByUser(user.email);
          } else {
            throw adminErr;
          }
        }
      } else if (user?.email) {
        data = await api.brands.getByUser(user.email);
      } else {
        throw new Error('User not authenticated. Please login again.');
      }

      const fetchedBrands = data?.brands || [];
      setBrands(fetchedBrands);

      if (fetchedBrands.length > 0) {
        setSelectedBrand((prev) => {
          if (prev && fetchedBrands.some((b) => b.brandName === prev)) {
            return prev;
          }
          return fetchedBrands[0].brandName;
        });
      } else {
        setSelectedBrand('');
        setSelectedGroup('all');
        setSelectedKeyword('all');
        setKeywordGroups([]);
        setBrandKeywords([]);
        setPosts([]);
        setAllPosts([]);
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
      setBrands([]);
      setSelectedBrand('');
      setSelectedGroup('all');
      setSelectedKeyword('all');
      setKeywordGroups([]);
      setBrandKeywords([]);
      setPosts([]);
      setAllPosts([]);
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
      const raw = localStorage.getItem(storageKeyForBrand(brandName));
      if (raw) {
        const groups = JSON.parse(raw);
        setKeywordGroups(groups);
      } else {
        // If no groups found, try to get from brand data
        const brand = brands.find(b => b.brandName === brandName);
        if (brand && brand.keywords && brand.keywords.length > 0) {
          setKeywordGroups([{ name: 'Default Group', keywords: brand.keywords || [] }]);
        } else {
          setKeywordGroups([]);
        }
      }
    } catch (err) {
      console.error('Failed to load keyword groups:', err);
      setKeywordGroups([]);
    }
  };

  const fetchKeywords = async (brandName) => {
    if (!brandName) {
      setBrandKeywords([]);
      return;
    }
    try {
      const data = await api.dashboard.getKeywords(brandName);
      setBrandKeywords(data.keywords || []);
    } catch (err) {
      console.error('Failed to load keywords:', err);
      setBrandKeywords([]);
    }
  };

  const fetchPosts = async (brandName) => {
    if (!brandName) {
      setPosts([]);
      setAllPosts([]);
      return;
    }
    setLoadingPosts(true);
    console.log('📊 Fetching posts for brand:', brandName);
    try {
      const params = {
        brandName,
        limit: 100,
        sort: 'desc'
      };
      
      if (selectedPlatform && selectedPlatform !== 'all') {
        params.platform = selectedPlatform;
      }
      
      // Only add keyword filter if group is not selected (group filter is client-side)
      if (selectedKeyword && selectedKeyword !== 'all' && selectedGroup === 'all') {
        params.keyword = selectedKeyword;
      }

      console.log('📊 Request params:', params);
      const data = await api.dashboard.getPosts(params);
      console.log('📊 API Response:', data);
      console.log('📊 Posts received:', data.data?.length || 0);
      
      if (data.data && data.data.length > 0) {
        console.log('📊 Sample post:', data.data[0]);
      }
      
      const fetchedPosts = data.data || [];
      setAllPosts(fetchedPosts);
      
      // Apply filters (keyword group and keyword)
      let filteredPosts = fetchedPosts;
      
      // Apply keyword group filter
      if (selectedGroup !== 'all') {
        const selectedGroupData = keywordGroups.find(g => g.name === selectedGroup);
        if (selectedGroupData && selectedGroupData.keywords && selectedGroupData.keywords.length > 0) {
          filteredPosts = filteredPosts.filter(post => {
            if (!post.keyword) return false;
            const postKeywordLower = post.keyword.toLowerCase().trim();
            return selectedGroupData.keywords.some(keyword => {
              const keywordLower = keyword.toLowerCase().trim();
              return postKeywordLower === keywordLower || postKeywordLower.includes(keywordLower);
            });
          });
        }
      }
      
      // Apply individual keyword filter if group is not selected
      if (selectedKeyword && selectedKeyword !== 'all' && selectedGroup === 'all') {
        filteredPosts = filteredPosts.filter(post => 
          post.keyword && post.keyword.toLowerCase() === selectedKeyword.toLowerCase()
        );
      }
      
      setPosts(filteredPosts);
      } catch (err) {
      console.error('❌ Failed to load posts:', err);
      setPosts([]);
      setAllPosts([]);
      } finally {
      setLoadingPosts(false);
      }
    };

  const handleRefresh = () => {
    if (selectedBrand) {
      (async () => { setCollecting(true); try { await api.search.runForBrand({ brandName: selectedBrand }); } catch {} ; await fetchPosts(selectedBrand); setCollecting(false); })();
    }
  };

  // Calculate statistics
  const stats = {
    total: posts.length,
    byPlatform: posts.reduce((acc, post) => {
      acc[post.platform] = (acc[post.platform] || 0) + 1;
      return acc;
    }, {}),
    byKeyword: posts.reduce((acc, post) => {
      acc[post.keyword] = (acc[post.keyword] || 0) + 1;
      return acc;
    }, {})
  };

  // Prepare data for charts
  const platformChartData = Object.entries(stats.byPlatform).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    percentage: ((value / stats.total) * 100).toFixed(1)
  }));

  const keywordChartData = Object.entries(stats.byKeyword)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({
      name,
      posts: value
    }));

  // Timeline data (group by date)
  const timelineData = posts.reduce((acc, post) => {
    if (post.createdAt) {
      const date = new Date(post.createdAt).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, posts: 0 };
      }
      acc[date].posts += 1;
    }
    return acc;
  }, {});

  const timelineChartData = Object.values(timelineData)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-14); // Last 14 days

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
          <Card className="bg-gray-900 border-gray-700 text-white">
            <CardContent className="pt-6 text-center space-y-3">
              <p className="text-gray-400">
                No brands are assigned to your account yet.
              </p>
              <p className="text-sm text-gray-500">
                Please contact an administrator so they can assign brands for you to view analytics.
              </p>
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
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-gray-400">
              View your brand's social media performance
            </p>
            </div>
            <Button
              onClick={handleRefresh}
            disabled={loadingPosts}
            className="bg-blue-600 hover:bg-blue-700"
            >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingPosts ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
      </div>
      {collecting && (
        <div className="mb-6 text-xs text-gray-300">Collecting latest posts…</div>
      )}

        {/* Filters */}
        <Card className="bg-black border-white/10 text-white mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Brand Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setSelectedGroup('all'); // Reset group filter when brand changes
                    setSelectedKeyword('all'); // Reset keyword filter when brand changes
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                >
                  {brands.map((brand) => (
                    <option key={brand._id} value={brand.brandName}>
                      {brand.brandName}
                    </option>
                  ))}
                </select>
            </div>

              {/* Platform Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                >
                  <option value="all">All Platforms</option>
                  <option value="twitter">Twitter</option>
                  <option value="youtube">YouTube</option>
                  <option value="reddit">Reddit</option>
                </select>
            </div>

              {/* Keyword Group Filter */}
              {selectedBrand && keywordGroups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Keyword Group</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => {
                      setSelectedGroup(e.target.value);
                      if (e.target.value !== 'all') {
                        setSelectedKeyword('all'); // Reset individual keyword when group is selected
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
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

              {/* Keyword Filter */}
                <div>
                <label className="block text-sm font-medium mb-2">Keyword</label>
                <select
                  value={selectedKeyword}
                  onChange={(e) => {
                    setSelectedKeyword(e.target.value);
                    if (e.target.value !== 'all') {
                      setSelectedGroup('all'); // Reset group when individual keyword is selected
                    }
                  }}
                  disabled={selectedGroup !== 'all'} // Disable when group is selected
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="all">All Keywords</option>
                  {brandKeywords.map((keyword, idx) => (
                    <option key={idx} value={keyword}>
                      {keyword}
                    </option>
                  ))}
                </select>
                </div>
                </div>
          </CardContent>
          </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-black border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Total Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-black border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Platforms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{Object.keys(stats.byPlatform).length}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Keywords
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{brandKeywords.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Platform Distribution Pie Chart */}
          <Card className="bg-gray-900 border-gray-700 text-white">
            <CardHeader>
              <CardTitle>Platform Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {platformChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                      data={platformChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                    dataKey="value"
                    >
                      {platformChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                    <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-8">No data available</p>
              )}
            </CardContent>
              </Card>

          {/* Top Keywords Bar Chart */}
          <Card className="bg-gray-900 border-gray-700 text-white">
            <CardHeader>
              <CardTitle>Top Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              {keywordChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={keywordChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="posts" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
                  </div>

        {/* Timeline Chart */}
        <Card className="bg-black border-white/10 text-white mb-6">
          <CardHeader>
            <CardTitle>Posts Timeline (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="posts" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card className="bg-black border-white/10 text-white">
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPosts ? (
              <p className="text-gray-400 text-center py-8">Loading posts...</p>
            ) : posts.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {posts.slice(0, 10).map((post) => (
                  <div key={post._id} className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition">
                    <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={post.platform} size="xs" />
                        <span className="text-xs px-2 py-1 rounded-lg bg-purple-600/20 border border-purple-600/50 text-purple-300 font-semibold">
                          {post.keyword}
                  </span>
                </div>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-3">
                      {post.content?.text || post.text || 'No content'}
                    </p>
                    {post.content?.description && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        {post.content.description}
                      </p>
                    )}
                    {post.content?.mediaUrl && (
                      <a 
                        href={post.content.mediaUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                      >
                        View Media →
                      </a>
                    )}
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
