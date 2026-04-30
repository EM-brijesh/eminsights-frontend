'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api, { API_BASE_URL, getAuthToken } from '@/lib/api';
import DottedBackground from '@/components/DottedBackground';
import Image from 'next/image';
import { Inter } from 'next/font/google';
import { useSearchParams } from 'next/navigation';

const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'] });

const SUPPORTED_POST_PLATFORMS = ['twitter', 'youtube', 'reddit', 'google', 'instagram' , 'news', 'facebook'];

const MESSAGE_VARIANTS = {
  success: 'bg-emerald-900/40 border-emerald-500/70 text-emerald-100',
  error: 'bg-red-900/40 border-red-500/70 text-red-100',
  warning: 'bg-amber-900/40 border-amber-500/70 text-amber-100',
  info: 'bg-blue-900/40 border-blue-500/70 text-blue-100',
};

const deriveGroupCreatedAt = (group) => {
  if (!group) return null;
  if (group.createdAt) return group.createdAt;
  if (group.createdOn) return group.createdOn;

  const rawId =
    typeof group._id === 'string'
      ? group._id
      : group._id?.toString?.() || (typeof group.id === 'string' ? group.id : group.id?.toString?.());

  if (!rawId || rawId.length < 8) {
    return null;
  }

  try {
    const timestamp = parseInt(rawId.substring(0, 8), 16) * 1000;
    if (Number.isNaN(timestamp)) {
      return null;
    }
    return new Date(timestamp).toISOString();
  } catch {
    return null;
  }
};

const normalizeKeywordGroup = (group = {}, fallbackPlatforms = [], fallbackFrequency = '30m') => {
  const derivedCreatedAt = deriveGroupCreatedAt(group);
  const normalizedName = group.groupName || group.name || '';
  const rawId = group._id || group.id || group.mongoId;
  const stringifiedId = typeof rawId === 'string' ? rawId : rawId?.toString?.();
  const resolvedId = stringifiedId || `${normalizedName || 'group'}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: resolvedId,
    mongoId: stringifiedId || null,
    _id: stringifiedId || undefined,
    name: group.name || group.groupName || '',
    groupName: normalizedName,
    keywords: Array.isArray(group.keywords) ? group.keywords : [],
    includeKeywords: Array.isArray(group.includeKeywords) ? group.includeKeywords : [],
    excludeKeywords: Array.isArray(group.excludeKeywords) ? group.excludeKeywords : [],
    assignedUsers: Array.isArray(group.assignedUsers) ? group.assignedUsers : [],
    platforms: Array.isArray(group.platforms) && group.platforms.length > 0 ? group.platforms : fallbackPlatforms,
    countries: group.country ? [group.country] : Array.isArray(group.countries) ? group.countries : [],
    languages: group.language ? [group.language] : Array.isArray(group.languages) ? group.languages : [],
    frequency: group.frequency || fallbackFrequency,
    paused: !!group.paused,
    createdAt: derivedCreatedAt,
    status: group.status || (group.paused ? 'paused' : 'running'),
  };
};

const normalizeGroupsForBrand = (groups = [], fallbackPlatforms = [], fallbackFrequency = '30m') =>
  (groups || []).map((group) => normalizeKeywordGroup(group, fallbackPlatforms, fallbackFrequency));

const PLATFORM_KEY_TO_BACKEND = {
  youtube: 'youtube',
  reddit: 'reddit',
  quora: 'reddit',
  google: 'google',
  instagram: 'instagram',
  facebook: 'facebook',
  // Backend currently validates keywordGroups.platforms against an enum that does not include news.
  // Preserve UI state as `news`, but submit `google` as the backend-compatible value.
  news: 'google',
  twitter: 'twitter',
};

const normalizePlatformForBackend = (platformKey) => PLATFORM_KEY_TO_BACKEND[platformKey] || null;

const serializeGroupForBackend = (group, fallbackPlatforms = [], fallbackFrequency = '30m') => {
  const normalized = normalizeKeywordGroup(group, fallbackPlatforms, fallbackFrequency);
  const payload = {
    _id: normalized.mongoId || undefined,
    groupName: normalized.groupName || normalized.name || '',
    name: normalized.groupName || normalized.name || '',
    keywords: normalized.keywords,
    includeKeywords: normalized.includeKeywords,
    excludeKeywords: normalized.excludeKeywords,
    assignedUsers: normalized.assignedUsers,
    platforms: Array.from(
      new Set(
        (normalized.platforms || [])
          .map(normalizePlatformForBackend)
          .filter(Boolean),
      ),
    ),
    country: normalized.countries[0],
    language: normalized.languages[0],
    frequency: normalized.frequency,
    paused: normalized.paused,
    status: normalized.paused ? 'paused' : 'running',
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
};

const serializeGroupsForBackend = (groups, fallbackPlatforms = [], fallbackFrequency = '30m') =>
  (groups || []).map((group) => serializeGroupForBackend(group, fallbackPlatforms, fallbackFrequency));

// Lightweight chips input for keywords (Enter to add, click x to remove)
function KeywordChips({ value = [], onAdd, onRemove, placeholder }) {
  const [input, setInput] = useState('');
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const k = input.trim();
      if (k && !value.includes(k)) {
        onAdd(k);
      }
      setInput('');
    }
  };
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2 min-h-[20px]">
        {value.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-800 border border-gray-700">
            {k}
            <button type="button" onClick={() => onRemove(k)} className="text-gray-400 hover:text-white ml-1">
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full h-10 px-3 bg-gray-800 border border-gray-700 rounded-md text-white text-sm placeholder-gray-400"
      />
      <p className="text-xs text-gray-400 mt-1">Add keyword separated by pressing 'Enter'</p>
    </div>
  );
}

export default function KeywordsPageClient() {
  const [brands, setBrands] = useState([]);
  // Default to "All Brands" instead of auto-selecting the first brand
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedBrandData, setSelectedBrandData] = useState(null);
  const [status, setStatus] = useState(''); // '', 'loading', 'done'
  const [resultMessage, setResultMessage] = useState({ type: null, text: '' });
  const searchParams = useSearchParams();
  const messageTimerRef = useRef(null);
  const [showConfig, setShowConfig] = useState(false);
  const [brandSearchText, setBrandSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [keywordSearch, setKeywordSearch] = useState('');
  const [selectedFilterChannels, setSelectedFilterChannels] = useState([]); // [] = all
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const clearMessageTimer = useCallback(() => {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }
  }, []);

  const clearResultMessage = useCallback(() => {
    clearMessageTimer();
    setResultMessage({ type: null, text: '' });
  }, [clearMessageTimer]);

  const showMessage = useCallback(
    (text, type = 'info') => {
      clearMessageTimer();
      setResultMessage({ type, text });
      messageTimerRef.current = setTimeout(() => {
        setResultMessage({ type: null, text: '' });
        messageTimerRef.current = null;
      }, 5000);
    },
    [clearMessageTimer],
  );

  useEffect(() => {
    return () => {
      clearMessageTimer();
    };
  }, [clearMessageTimer]);

  // Configuration state
  const [configPlatforms, setConfigPlatforms] = useState([]);
  const [configFrequency, setConfigFrequency] = useState('30m');
  const [configStatus, setConfigStatus] = useState('');
  const [groupName, setGroupName] = useState('');
  const [queryTab, setQueryTab] = useState('basic'); // basic | advanced
  const [andKeywords, setAndKeywords] = useState([]);
  const [orKeywords, setOrKeywords] = useState([]);
  const [notKeywords, setNotKeywords] = useState([]);
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [keywordGroups, setKeywordGroups] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null); // {groupName, keywords}
  const [editingBrandName, setEditingBrandName] = useState(null);
  const [brandPosts, setBrandPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [brandKeywords, setBrandKeywords] = useState([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordsError, setKeywordsError] = useState('');

  // Refs & call-id pattern to avoid race conditions
  const prevBrandDataRef = useRef({ id: null, keywordGroupsHash: null });
  const fetchBrandsCallIdRef = useRef(0);
  const fetchPostsCallIdRef = useRef(0);
  const fetchKeywordsCallIdRef = useRef(0);
  const brandPrefillAppliedRef = useRef(false);

  const storageKeyForBrand = (brand) => `keywordGroups:${brand}`;

  // Separate persist function that doesn't update state - only localStorage
  const saveGroupsToLocalStorage = (brand, groups) => {
    try {
      if (brand) {
        localStorage.setItem(storageKeyForBrand(brand), JSON.stringify(groups));
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[KeywordsPage] Failed to save to localStorage:', err);
      }
    }
  };

  // Combined persist that updates both state and localStorage
  const persistGroups = (brand, groups, fallbackPlatforms = [], fallbackFrequency = '30m') => {
    const normalized = normalizeGroupsForBrand(groups, fallbackPlatforms, fallbackFrequency);
    setKeywordGroups(normalized);
    saveGroupsToLocalStorage(brand, normalized);
    return normalized;
  };

  // Load user info once on mount
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to get user from localStorage:', e);
      }
    }
    fetchBrands();

    // Cleanup function
    return () => {
      // increment call ids to cancel any inflight operations if needed
      fetchBrandsCallIdRef.current++;
      fetchPostsCallIdRef.current++;
      fetchKeywordsCallIdRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (brandPrefillAppliedRef.current) return;
    if (!Array.isArray(brands) || brands.length === 0) return;

    const queryBrand = searchParams?.get('brand');
    if (!queryBrand) {
      brandPrefillAppliedRef.current = true;
      return;
    }

    const normalizedQuery = String(queryBrand).trim().toLowerCase();
    if (!normalizedQuery) {
      brandPrefillAppliedRef.current = true;
      return;
    }

    const matchedBrand = brands.find(
      (b) => String(b.brandName || '').toLowerCase() === normalizedQuery,
    );

    if (matchedBrand) {
      setSelectedBrand(matchedBrand.brandName);
    }

    brandPrefillAppliedRef.current = true;
  }, [brands, searchParams]);

  // Update brand data when brand changes - memoized using ref
  useEffect(() => {
    // When no brand or "All Brands" is selected, clear brand-specific config
    if (!selectedBrand || selectedBrand === 'all' || brands.length === 0) {
      setSelectedBrandData(null);
      setKeywordGroups([]);
      return;
    }

    const brand = brands.find((b) => b.brandName === selectedBrand);
    if (!brand) {
      setSelectedBrandData(null);
      setKeywordGroups([]);
      return;
    }

    // Track last brand we loaded (may be useful for future optimizations),
    // but always refresh state when the selected brand changes or when we
    // come back from "All Brands" view.
    prevBrandDataRef.current = {
      id: brand._id,
      keywordGroupsHash: JSON.stringify(brand.keywordGroups || []),
    };

    setSelectedBrandData(brand);
    setConfigPlatforms(Array.isArray(brand.platforms) ? brand.platforms : []);
    setConfigFrequency(brand.frequency || '30m');

    // Load keyword groups: backend -> localStorage fallback
    let groupsToUse = [];

    if (brand.keywordGroups && Array.isArray(brand.keywordGroups) && brand.keywordGroups.length > 0) {
      groupsToUse = normalizeGroupsForBrand(brand.keywordGroups, brand.platforms || [], brand.frequency || '30m');
      saveGroupsToLocalStorage(brand.brandName, groupsToUse);
    } else {
      try {
        const storageKey = storageKeyForBrand(brand.brandName);
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            groupsToUse = normalizeGroupsForBrand(parsed, brand.platforms || [], brand.frequency || '30m');
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[KeywordsPage] Failed to load from localStorage:', err);
        }
      }
    }

    setKeywordGroups(groupsToUse);
  }, [selectedBrand, brands]);

  const fetchBrands = async () => {
    const currentCallId = ++fetchBrandsCallIdRef.current;

    try {
      let user = null;
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          user = JSON.parse(userStr);
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to parse user from localStorage:', e);
        }
        // we continue and will show auth error below if needed
      }

      let data;
      if (user?.role === 'admin') {
        try {
          data = await api.brands.getAll();
        } catch (adminErr) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Admin access failed, falling back to user brands:', adminErr.message);
          }
          if (user?.email) {
            data = await api.brands.getByUser(user.email);
          } else {
            throw new Error('User not authenticated');
          }
        }
      } else if (user?.email) {
        data = await api.brands.getByUser(user.email);
      } else {
        throw new Error('User not authenticated. Please login again.');
      }

      if (currentCallId !== fetchBrandsCallIdRef.current) return;

      if (!data || !Array.isArray(data.brands)) {
        throw new Error('Invalid response from server');
      }

      setBrands(data.brands);

      // Auto-select first brand if none selected or current selection invalid
      if (Array.isArray(data.brands) && data.brands.length > 0) {
        setSelectedBrand((prevSelected) => {
          // Preserve explicit "all" selection even after refresh
          if (prevSelected === 'all') {
            return 'all';
          }
          const currentBrandExists = data.brands.some((b) => b.brandName === prevSelected);
          if (!prevSelected || !currentBrandExists) {
            return data.brands[0].brandName;
          }
          return prevSelected;
        });
      } else {
        setSelectedBrand('');
        setBrandKeywords([]);
        setBrandPosts([]);
      }
    } catch (err) {
      if (currentCallId !== fetchBrandsCallIdRef.current) return;
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to load brands:', err);
      }
      showMessage(`Failed to load brands: ${err?.message || 'Unknown error'}`, 'error');
      setBrands([]);
    }
  };

  const fetchBrandPosts = useCallback(async () => {
    const currentCallId = ++fetchPostsCallIdRef.current;

    // Skip fetching posts when "All Brands" or no brand is selected
    if (!selectedBrand || selectedBrand === 'all') {
      setBrandPosts([]);
      return;
    }

    setPostsLoading(true);
    setPostsError('');

    try {
      const params = {
        brandName: selectedBrand,
        limit: 25,
      };

      if (selectedFilterChannels.length === 1) {
        const channel = selectedFilterChannels[0];
        if (SUPPORTED_POST_PLATFORMS.includes(channel)) {
          params.platform = channel;
        }
      }

      const response = await api.dashboard.getPosts(params);

      if (currentCallId !== fetchPostsCallIdRef.current) return; // stale

      setBrandPosts(response?.data || []);
    } catch (err) {
      if (currentCallId !== fetchPostsCallIdRef.current) return;
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to load brand posts:', err);
      }
      setPostsError(err?.message || 'Failed to load posts');
      setBrandPosts([]);
    } finally {
      if (currentCallId === fetchPostsCallIdRef.current) {
        setPostsLoading(false);
      }
    }
  }, [selectedBrand, selectedFilterChannels]);

  const fetchBrandKeywords = useCallback(async () => {
    const currentCallId = ++fetchKeywordsCallIdRef.current;

    // Skip fetching keywords when "All Brands" or no brand is selected
    if (!selectedBrand || selectedBrand === 'all') {
      setBrandKeywords([]);
      return;
    }

    setKeywordsLoading(true);
    setKeywordsError('');

    try {
      const response = await api.dashboard.getKeywords(selectedBrand);

      if (currentCallId !== fetchKeywordsCallIdRef.current) return;

      setBrandKeywords(response?.keywords || []);
    } catch (err) {
      if (currentCallId !== fetchKeywordsCallIdRef.current) return;
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to load brand keywords:', err);
      }
      setKeywordsError(err?.message || 'Failed to load keywords');
      setBrandKeywords([]);
    } finally {
      if (currentCallId === fetchKeywordsCallIdRef.current) {
        setKeywordsLoading(false);
      }
    }
  }, [selectedBrand]);

  useEffect(() => {
    // increment call ids to invalidate previous in-flight requests
    fetchPostsCallIdRef.current++;
    fetchKeywordsCallIdRef.current++;

    const loadData = async () => {
      try {
        await Promise.all([fetchBrandPosts(), fetchBrandKeywords()]);
      } catch {
        // individual functions handle errors
      }
    };

    loadData();

    return () => {
      fetchPostsCallIdRef.current++;
      fetchKeywordsCallIdRef.current++;
    };
  }, [fetchBrandPosts, fetchBrandKeywords]);

  const handleRefreshBrands = async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      setBrandSearchText('');

      await Promise.allSettled([fetchBrands(), fetchBrandPosts(), fetchBrandKeywords()]);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Refresh failed', e);
      }
      showMessage(`Refresh failed: ${e?.message || 'Unknown error'}`, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredBrands = (brands || []).filter((b) => {
    const q = brandSearchText.trim().toLowerCase();
    if (!q) return true;
    const haystack = [b.brandName, Array.isArray(b.keywords) ? b.keywords.join(' ') : '']
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const toggleConfigPlatform = (platformKey) => {
    setConfigPlatforms((prev) => (prev.includes(platformKey) ? prev.filter((p) => p !== platformKey) : [...prev, platformKey]));
  };

  const handleSaveConfiguration = async () => {
    const effectiveBrandName = editingBrandName || selectedBrand;

    if (!effectiveBrandName || effectiveBrandName === 'all') {
      showMessage('Please select a specific brand', 'warning');
      return;
    }

    if ((andKeywords.length + orKeywords.length) === 0) {
      showMessage('Please add at least one keyword', 'warning');
      return;
    }

    if (configPlatforms.length === 0) {
      showMessage('Please select at least one platform', 'warning');
      return;
    }

    if (!groupName || groupName.trim() === '') {
      showMessage('Please enter a group name', 'warning');
      return;
    }

    setConfigStatus('saving');
    try {
      const platformsBackend = Array.from(
        new Set(
          (configPlatforms || [])
            .map(normalizePlatformForBackend)
            .filter(Boolean),
        ),
      );

      const requestBody = {
        brandName: effectiveBrandName,
        groupName: groupName.trim(),
        originalGroupName: editingGroup?.groupName?.trim(),
        keywords: andKeywords,
        includeKeywords: orKeywords,
        excludeKeywords: notKeywords,
        platforms: platformsBackend,
        language: languages.length > 0 ? languages[0] : undefined,
        country: countries.length > 0 ? countries[0] : undefined,
        frequency: configFrequency,
        assignedUsers: editingGroup?.assignedUsers || [],
      };

      const response = await api.brands.addKeywordconfig(requestBody);

      if (!response?.brand) {
        throw new Error('Invalid response from server');
      }

      const updatedBrand = response.brand;

      const backendGroups =
        Array.isArray(updatedBrand.keywordGroups) && updatedBrand.keywordGroups.length > 0
          ? updatedBrand.keywordGroups.map((group) => normalizeKeywordGroup(group, updatedBrand.platforms || [], updatedBrand.frequency || '30m'))
          : [];

      // Update brands list
      setBrands((prev) =>
        Array.isArray(prev) ? prev.map((b) => (b.brandName === effectiveBrandName ? updatedBrand : b)) : prev,
      );

      // If we're currently viewing this brand specifically, sync local state
      if (selectedBrand === effectiveBrandName && selectedBrand !== 'all') {
        setSelectedBrandData(updatedBrand);
        setConfigPlatforms(Array.isArray(updatedBrand.platforms) ? updatedBrand.platforms : []);
        setConfigFrequency(updatedBrand.frequency || '30m');
        setKeywordGroups(backendGroups);
        saveGroupsToLocalStorage(effectiveBrandName, backendGroups);
      } else {
        // All-brands view or editing a different brand: refresh brands to reflect new groups
        await fetchBrands();
      }

      try {
        await Promise.allSettled([fetchBrandPosts(), fetchBrandKeywords()]);
      } catch {
        // ignore
      }

      setConfigStatus('success');
      showMessage('✅ Configuration saved successfully!', 'success');

      setShowConfig(false);
      setEditingGroup(null);
      setEditingBrandName(null);
      setGroupName('');
      setAndKeywords([]);
      setOrKeywords([]);
      setNotKeywords([]);
      setCountries([]);
      setLanguages([]);
      setConfigStatus('');
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Configuration save failed:', error);
      }
      setConfigStatus('error');
      showMessage(`❌ Failed to save configuration: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const handleSubmit = async () => {
    if (status === 'loading') return;

    if (!selectedBrand || selectedBrand === 'all') {
      showMessage('Please select a specific brand.', 'warning');
      return;
    }

    const brandLevelKeywords = Array.isArray(selectedBrandData?.keywords) ? selectedBrandData.keywords.filter(Boolean) : [];
    const groupLevelKeywords = Array.isArray(keywordGroups) ? keywordGroups.filter((g) => Array.isArray(g.keywords) && g.keywords.length > 0) : [];
    const brandLevelPlatforms = Array.isArray(selectedBrandData?.platforms) ? selectedBrandData.platforms.filter(Boolean) : [];
    const groupLevelPlatforms = Array.isArray(keywordGroups)
      ? keywordGroups.filter((g) => Array.isArray(g.platforms) && g.platforms.length > 0)
      : [];

    if (brandLevelKeywords.length === 0 && groupLevelKeywords.length === 0) {
      showMessage('Please add at least one keyword in a keyword group before running search.', 'warning');
      return;
    }

    if (brandLevelPlatforms.length === 0 && groupLevelPlatforms.length === 0) {
      showMessage('Please assign at least one platform to a keyword group before running search.', 'warning');
      return;
    }

    setStatus('loading');
    clearResultMessage();

    try {
      const response = await api.search.runBrandSearch({
        brandName: selectedBrand,
      });

      if (!response) {
        throw new Error('No response from server');
      }

      setStatus('done');

      const summary = response.summary || {};
      const totalPosts = (summary.youtube || 0) + (summary.twitter || 0) + (summary.reddit || 0) + (summary.google || 0) + (summary.instagram || 0)+(summary.facebook || 0);

      showMessage(
        `✅ Search completed!\nFound ${totalPosts} posts:\n• YouTube: ${summary.youtube || 0}\n• Twitter: ${summary.twitter || 0}\n• Reddit: ${summary.reddit || 0}\n• Google: ${summary.google || 0} \n Instagram: ${summary.instagram || 0} \n Facebook: ${summary.facebook || 0}`,
        'success'
      );

      try {
        await Promise.allSettled([fetchBrandPosts(), fetchBrandKeywords()]);
      } catch {
        // ignore
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Search failed:', error);
      }
      setStatus('done');
      showMessage(`❌ Search failed: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  // Build groups for display:
  // - if a specific brand is selected: use its groups or a default group with brand-level keywords
  // - if "All Brands" is selected: merge groups from all brands (read-only view)
  const groupsForDisplay = React.useMemo(() => {
    if (selectedBrand === 'all') {
      return (brands || []).flatMap((brand) => {
        const rawGroups = Array.isArray(brand.keywordGroups) ? brand.keywordGroups : [];
        if (rawGroups.length === 0) return [];
        const normalized = normalizeGroupsForBrand(rawGroups, brand.platforms || [], brand.frequency || '30m');
        return normalized.map((g) => ({
          ...g,
          _brandName: brand.brandName,
        }));
      });
    }

    if (Array.isArray(keywordGroups) && keywordGroups.length > 0) {
      return keywordGroups;
    }

    if (selectedBrandData?.keywords && selectedBrandData.keywords.length > 0) {
      return [
        {
          name: 'Default Group',
          keywords: selectedBrandData.keywords,
          platforms: selectedBrandData.platforms || [],
          paused: false,
        },
      ];
    }

    return [];
  }, [selectedBrand, keywordGroups, selectedBrandData, brands]);

  const keywordRows = groupsForDisplay.map((g, i) => {
    const keywords = Array.isArray(g.keywords) ? g.keywords : [];
    const includeKeywords = Array.isArray(g.includeKeywords) ? g.includeKeywords : [];
    const excludeKeywords = Array.isArray(g.excludeKeywords) ? g.excludeKeywords : [];
    const platforms = Array.isArray(g.platforms) && g.platforms.length > 0 ? g.platforms : selectedBrandData?.platforms || [];
    const assignedUsersForRow = Array.isArray(g.assignedUsers) ? g.assignedUsers : [];
    const createdOn = g.createdAt || deriveGroupCreatedAt(g) || selectedBrandData?.updatedAt || null;
    const countryList = Array.isArray(g.countries) ? g.countries : g.country ? [g.country] : [];
    const languageList = Array.isArray(g.languages) ? g.languages : g.language ? [g.language] : [];
    const brandNameForRow = g._brandName || selectedBrandData?.brandName || selectedBrand || '-';

    return {
      id: g.id || `${g.name || 'group'}-${i}`,
      groupName: g.groupName || g.name || 'Unnamed Group',
      brandName: brandNameForRow,
      keywords,
      includeKeywords,
      excludeKeywords,
      query: keywords.length > 0 ? `(${keywords.join(' OR ')})` : '',
      channels: platforms,
      platformKeys: platforms,
      countries: countryList,
      languages: languageList,
      paused: !!g.paused,
      createdOn,
      status: g.paused ? 'Paused' : 'Collecting data',
      frequency: g.frequency,
      assignedUsers: assignedUsersForRow,
    };
  });

  const filteredRows = keywordRows.filter((row) => {
    const q = keywordSearch.trim().toLowerCase();
    if (!q) return true;

    // Include group name, AND, OR, NOT keywords and the built query string in search
    const searchableParts = [
      row.groupName,
      ...(row.keywords || []),
      ...(row.includeKeywords || []),
      ...(row.excludeKeywords || []),
      row.query,
    ].filter(Boolean);

    const searchableText = searchableParts.join(' ').toLowerCase();

    return searchableText.includes(q);
  });

  const channelFilteredRows = selectedFilterChannels.length === 0 ? filteredRows : filteredRows.filter((row) => {
    const channels = row.channels || [];
    return channels.some((ch) => selectedFilterChannels.includes(ch));
  });

  const handleDeleteGroup = async (row) => {
    const targetBrandName = selectedBrand === 'all' ? row.brandName : selectedBrand;

    if (!targetBrandName || !row?.groupName) {
      showMessage('Invalid group data', 'warning');
      return;
    }

    const ok = confirm(`Delete keyword group "${row.groupName}"?`);
    if (!ok) return;

    try {
      const brandRecord =
        (brands || []).find((b) => b.brandName === targetBrandName) ||
        (selectedBrandData?.brandName === targetBrandName ? selectedBrandData : null);

      if (!brandRecord) {
        showMessage('Brand data not found for this group', 'error');
        return;
      }

      const brandPlatforms = Array.isArray(brandRecord.platforms) ? brandRecord.platforms : [];
      const brandFrequency = brandRecord.frequency || '30m';

      const brandKeywords = Array.isArray(brandRecord.keywords) ? brandRecord.keywords : [];
      const updated = brandKeywords.filter((k) => !(row.keywords || []).includes(k));

      const sourceGroups = Array.isArray(brandRecord.keywordGroups)
        ? normalizeGroupsForBrand(brandRecord.keywordGroups, brandPlatforms, brandFrequency)
        : keywordGroups || [];

      const nextGroups = (sourceGroups || []).filter((g) => (g.groupName || g.name) !== row.groupName);
      const normalizedNextGroups = normalizeGroupsForBrand(nextGroups, brandPlatforms, brandFrequency);
      const keywordGroupsForBackend = serializeGroupsForBackend(
        normalizedNextGroups,
        brandPlatforms,
        brandFrequency,
      );

      await api.brands.configure({
        brandName: targetBrandName,
        keywords: updated,
        platforms: brandPlatforms,
        frequency: brandFrequency,
        keywordGroups: keywordGroupsForBackend,
      });

      if (targetBrandName === selectedBrand && selectedBrand !== 'all') {
        // Update local state for current brand view
        persistGroups(selectedBrand, normalizedNextGroups, brandPlatforms, brandFrequency);
        await fetchBrands();
      } else {
        // All-brands view or different brand: just refresh brands list
        await fetchBrands();
      }
      showMessage('✅ Group deleted successfully', 'success');
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Delete failed', e);
      }
      showMessage(`Failed to delete: ${e?.message || 'Unknown error'}`, 'error');
    }
  };

  const handleEditGroup = async (row) => {
    const targetBrandName = selectedBrand === 'all' ? row.brandName : selectedBrand;

    if (!targetBrandName) {
      showMessage('Invalid brand for this group', 'warning');
      return;
    }

    const editData = {
      groupName: row.groupName,
      keywords: row.keywords || [],
      assignedUsers: row.assignedUsers || [],
    };
    setEditingGroup(editData);
    setEditingBrandName(targetBrandName);
    setGroupName(row.groupName);
    setAndKeywords(row.keywords || []);
    setOrKeywords(row.includeKeywords || []);
    setNotKeywords(row.excludeKeywords || []);
    const platformsToUse = row.platformKeys && row.platformKeys.length ? row.platformKeys : (configPlatforms.length > 0 ? configPlatforms : selectedBrandData?.platforms || []);
    setConfigPlatforms(platformsToUse);
    setCountries(row.countries && row.countries.length ? row.countries : row.country ? [row.country] : []);
    setLanguages(row.languages && row.languages.length ? row.languages : row.language ? [row.language] : []);
    setConfigFrequency(row.frequency || selectedBrandData?.frequency || '30m');
    setShowConfig(true);
  };

  const handlePauseToggle = async (row) => {
    const brandNameForAction = selectedBrand === 'all' ? row.brandName : selectedBrand;

    if (!row?.groupName || !brandNameForAction) {
      showMessage('Invalid group', 'warning');
      return;
    }

    try {
      const action = row.paused ? 'start' : 'pause'; // paused → start, running → pause

      const token = getAuthToken();

      const res = await fetch(`${API_BASE_URL}/api/search/group/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          brandName: brandNameForAction,
          groupName: row.groupName,
          action,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to toggle group status' }));
        showMessage(`❌ ${errorData.message || 'Failed to toggle group status'}`, 'error');
        return;
      }

      const data = await res.json();
      if (!data.success) {
        showMessage(`❌ ${data.message}`, 'error');
        return;
      }

      showMessage(`✔️ Group ${row.groupName} is now ${data.status}`, "success");

      if (selectedBrand === 'all') {
        // In all-brands view, reload brands so merged list reflects latest status
        await fetchBrands();
      } else {
        // Update UI state for currently selected brand
        setKeywordGroups((groups) =>
          groups.map((g) =>
            (g.groupName || g.name) === row.groupName
              ? { ...g, paused: data.paused, status: data.status }
              : g,
          ),
        );
      }

    } catch (e) {
      console.error(e);
      showMessage("Error toggling group state", "error");
    }
  };


  const handleDuplicateGroup = async (row) => {
    const targetBrandName = selectedBrand === 'all' ? row.brandName : selectedBrand;

    if (!targetBrandName || !row?.groupName) {
      showMessage('Invalid group data', 'warning');
      return;
    }

    try {
      const brandRecord =
        (brands || []).find((b) => b.brandName === targetBrandName) ||
        (selectedBrandData?.brandName === targetBrandName ? selectedBrandData : null);

      if (!brandRecord) {
        showMessage('Brand data not found for this group', 'error');
        return;
      }

      const brandPlatforms = Array.isArray(brandRecord.platforms) ? brandRecord.platforms : [];
      const brandFrequency = brandRecord.frequency || '30m';

      const baseName = `${row.groupName} (copy)`;
      let newName = baseName;
      let counter = 2;
      const sourceGroups = Array.isArray(brandRecord.keywordGroups)
        ? normalizeGroupsForBrand(brandRecord.keywordGroups, brandPlatforms, brandFrequency)
        : keywordGroups || [];

      const names = new Set((sourceGroups || []).map((g) => g.groupName || g.name));

      while (names.has(newName)) {
        newName = `${baseName} ${counter++}`;
      }

      const sourceGroup = (sourceGroups || []).find((g) => (g.groupName || g.name) === row.groupName);
      const dupSource = sourceGroup
        ? { ...sourceGroup }
        : {
          keywords: Array.isArray(row.keywords) ? [...row.keywords] : [],
          includeKeywords: [],
          excludeKeywords: [],
          assignedUsers: [],
          platforms: Array.isArray(row.platformKeys) ? [...row.platformKeys] : [],
          countries: Array.isArray(row.countries) ? [...row.countries] : [],
          languages: Array.isArray(row.languages) ? [...row.languages] : [],
          paused: row.paused || false,
        };

      const dup = {
        ...dupSource,
        id: `${newName}-${Date.now()}`,
        mongoId: null,
        _id: undefined,
        name: newName,
        groupName: newName,
        createdAt: new Date().toISOString(),
      };

      const nextGroups = [...(sourceGroups || []), dup];
      const normalizedNextGroups = normalizeGroupsForBrand(nextGroups, brandPlatforms, brandFrequency);
      const keywordGroupsForBackend = serializeGroupsForBackend(
        normalizedNextGroups,
        brandPlatforms,
        brandFrequency,
      );

      await api.brands.configure({
        brandName: targetBrandName,
        keywords: brandRecord.keywords || [],
        platforms: brandPlatforms,
        frequency: brandFrequency,
        keywordGroups: keywordGroupsForBackend,
      });

      if (targetBrandName === selectedBrand && selectedBrand !== 'all') {
        persistGroups(selectedBrand, normalizedNextGroups, brandPlatforms, brandFrequency);
      } else {
        await fetchBrands();
      }
      showMessage('✅ Group duplicated successfully', 'success');
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Duplicate failed', e);
      }
      showMessage(`❌ Failed to duplicate group: ${e?.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className={`min-h-screen bg-black text-white p-4 relative ${inter.className}`}>
      <DottedBackground />
      <div className="w-full max-w-none relative z-10 px-0">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-100">Keywords Configuration</h1>
        </div>

        {resultMessage.text && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-4 ${MESSAGE_VARIANTS[resultMessage.type] || MESSAGE_VARIANTS.info
              }`}
            role="status"
            aria-live="polite"
          >
            <p className="whitespace-pre-line leading-5 flex-1">{resultMessage.text}</p>
            <button
              type="button"
              onClick={clearResultMessage}
              aria-label="Dismiss message"
              className="text-white/70 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        <div className="bg-black border border-white/10 rounded-lg p-3 mb-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Label className="text-sm" />
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className={`w-full md:w-64 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-white ${inter.className}`}
              >
                <option value="all" className={`bg-gray-900 text-white ${inter.className}`}>
                  All Brands
                </option>
                {filteredBrands.map((brand) => (
                  <option key={brand._id} value={brand.brandName} className={`bg-gray-900 text-white ${inter.className}`}>
                    {brand.brandName}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 min-w-[240px]">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                value={keywordSearch}
                onChange={(e) => setKeywordSearch(e.target.value)}
                placeholder="Search by Group Name, Keyword"
                className="w-full h-10 pl-9 pr-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Search keywords"
              />
            </div>

            <div className="flex items-center gap-2 relative flex-wrap">
              <Button
                type="button"
                onClick={handleRefreshBrands}
                variant="outline"
                size="icon"
                title="Refresh"
                aria-label="Refresh brands"
                disabled={refreshing}
                className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>

              <div className="relative">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  title="Filter by channel"
                  className="h-9 px-3 bg-gray-800 border border-gray-700 rounded-md text-white text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {selectedFilterChannels.length === 0 ? (
                    <span className="text-xs">All</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      {selectedFilterChannels.slice(0, 4).map((ch) =>
                        ch === 'youtube' ? (
                          <Image key={ch} src="/youtube-logo.svg" alt="YouTube" width={16} height={16} />
                        ) 
                        : ch === 'twitter' ? (
                          <Image key={ch} src="/x-logo.svg" alt="X" width={14} height={14} />
                        ) : ch === 'reddit' ? (
                          <Image key={ch} src="/reddit-logo.svg" alt="Reddit" width={16} height={16} />
                        ) : ch === 'google' ? (
                          <Image key={ch} src="/google-logo.svg" alt="Google" width={16} height={16} />
                        ) : ch === 'instagram' ? (
                          <Image key={ch} src="/instagram-logo.svg" alt="Instagram" width={16} height={16} />
                        ) : ch === 'facebook' ? (
                          <Image key={ch} src="/facebook-logo.svg" alt="Facebook" width={16} height={16} />
                        ) : null
                      )}
                      {selectedFilterChannels.length > 4 && <span className="text-[10px]">+{selectedFilterChannels.length - 4}</span>}
                    </div>
                  )}
                </button>
                {filterOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-gray-900 border border-gray-800 rounded-md shadow-lg z-50 p-1">
                    <label className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-800 cursor-pointer">
                      <input type="checkbox" checked={selectedFilterChannels.length === 0} onChange={() => setSelectedFilterChannels([])} />
                      All Channels
                    </label>
                    {[
                      { key: 'youtube', label: 'YouTube', src: '/youtube-logo.svg', wh: [16, 16] },
                      { key: 'twitter', label: 'X (Twitter)', src: '/x-logo.svg', wh: [14, 14] },
                      { key: 'reddit', label: 'Reddit', src: '/reddit-logo.svg', wh: [16, 16] },
                      { key: 'news', label: 'News', src: '/news-logo.svg', wh: [16, 16] },
                      //{ key: 'facebook', label: 'Facebook', src: '/facebook-logo.svg', wh: [16, 16] },
                      { key: 'instagram', label: 'Instagram', src: '/instagram-logo.svg', wh: [16, 16] },
                     // { key: 'quora', label: 'Quora', src: '/quora-logo.svg', wh: [16, 16] },
                      { key: 'google', label: 'Google', src: '/google-logo.svg', wh: [16, 16] },
                      { key: 'facebook', label: 'Facebook', src: '/facebook-logo.svg', wh: [16, 16] },
                    ].map((p) => (
                      <label key={p.key} className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFilterChannels.includes(p.key)}
                          onChange={() => {
                            setSelectedFilterChannels((prev) => {
                              const set = new Set(prev);
                              if (set.has(p.key)) {
                                set.delete(p.key);
                              } else {
                                set.add(p.key);
                              }
                              return Array.from(set);
                            });
                          }}
                        />
                        <Image src={p.src} alt={p.label} width={p.wh[0]} height={p.wh[1]} />
                        <span>{p.label}</span>
                      </label>
                    ))}
                    <div className="flex justify-end gap-2 px-2 py-1">
                      <button onClick={() => setFilterOpen(false)} className="text-xs text-gray-300 hover:text-white">
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {selectedBrand && selectedBrand !== 'all' && (
                <Button
                  onClick={() => {
                    setEditingGroup(null);
                    setEditingBrandName(selectedBrand);
                    setGroupName('');
                    setAndKeywords([]);
                    setOrKeywords([]);
                    setNotKeywords([]);
                    setConfigPlatforms([]);
                    setCountries([]);
                    setLanguages([]);
                    setConfigFrequency(selectedBrandData?.frequency || '30m');
                    setShowConfig(true);
                  }}
                  className="bg-white text-black hover:bg-white/90 shadow"
                >
                  Add Keywords/Social Profiles
                </Button>
              )}
              {/* <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
                Run Search
              </Button> */}
            </div>
          </div>
        </div>

        <div className="bg-black border border-white/10 rounded-lg">
          <div className="w-full">
            <table className="w-full table-auto">
              <thead className="bg-black">
                <tr>
                  <th className="px-5 py-3 text-left text-xs md:text-sm font-semibold text-slate-200 uppercase tracking-wide">Brands</th>
                  <th className="px-5 py-3 text-left text-xs md:text-sm font-semibold text-slate-200 uppercase tracking-wide">Keywords Group Name</th>
                  <th className="px-5 py-3 text-left text-xs md:text-sm font-semibold text-slate-200 uppercase tracking-wide">Keywords/Keywords Query</th>
                  <th className="px-5 py-3 text-left text-xs md:text-sm font-semibold text-slate-200 uppercase tracking-wide">Channels</th>
                  <th className="px-5 py-3 text-left text-xs md:text-sm font-semibold text-slate-200 uppercase tracking-wide">Created On</th>
                  <th className="px-5 py-3 text-left text-xs md:text-sm font-semibold text-slate-200 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs md:text-sm font-semibold text-slate-200 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {channelFilteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-800 hover:bg-gray-800/40 even:bg-gray-900/40">
                    <td className="px-5 py-4 text-sm text-slate-100">{row.brandName}</td>
                    <td className="px-5 py-4 text-sm text-slate-100">{row.groupName}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      <div className="space-y-2">
                        {(row.keywords || []).length > 0 && (
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">AND Keywords</p>
                            <div className="flex flex-wrap gap-2">
                              {(row.keywords || []).map((kw) => (
                                <span key={`and-${kw}`} className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/30 text-white text-xs">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(row.includeKeywords || []).length > 0 && (
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">OR Keywords</p>
                            <div className="flex flex-wrap gap-2">
                              {(row.includeKeywords || []).map((kw) => (
                                <span key={`or-${kw}`} className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-300/40 text-blue-100 text-xs">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(row.excludeKeywords || []).length > 0 && (
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">NOT Keywords</p>
                            <div className="flex flex-wrap gap-2">
                              {(row.excludeKeywords || []).map((kw) => (
                                <span key={`not-${kw}`} className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-300/40 text-red-100 text-xs">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(row.keywords || []).length === 0 &&
                          (row.includeKeywords || []).length === 0 &&
                          (row.excludeKeywords || []).length === 0 && (
                            <p className="text-xs text-gray-500">No keywords configured</p>
                          )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {row.channels?.map((plat, idx) => (
                          <span key={`${plat}-${idx}`} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 border border-gray-700">
                            {plat === 'youtube' && <Image src="/youtube-logo.svg" alt="YouTube" width={16} height={16} />}
                            {plat === 'news' && <Image src="/news-logo.svg" alt="News" width={16} height={16} />}
                            {plat === 'twitter' && <Image src="/x-logo.svg" alt="X" width={14} height={14} />}
                            {plat === 'reddit' && <Image src="/reddit-logo.svg" alt="Reddit" width={16} height={16} />}
                            {plat === 'instagram' && <Image src="/instagram-logo.svg" alt="Instagram" width={16} height={16} />}
                            {plat === 'google' && <Image src="/google-logo.svg" alt="Google" width={16} height={16} />}
                            {plat === 'facebook' && <Image src="/facebook-logo.svg" alt="Facebook" width={16} height={16} />}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-300">{row.createdOn ? new Date(row.createdOn).toLocaleDateString() : '-'}</td>
                    <td className="px-5 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs whitespace-nowrap border ${row.paused ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' : 'bg-green-900/30 text-green-300 border-green-700'}`}
                      >
                        {row.paused ? "Paused" : "Running"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-300 relative">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePauseToggle(row)}
                          className="text-gray-200 hover:text-white border border-gray-700 px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-white"
                        >
                          {row.paused ? 'Start' : 'Pause'}
                        </button>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                          className="text-gray-400 hover:text-white w-8 h-8 rounded-md border border-gray-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white"
                        >
                          ⋯
                        </button>
                      </div>
                      {openMenuId === row.id && (
                        <div className="absolute right-4 mt-2 w-44 bg-gray-900 border border-gray-800 rounded shadow-lg z-50">
                          <button
                            onClick={() => {
                              handleDuplicateGroup(row);
                              setOpenMenuId(null);
                            }}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-800"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => {
                              handleEditGroup(row);
                              setOpenMenuId(null);
                            }}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteGroup(row);
                              setOpenMenuId(null);
                            }}
                            className="block w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-gray-800"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {channelFilteredRows.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center text-sm text-gray-400">
                      No keywords found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Configuration Panel (Add Keywords/Social Profiles) */}
        {showConfig && (editingBrandName || (selectedBrand && selectedBrand !== 'all')) && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setShowConfig(false)}>
            <div className="bg-gray-900 border border-gray-800 text-white rounded-lg max-w-6xl w-[95vw] mx-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold">Real Time Keywords Configuration</h2>
                <button className="text-gray-400 hover:text-white" onClick={() => { setShowConfig(false); setEditingGroup(null); }}>✕</button>
              </div>
              <div className="px-6 py-5">
                {resultMessage.text && (
                  <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-4 ${
                      MESSAGE_VARIANTS[resultMessage.type] || MESSAGE_VARIANTS.info
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    <p className="whitespace-pre-line leading-5 flex-1">{resultMessage.text}</p>
                    <button
                      type="button"
                      onClick={clearResultMessage}
                      aria-label="Dismiss message"
                      className="text-white/70 hover:text-white text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Side */}
                  <div className="space-y-4">
                    <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-4">
                      <Label className="text-sm mb-2 block">Name Your Keywords Group</Label>
                      <p className="text-xs text-gray-400 mb-2">Add a title that explains the purpose of the Keywords group.</p>
                      <div className="relative">
                        <Input
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder="Keywords Group Name *"
                          className="bg-gray-800 border-gray-700 text-white h-11"
                          maxLength={30}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{`${groupName.length}/30`}</span>
                      </div>
                    </div>

                    <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-4">
                      <Label className="text-sm mb-2 block">Pick Your Channels</Label>
                      <p className="text-xs text-gray-400 mb-3">Select at least one network to listen to.</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { key: 'twitter', title: 'Twitter', desc: 'Tweets, Replies, Mentions', logo: '/x-logo.svg', size: 16 },
                          { key: 'instagram', title: 'Instagram', desc: 'Posts', logo: '/instagram-logo.svg', size: 16 },
                          { key: 'news', title: 'News', desc: 'Latest News', logo: '/news-logo.svg', size: 16 },
                          { key: 'youtube', title: 'YouTube', desc: 'Video post only', logo: '/youtube-logo.svg', size: 18 },
                          { key: 'reddit', title: 'Reddit', desc: 'Communities & comments', logo: '/reddit-logo.svg', size: 18 },
                          { key: 'google', title: 'Google', desc: 'Web Search', logo: '/google-logo.svg', size: 16 },
                          { key: 'facebook', title: 'Facebook', desc: 'Posts', logo: '/facebook-logo.svg', size: 16 },

                          // { key: 'quora', title: 'Quora', desc: 'Question, Answers, Comment', logo: '/quora-logo.svg', size: 16 },
                        ].map((ch) => {
                          const active = configPlatforms.includes(ch.key);
                          return (
                            <button
                              type="button"
                              key={ch.key}
                              onClick={() => toggleConfigPlatform(ch.key)}
                              className={`text-left p-3 rounded-lg border transition ${active ? 'border-white bg-white/10' : 'border-gray-800 bg-gray-900 hover:bg-gray-800/70'}`}
                            >
                              <div className="flex items-center gap-2">
                                {ch.logo ? (
                                  <Image src={ch.logo} alt={ch.title} width={ch.size} height={ch.size} />
                                ) : (
                                  <span className="w-4 h-4 rounded-full bg-gray-700 inline-block" />
                                )}
                                <div className="font-medium">{ch.title}</div>
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">{ch.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-4">
                      <Label className="text-sm mb-2 block">Monitoring Frequency</Label>
                      <select
                        id="config-frequency"
                        value={configFrequency}
                        onChange={(e) => setConfigFrequency(e.target.value)}
                        className={`w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white ${inter.className}`}
                      >
                        <option value="5m" className={`bg-gray-900 text-white ${inter.className}`}>Every 5 Minutes</option>
                        <option value="30m" className={`bg-gray-900 text-white ${inter.className}`}>Every 30 Minutes (Default)</option>
                        <option value="1h" className={`bg-gray-900 text-white ${inter.className}`}>Every 1 Hour</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Side */}
                  <div className="space-y-4">
                    <div className="bg-gray-800/40 border border-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <button className={`px-3 py-1.5 rounded-md text-sm ${queryTab === 'basic' ? 'bg-white text-black' : 'bg-gray-800 text-gray-300'}`} onClick={() => setQueryTab('basic')}>
                          Basic Query Builder
                        </button>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center gap-3 mb-2">
                          <Label className="text-sm">Included Keywords (AND)</Label>
                        </div>
                        <KeywordChips value={andKeywords} onAdd={(k) => setAndKeywords([...andKeywords, k])} onRemove={(k) => setAndKeywords(andKeywords.filter((x) => x !== k))} placeholder="Add New Keyword" />
                      </div>

                      <div className="mb-3">
                        <Label className="text-sm">Included Keywords (OR)</Label>
                        <KeywordChips value={orKeywords} onAdd={(k) => setOrKeywords([...orKeywords, k])} onRemove={(k) => setOrKeywords(orKeywords.filter((x) => x !== k))} placeholder="Add New Keyword" />
                      </div>

                      <div className="mb-3">
                        <Label className="text-sm">Excluded Keywords (NOT)</Label>
                        <KeywordChips value={notKeywords} onAdd={(k) => setNotKeywords([...notKeywords, k])} onRemove={(k) => setNotKeywords(notKeywords.filter((x) => x !== k))} placeholder="Add New Keyword" />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button onClick={() => { setShowConfig(false); setEditingGroup(null); }} variant="outline" className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800">
                        Cancel
                      </Button>
                      <Button onClick={handleSaveConfiguration} disabled={configStatus === 'saving'} className="bg-white text-black hover:bg-white/90 w-28">
                        {configStatus === 'saving' ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
