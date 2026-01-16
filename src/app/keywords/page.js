import { Suspense } from 'react';
import KeywordsPageClient from './KeywordsPageClient';

export default function KeywordsPage() {
<<<<<<< Updated upstream
=======
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedBrandData, setSelectedBrandData] = useState(null);
  const [status, setStatus] = useState(''); // '', 'loading', 'done'
  const [resultMessage, setResultMessage] = useState({ type: null, text: '' });
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
  const [configKeywords, setConfigKeywords] = useState('');
  const [configPlatforms, setConfigPlatforms] = useState([]);
  const [configFrequency, setConfigFrequency] = useState('30m');
  const [configStatus, setConfigStatus] = useState('');
  const [groupName, setGroupName] = useState('');
  const [queryTab, setQueryTab] = useState('basic'); // basic | advanced
  const [andKeywords, setAndKeywords] = useState([]);
  const [orKeywords, setOrKeywords] = useState([]);
  const [notKeywords, setNotKeywords] = useState([]);
  const [andMode, setAndMode] = useState('AND'); // AND | OR radio for AND group
  const [countries, setCountries] = useState([]);
  const handleAddCountry = (code) => {
    if (!code) return;
    if (!countries.includes(code)) setCountries([...countries, code]);
  };
  const removeCountry = (code) => setCountries(countries.filter((c) => c !== code));
  const [languages, setLanguages] = useState([]);
  const [keywordGroups, setKeywordGroups] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null); // {groupName, keywords}
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
  const persistGroups = (brand, groups) => {
    setKeywordGroups(groups);
    saveGroupsToLocalStorage(brand, groups);
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

  // Update brand data when brand changes - memoized using ref
  useEffect(() => {
    if (!selectedBrand || brands.length === 0) {
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

    const currentKeywordGroupsHash = JSON.stringify(brand.keywordGroups || []);
    const brandChanged =
      prevBrandDataRef.current.id !== brand._id ||
      prevBrandDataRef.current.keywordGroupsHash !== currentKeywordGroupsHash;

    if (!brandChanged) {
      return; // Skip if brand data hasn't changed
    }

    prevBrandDataRef.current = {
      id: brand._id,
      keywordGroupsHash: currentKeywordGroupsHash,
    };

    setSelectedBrandData(brand);
    setConfigKeywords(Array.isArray(brand.keywords) ? brand.keywords.join(', ') : '');
    setConfigPlatforms(Array.isArray(brand.platforms) ? brand.platforms : []);
    setConfigFrequency(brand.frequency || '30m');

    // Load keyword groups: backend -> localStorage fallback
    let groupsToUse = [];

    if (brand.keywordGroups && Array.isArray(brand.keywordGroups) && brand.keywordGroups.length > 0) {
      groupsToUse = brand.keywordGroups.map((group) => ({
        name: group.name || '',
        keywords: Array.isArray(group.keywords) ? group.keywords : [],
        includeKeywords: Array.isArray(group.includeKeywords) ? group.includeKeywords : [],
        excludeKeywords: Array.isArray(group.excludeKeywords) ? group.excludeKeywords : [],
        assignedUsers: Array.isArray(group.assignedUsers) ? group.assignedUsers : [],
        platforms: Array.isArray(group.platforms) && group.platforms.length > 0 ? group.platforms : brand.platforms || [],
        countries: group.country ? [group.country] : [],
        languages: group.language ? [group.language] : [],
        frequency: group.frequency || brand.frequency || '30m',
        paused: !!group.paused,
      }));
      saveGroupsToLocalStorage(brand.brandName, groupsToUse);
    } else {
      try {
        const storageKey = storageKeyForBrand(brand.brandName);
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            groupsToUse = parsed;
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

    if (!selectedBrand) {
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

    if (!selectedBrand) {
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
    if (!selectedBrand) {
      showMessage('Please select a brand', 'warning');
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
      const platformsBackend = (configPlatforms || []).map((k) => {
        if (k === 'youtube') return 'youtube';
        if (k === 'reddit' || k === 'quora') return 'reddit';
        if (k === 'google') return 'google';
        return 'twitter';
      });

      const requestBody = {
        brandName: selectedBrand,
        groupName: groupName.trim(),
        originalGroupName: editingGroup?.groupName?.trim(),
        keywords: andKeywords,
        includeKeywords: orKeywords,
        excludeKeywords: notKeywords,
        platforms: Array.from(new Set(platformsBackend)),
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
          ? updatedBrand.keywordGroups.map((group) => ({
            name: group.name || '',
            keywords: Array.isArray(group.keywords) ? group.keywords : [],
            includeKeywords: Array.isArray(group.includeKeywords) ? group.includeKeywords : [],
            excludeKeywords: Array.isArray(group.excludeKeywords) ? group.excludeKeywords : [],
            assignedUsers: Array.isArray(group.assignedUsers) ? group.assignedUsers : [],
            platforms: Array.isArray(group.platforms) && group.platforms.length > 0 ? group.platforms : updatedBrand.platforms || [],
            countries: group.country ? [group.country] : [],
            languages: group.language ? [group.language] : [],
            frequency: group.frequency || updatedBrand.frequency || '30m',
            paused: !!group.paused,
          }))
          : [];

      setSelectedBrandData(updatedBrand);
      setConfigKeywords(Array.isArray(updatedBrand.keywords) ? updatedBrand.keywords.join(', ') : '');
      setConfigPlatforms(Array.isArray(updatedBrand.platforms) ? updatedBrand.platforms : []);
      setConfigFrequency(updatedBrand.frequency || '30m');
      setKeywordGroups(backendGroups);

      setBrands((prev) => (Array.isArray(prev) ? prev.map((b) => (b.brandName === selectedBrand ? updatedBrand : b)) : prev));

      saveGroupsToLocalStorage(selectedBrand, backendGroups);

      try {
        await Promise.allSettled([fetchBrandPosts(), fetchBrandKeywords()]);
      } catch {
        // ignore
      }

      setConfigStatus('success');
      showMessage('✅ Configuration saved successfully!', 'success');

      setShowConfig(false);
      setEditingGroup(null);
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

    if (!selectedBrand) {
      showMessage('Please select a brand.', 'warning');
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
      const totalPosts = (summary.youtube || 0) + (summary.twitter || 0) + (summary.reddit || 0 + (summary.google || 0));

      showMessage(
        `✅ Search completed!\nFound ${totalPosts} posts:\n• YouTube: ${summary.youtube || 0}\n• Twitter: ${summary.twitter || 0}\n• Reddit: ${summary.reddit || 0}\n• Google: ${summary.google || 0}`,
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

  const hasGroups = Array.isArray(keywordGroups) && keywordGroups.length > 0;

  const groupsForDisplay = hasGroups
    ? keywordGroups
    : selectedBrandData?.keywords && selectedBrandData.keywords.length > 0
      ? [
        {
          name: 'Default Group',
          keywords: selectedBrandData.keywords,
          platforms: selectedBrandData.platforms || [],
          paused: false,
        },
      ]
      : [];

  const keywordRows = groupsForDisplay.map((g, i) => {
    const keywords = Array.isArray(g.keywords) ? g.keywords : [];
    const platforms = Array.isArray(g.platforms) && g.platforms.length > 0 ? g.platforms : selectedBrandData?.platforms || [];
    const assignedUsersForRow = Array.isArray(g.assignedUsers) ? g.assignedUsers : [];

    return {
      id: `${g.name || 'group'}-${i}`,
      groupName: g.name || 'Unnamed Group',
      keywords,
      query: keywords.length > 0 ? `(${keywords.join(' OR ')})` : '',
      channels: platforms,
      platformKeys: platforms,
      countries: Array.isArray(g.countries) ? g.countries : [],
      languages: Array.isArray(g.languages) ? g.languages : [],
      paused: !!g.paused,
      createdOn: selectedBrandData?.updatedAt || null,
      status: g.paused ? 'Paused' : 'Collecting data',
      assignedUsers: assignedUsersForRow,
    };
  });

  const filteredRows = keywordRows.filter((row) => {
    const q = keywordSearch.trim().toLowerCase();
    if (!q) return true;

    const searchableText = [row.groupName, ...(row.keywords || []), row.query].filter(Boolean).join(' ').toLowerCase();

    return searchableText.includes(q);
  });

  const channelFilteredRows = selectedFilterChannels.length === 0 ? filteredRows : filteredRows.filter((row) => {
    const channels = row.channels || [];
    return channels.some((ch) => selectedFilterChannels.includes(ch));
  });

  const handleCopyGroup = async (row) => {
    try {
      if (!row?.query) {
        throw new Error('No query to copy');
      }
      await navigator.clipboard.writeText(row.query);
      showMessage('Copied to clipboard', 'success');
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Copy failed', e);
      }
      showMessage(`Failed to copy: ${e?.message || 'Unknown error'}`, 'error');
    }
  };

  const getCurrentBrandPlatforms = useCallback(() => {
    const brandRecord = (brands || []).find((b) => b.brandName === selectedBrand);
    if (Array.isArray(brandRecord?.platforms) && brandRecord.platforms.length > 0) {
      return brandRecord.platforms;
    }
    if (Array.isArray(selectedBrandData?.platforms) && selectedBrandData.platforms.length > 0) {
      return selectedBrandData.platforms;
    }
    return [];
  }, [brands, selectedBrand, selectedBrandData]);

  const handleDeleteGroup = async (row) => {
    if (!selectedBrandData || !row?.groupName) {
      showMessage('Invalid group data', 'warning');
      return;
    }

    const ok = confirm(`Delete keyword group "${row.groupName}"?`);
    if (!ok) return;

    try {
      const updated = (selectedBrandData.keywords || []).filter((k) => !(row.keywords || []).includes(k));
      const nextGroups = (keywordGroups || []).filter((g) => g.name !== row.groupName);

      const keywordGroupsForBackend = nextGroups.map((g) => ({
        name: g.name || '',
        keywords: Array.isArray(g.keywords) ? g.keywords : [],
        includeKeywords: Array.isArray(g.includeKeywords) ? g.includeKeywords : [],
        excludeKeywords: Array.isArray(g.excludeKeywords) ? g.excludeKeywords : [],
        assignedUsers: Array.isArray(g.assignedUsers) ? g.assignedUsers : [],
        platforms: Array.isArray(g.platforms) ? g.platforms : [],
        country: Array.isArray(g.countries) && g.countries.length > 0 ? g.countries[0] : g.country,
        language: Array.isArray(g.languages) && g.languages.length > 0 ? g.languages[0] : g.language,
        frequency: g.frequency,
        paused: g.paused,
      }));

      await api.brands.configure({
        brandName: selectedBrand,
        keywords: updated,
        platforms: getCurrentBrandPlatforms(),
        frequency: selectedBrandData.frequency || '30m',
        keywordGroups: keywordGroupsForBackend,
      });

      persistGroups(selectedBrand, nextGroups);

      await fetchBrands();
      showMessage('✅ Group deleted successfully', 'success');
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Delete failed', e);
      }
      showMessage(`Failed to delete: ${e?.message || 'Unknown error'}`, 'error');
    }
  };

  const handleEditGroup = async (row) => {
    const editData = {
      groupName: row.groupName,
      keywords: row.keywords || [],
      assignedUsers: row.assignedUsers || [],
    };
    setEditingGroup(editData);
    setGroupName(row.groupName);
    setAndKeywords(row.keywords || []);
    setOrKeywords([]);
    setNotKeywords([]);
    const platformsToUse = row.platformKeys && row.platformKeys.length ? row.platformKeys : (configPlatforms.length > 0 ? configPlatforms : selectedBrandData?.platforms || []);
    setConfigPlatforms(platformsToUse);
    setCountries(row.countries || []);
    setLanguages(row.languages || []);
    setShowConfig(true);
  };

  const handlePauseToggle = async (row) => {
    if (!row?.groupName || !selectedBrand) {
      showMessage("Invalid group", "warning");
      return;
    }

    try {
      const action = row.paused ? "start" : "pause";  // paused → start, running → pause

      const res = await fetch("https://api.eminsights.in/api/search/group/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: selectedBrand,
          groupName: row.groupName,
          action
        })
      });

      const data = await res.json();
      if (!data.success) {
        showMessage(`❌ ${data.message}`, "error");
        return;
      }

      showMessage(`✔️ Group ${row.groupName} is now ${data.status}`, "success");

      // Update UI state
      setKeywordGroups((groups) =>
        groups.map((g) =>
          g.groupName === row.groupName
            ? { ...g, paused: data.paused, status: data.status }
            : g
        )
      );

    } catch (e) {
      console.error(e);
      showMessage("Error toggling group state", "error");
    }
  };


  const handleDuplicateGroup = async (row) => {
    if (!selectedBrandData || !row?.groupName) {
      showMessage('Invalid group data', 'warning');
      return;
    }

    try {
      const baseName = `${row.groupName} (copy)`;
      let newName = baseName;
      let counter = 2;
      const names = new Set((keywordGroups || []).map((g) => g.name));

      while (names.has(newName)) {
        newName = `${baseName} ${counter++}`;
      }

      const dup = {
        name: newName,
        keywords: Array.isArray(row.keywords) ? [...row.keywords] : [],
        platforms: Array.isArray(row.platformKeys) ? [...row.platformKeys] : [],
        countries: Array.isArray(row.countries) ? [...row.countries] : [],
        languages: Array.isArray(row.languages) ? [...row.languages] : [],
        paused: row.paused || false,
      };

      const nextGroups = [...(keywordGroups || []), dup];

      const keywordGroupsForBackend = nextGroups.map((g) => ({
        name: g.name || '',
        keywords: Array.isArray(g.keywords) ? g.keywords : [],
        includeKeywords: Array.isArray(g.includeKeywords) ? g.includeKeywords : [],
        excludeKeywords: Array.isArray(g.excludeKeywords) ? g.excludeKeywords : [],
        assignedUsers: Array.isArray(g.assignedUsers) ? g.assignedUsers : [],
        platforms: Array.isArray(g.platforms) ? g.platforms : [],
        country: Array.isArray(g.countries) && g.countries.length > 0 ? g.countries[0] : g.country,
        language: Array.isArray(g.languages) && g.languages.length > 0 ? g.languages[0] : g.language,
        frequency: g.frequency,
        paused: g.paused,
      }));

      await api.brands.configure({
        brandName: selectedBrand,
        keywords: selectedBrandData.keywords || [],
        platforms: getCurrentBrandPlatforms(),
        frequency: selectedBrandData.frequency || '30m',
        keywordGroups: keywordGroupsForBackend,
      });

      persistGroups(selectedBrand, nextGroups);
      showMessage('✅ Group duplicated successfully', 'success');
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Duplicate failed', e);
      }
      showMessage(`❌ Failed to duplicate group: ${e?.message || 'Unknown error'}`, 'error');
    }
  };

>>>>>>> Stashed changes
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-sm text-gray-400">Loading keywords</div>
        </div>
      }
    >
      <KeywordsPageClient />
    </Suspense>
  );
}
