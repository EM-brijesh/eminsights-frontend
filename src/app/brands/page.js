'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import DottedBackground from '@/components/DottedBackground';
import PlatformBadge from '@/components/PlatformBadge';
import Image from 'next/image';
import Link from 'next/link';
import { Search, RefreshCw, Trash, Check, X } from 'lucide-react';

// Debug utility - only logs in development or when explicitly enabled
const debug = (() => {
  const isDebugEnabled = () => {
    if (typeof window === 'undefined') return process.env.NODE_ENV !== 'production';
    try {
      return process.env.NODE_ENV !== 'production' || localStorage.getItem('debug_brands') === '1';
    } catch {
      return false;
    }
  };

  return {
    log: (...args) => { if (isDebugEnabled()) console.log('[Brands]', ...args); },
    warn: (...args) => { if (isDebugEnabled()) console.warn('[Brands]', ...args); },
    error: (...args) => console.error('[Brands]', ...args), // Always log errors
  };
})();

// Utility to normalize assigned users from various possible formats
const normalizeAssignedUsers = (brand) => {
  if (!brand) return [];

  // Try multiple possible field names (assignedUsers, users, members, etc.)
  const possible = brand.assignedUsers || brand.users || brand.members || [];

  if (Array.isArray(possible)) {
    return possible
      .map(u => typeof u === 'string' ? u : (u?.email || ''))
      .filter(Boolean)
      .map(email => String(email).toLowerCase().trim());
  }

  if (possible && typeof possible === 'object') {
    const email = possible.email || '';
    return email ? [String(email).toLowerCase().trim()] : [];
  }

  return typeof possible === 'string' ? [String(possible).toLowerCase().trim()] : [];
};

// Utility for safe file upload handling
const handleFileUpload = (e, onSuccess, options = {}) => {
  const {
    maxSize = 1024 * 1024, // 1MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    onError = (msg) => {
      if (typeof window !== 'undefined') {
        window?.console?.error?.('[Brands][FileUpload]', msg);
      }
    }
  } = options;

  try {
    const file = e.target?.files?.[0];

    // Validate file exists
    if (!file) {
      debug.log('No file selected');
      return;
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      const allowed = allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ');
      onError(`Invalid file type. Please upload: ${allowed}`);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      const sizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      onError(`File too large. Maximum size: ${sizeMB}MB`);
      return;
    }

    // Validate file size is not zero
    if (file.size === 0) {
      onError('File is empty. Please choose a valid file.');
      return;
    }

    // Read file safely
    const reader = new FileReader();

    reader.onerror = () => {
      debug.error('Failed to read file:', reader.error);
      onError('Failed to read file. Please try again.');
    };

    reader.onload = () => {
      try {
        const result = reader.result;

        // Validate result
        if (!result || typeof result !== 'string') {
          onError('Invalid file data. Please try again.');
          return;
        }

        // Validate base64 format
        if (!result.startsWith('data:image/')) {
          onError('Invalid image format. Please upload a valid image.');
          return;
        }

        debug.log('File uploaded successfully:', file.name, `(${(file.size / 1024).toFixed(1)}KB)`);
        onSuccess(String(result));
      } catch (err) {
        debug.error('Error processing file:', err);
        onError('Failed to process file. Please try again.');
      }
    };

    reader.readAsDataURL(file);

  } catch (err) {
    debug.error('File upload error:', err);
    onError('An error occurred. Please try again.');
  } finally {
    // Clear input so same file can be selected again if needed
    if (e.target) e.target.value = '';
  }
};

// simple local chips input component with accessibility improvements
function Chips({ value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  // Normalize all existing values to ensure consistency (defensive normalization)
  // This ensures we always work with normalized emails internally
  const normalizedValue = (value || []).map(v => String(v).toLowerCase().trim()).filter(Boolean);

  const add = () => {
    const t = input.trim().toLowerCase(); // Normalize to lowercase
    if (!t) return;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(t)) {
      setError('Please enter a valid email address');
      return;
    }

    // Case-insensitive check to prevent duplicates
    if (!normalizedValue.includes(t)) {
      // Always add normalized email to maintain consistency
      const newValue = [...normalizedValue, t];
      onChange(newValue);
      setInput('');
      setError('');
    } else {
      // Email already exists, show feedback
      setError('This email is already in the list');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2" role="list" aria-label="Assigned users">
        {normalizedValue.map((v, idx) => (
          <span key={v} role="listitem" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-800 border border-gray-700">
            {v}
            <button
              type="button"
              onClick={() => { onChange(normalizedValue.filter(x => x !== v)); setError(''); }}
              className="text-gray-400 hover:text-white"
              aria-label={`Remove ${v}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div>
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="w-full h-10 px-3 bg-gray-800 border border-gray-700 rounded-md text-white text-sm placeholder-gray-400"
          aria-label={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'chips-error' : undefined}
        />
        {error && (
          <div id="chips-error" role="alert" className="mt-1 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

const createInitialNewBrandState = () => ({
  brandName: '',
  description: '',
  frequency: '30m',
  avatarUrl: '',
  country: '',
  aiFriendlyName: '',
  brandColor: '#4f46e5',
  ticketCreation: false,
  guidelines: ''
});

const createInitialConfigData = () => ({
  keywords: '',
  frequency: '30m',
  avatarUrl: '',
  platforms: {
    twitter: false,
    youtube: false,
    reddit: false
  },
  aiFriendlyName: '',
  description: '',
  country: '',
  brandColor: '#4f46e5',
  ticketCreation: false,
  users: []
});

const MESSAGE_VARIANTS = {
  success: 'bg-emerald-900/30 border-emerald-500/60 text-emerald-100',
  error: 'bg-red-900/30 border-red-500/60 text-red-100',
  warning: 'bg-amber-900/30 border-amber-500/60 text-amber-100',
  info: 'bg-blue-900/30 border-blue-500/60 text-blue-100',
};

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState({ type: null, text: '' });
  const actionMessageTimerRef = useRef(null);
  const [actionLoading, setActionLoading] = useState(false);
  // Finite state machine for modal: 'none' | 'create' | { type: 'edit', brandName: string }
  const [modalState, setModalState] = useState('none');
  const [searchText, setSearchText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Modal state helpers
  const isCreateModalOpen = modalState === 'create';
  const isEditModalOpen = typeof modalState === 'object' && modalState.type === 'edit';
  const getEditBrandName = () => typeof modalState === 'object' && modalState.type === 'edit' ? modalState.brandName : null;
  const openCreateModal = () => setModalState('create');
  const openEditModal = (brandName) => setModalState({ type: 'edit', brandName });
  const closeModal = () => setModalState('none');

  // Utility function for case-insensitive brand name comparison
  const compareBrandNames = (name1, name2) => {
    if (!name1 || !name2) return false;
    return String(name1).toLowerCase().trim() === String(name2).toLowerCase().trim();
  };

  // Find brand by name (case-insensitive)
  const findBrandByName = (brandsList, brandName) => {
    if (!brandsList || !Array.isArray(brandsList) || !brandName) return null;
    return brandsList.find(b => compareBrandNames(b.brandName, brandName));
  };

  const clearActionBannerTimer = useCallback(() => {
    if (actionMessageTimerRef.current) {
      clearTimeout(actionMessageTimerRef.current);
      actionMessageTimerRef.current = null;
    }
  }, []);

  const clearActionBanner = useCallback(() => {
    clearActionBannerTimer();
    setActionMessage({ type: null, text: '' });
  }, [clearActionBannerTimer]);

  const showActionBanner = useCallback(
    (text, type = 'info') => {
      clearActionBannerTimer();
      setActionMessage({ type, text });
      actionMessageTimerRef.current = setTimeout(() => {
        setActionMessage({ type: null, text: '' });
        actionMessageTimerRef.current = null;
      }, 5000);
    },
    [clearActionBannerTimer],
  );

  useEffect(() => {
    return () => {
      clearActionBannerTimer();
    };
  }, [clearActionBannerTimer]);

  // Create brand form state
  const [newBrand, setNewBrand] = useState(() => createInitialNewBrandState());
  const [assignedUsers, setAssignedUsers] = useState([]); // simple chips input (strings)

  // Configure brand form state
  const [configData, setConfigData] = useState(() => createInitialConfigData());

  // Memoized fetchBrands function to avoid recreating on every render
  const fetchBrands = useCallback(async ({ withSpinner = false, allowLoadingReset = false } = {}) => {
    let shouldResetSpinner = false;
    try {
      if (withSpinner) {
        shouldResetSpinner = true;
        setLoading(true);
      }
      // Get user info from localStorage or cookie
      let user = null;
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const parsedUser = JSON.parse(userStr);
          // Create new object instead of mutating - normalize email to lowercase for consistency
          user = parsedUser?.email ? {
            ...parsedUser,
            email: String(parsedUser.email).toLowerCase().trim()
          } : parsedUser;
        }
      } catch (e) { }

      // If user is admin, try to get all brands; fallback to user's assigned brands if access denied
      let data;
      if (user?.role === 'admin') {
        try {
          data = await api.brands.getAll();
          debug.log('Fetched all brands (admin)');
        } catch (adminErr) {
          // If admin access fails, fallback to user-specific brands
          debug.warn('Admin access failed, falling back to user brands:', adminErr.message);
          if (user?.email) {
            // Email already normalized above
            data = await api.brands.getByUser(user.email);
          } else {
            throw new Error('User not authenticated');
          }
        }
      } else if (user?.email) {
        // Email already normalized above
        data = await api.brands.getByUser(user.email);
        debug.log('Fetched user brands');
      } else {
        throw new Error('User not authenticated. Please login again.');
      }

      const brandsList = data.brands || [];
      debug.log('Fetched brands count:', brandsList.length);

      // Normalize assignedUsers using utility function
      const normalizedBrands = brandsList.map(b => ({
        ...b,
        assignedUsers: normalizeAssignedUsers(b)
      }));

      setBrands(normalizedBrands);
      setError(null);
      clearActionBanner();
    } catch (err) {
      debug.error('Failed to fetch brands:', err);
      setError(err.message);
      clearActionBanner();
    } finally {
      if (shouldResetSpinner || allowLoadingReset) {
        setLoading(false);
      }
    }
  }, [clearActionBanner]);

  useEffect(() => {
    // Get current user info
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        // Create new object instead of mutating - normalize email to lowercase for consistency
        const user = parsedUser?.email ? {
          ...parsedUser,
          email: String(parsedUser.email).toLowerCase().trim()
        } : parsedUser;
        setCurrentUser(user);
      }
    } catch (e) {
      debug.error('Failed to get user from localStorage:', e);
    }
    fetchBrands({ allowLoadingReset: true });
  }, [fetchBrands]);
  console.log(brands)

  // Memoized filtered list by brand name or allocated user fields - recalculates only when brands or searchText changes
  const visibleBrands = useMemo(() => {
    return (brands || []).filter((brand) => {
      const q = searchText.trim().toLowerCase();
      if (!q) return true;

      // Use normalized assigned users for search
      const userEmails = normalizeAssignedUsers(brand).join(' ');

      const haystack = [
        brand.brandName,
        brand.description,
        userEmails
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [brands, searchText]);

  const handleCreateBrand = useCallback(async (e) => {
    e.preventDefault();

    // Check loading state and prevent concurrent operations
    let isProcessing = false;
    setLoading((currentLoading) => {
      isProcessing = currentLoading;
      return currentLoading ? currentLoading : true;
    });

    if (isProcessing) {
      debug.log('Already processing, ignoring duplicate create request');
      return;
    }

    try {
      // Capture current state to avoid stale closure issues
      const brandDataSnapshot = { ...newBrand };
      // Normalize emails to lowercase for consistency
      const assignedUsersSnapshot = assignedUsers.map(u => String(u).trim().toLowerCase());

      // Create brand with assigned users if provided
      const brandData = {
        ...brandDataSnapshot,
        assignedUsers: assignedUsersSnapshot.length > 0 ? assignedUsersSnapshot : []
      };

      const createResult = await api.brands.create(brandData);
      debug.log('Brand created:', createResult?.brand?.brandName);

      if (!createResult?.success) {
        throw new Error(createResult?.message || 'Failed to create brand');
      }

      // Use the brand name from the API response if available, otherwise use what we sent
      const createdBrandName = createResult?.brand?.brandName || brandDataSnapshot.brandName;

      // If users were provided, also assign them (in case create doesn't handle it)
      if (assignedUsersSnapshot.length > 0) {
        try {
          // assignedUsersSnapshot is already normalized
          const assignResult = await api.brands.assignUsers(createdBrandName, assignedUsersSnapshot);
          if (!assignResult?.success) {
            debug.warn('Brand created but user assignment failed:', assignResult?.message);
          }
        } catch (assignErr) {
          debug.warn('Brand created but user assignment failed:', assignErr);
        }
      }

      // Wait for brands list to refresh before closing form
      await fetchBrands();

      // Only reset state and close form after all operations complete
      setNewBrand(createInitialNewBrandState());
      setAssignedUsers([]);
      closeModal();
      showActionBanner('✅ Brand created successfully!', 'success');
    } catch (err) {
      debug.error('Brand creation error:', err);
      showActionBanner(`Failed to create brand: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [assignedUsers, newBrand, fetchBrands, showActionBanner]);

  const handleDeleteBrand = useCallback(async (brandName) => {
    console.log("handleDeleteBrand triggered with:", brandName);

    if (!brandName) return;

    const brandToDelete = findBrandByName(brands, brandName);

    if (!brandToDelete) {
      showActionBanner(`Brand "${brandName}" not found. Please refresh the page.`, 'warning');
      return;
    }

    const exactBrandName = brandToDelete.brandName;
    const confirmed = window.confirm(
      `Permanently delete brand "${exactBrandName}"? This action cannot be undone.`
    );
    console.log("Confirm result:", confirmed);
    if (!confirmed) return;
    try {
      showActionBanner('Deleting brand…', 'info');

      // LOG what we are sending
      console.log("➡️ Sending delete request for brandName:", exactBrandName);

      const res = await api.brands.delete(exactBrandName);

      // LOG response fully
      console.log("⬅️ Delete API response:", res);

      if (!res || !res.success) {
        throw new Error((res && res.message) || 'Delete failed (no success flag)');
      }

      // Remove locally with a safe case-insensitive compare
      setBrands(prev =>
        prev.filter(b => String(b.brandName).toLowerCase() !== String(exactBrandName).toLowerCase())
      );

      closeModal();
      showActionBanner(`✅ Brand "${exactBrandName}" deleted successfully.`, 'success');

    } catch (err) {
      console.error('Delete failed:', err);
      showActionBanner(`Delete failed: ${err.message}`, 'error');
    } finally {
      try {
        await fetchBrands();
      } catch (refetchErr) {
        console.error('Refetch after delete failed:', refetchErr);
      }
    }
  }, [brands, fetchBrands, showActionBanner]);


  const handleConfigureBrand = useCallback(async (e, brandName) => {
    e.preventDefault();

    // Check loading state and prevent multiple submissions
    let isProcessing = false;
    setLoading((currentLoading) => {
      isProcessing = currentLoading;
      return currentLoading ? currentLoading : true;
    });

    if (isProcessing) {
      debug.log('Already processing, ignoring duplicate submission');
      return;
    }

    try {
      // Capture current state values to avoid stale closures
      const currentConfigDataSnapshot = { ...configData };
      const currentUserSnapshot = currentUser;

      // Use the provided brandName parameter (which comes from form submission)
      // This avoids relying on modalState from closure
      const exactBrandName = brandName;

      // Read from the latest brands array
      const currentBrandSnapshot = findBrandByName(brands, exactBrandName);

      if (!currentBrandSnapshot) {
        throw new Error(`Brand "${exactBrandName}" not found in current list. Please refresh and try again.`);
      }

      const brandNameToUse = currentBrandSnapshot.brandName; // Use the exact casing from database
      debug.log('Configuring brand:', brandNameToUse);

      const selectedPlatforms = Object.keys(currentConfigDataSnapshot.platforms).filter(
        p => currentConfigDataSnapshot.platforms[p]
      );
      const keywords = currentConfigDataSnapshot.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k);

      // Configure brand (keywords, platforms, etc.) - use brand name with correct casing
      await api.brands.configure({
        brandName: brandNameToUse,
        keywords,
        platforms: selectedPlatforms,
        frequency: currentConfigDataSnapshot.frequency,
        avatarUrl: currentConfigDataSnapshot.avatarUrl || undefined,
        aiFriendlyName: currentConfigDataSnapshot.aiFriendlyName || undefined,
        description: currentConfigDataSnapshot.description || undefined,
        country: currentConfigDataSnapshot.country || undefined,
        brandColor: currentConfigDataSnapshot.brandColor || undefined,
        ticketCreation: !!currentConfigDataSnapshot.ticketCreation
      });

      // Always update user assignments if admin (even if empty array to remove users)
      if (currentUserSnapshot?.role === 'admin') {
        const usersToAssign = Array.isArray(currentConfigDataSnapshot.users)
          ? currentConfigDataSnapshot.users.map(u => String(u).trim().toLowerCase()).filter(Boolean)
          : [];

        debug.log('Assigning users:', usersToAssign.length, 'user(s)');

        try {
          const assignResult = await api.brands.assignUsers(brandNameToUse, usersToAssign);

          if (!assignResult?.success) {
            throw new Error(assignResult?.message || 'Assignment failed');
          }

          debug.log('User assignment successful');
        } catch (assignErr) {
          debug.error('Failed to assign users during configure:', assignErr);
          throw new Error(`Failed to assign users: ${assignErr.message}`);
        }
      }

      // Refresh brands list to get updated data
      debug.log('Refreshing brands list after configuration...');
      await fetchBrands();

      // Only close form and reset state after all async operations complete
      closeModal();
      setConfigData(createInitialConfigData());
      showActionBanner('✅ Brand configured successfully!', 'success');
    } catch (err) {
      debug.error('Failed to configure brand:', err);
      showActionBanner(`Failed to configure brand: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [brands, configData, currentUser, fetchBrands, showActionBanner]);

  // Separate function to assign users to a brand (can also remove users by passing empty array)
  const handleAssignUsers = useCallback(async (brandName, users) => {
    // Check loading state and prevent concurrent operations
    let isProcessing = false;
    setLoading((currentLoading) => {
      isProcessing = currentLoading;
      return currentLoading ? currentLoading : true;
    });

    if (isProcessing) {
      debug.log('Already processing, ignoring duplicate assignment request');
      return;
    }

    try {
      // Get fresh brands list via functional update to avoid stale closure
      let brandToAssign = null;
      setBrands((currentBrands) => {
        brandToAssign = findBrandByName(currentBrands, brandName);
        return currentBrands; // Don't modify, just read
      });

      if (!brandToAssign) {
        throw new Error(`Brand "${brandName}" not found. Please refresh the page.`);
      }

      const exactBrandName = brandToAssign.brandName; // Use exact casing from database

      // Normalize all emails to lowercase before sending
      const usersToAssign = Array.isArray(users)
        ? users.map(u => String(u).trim().toLowerCase()).filter(Boolean)
        : [];
      debug.log('Updating user assignments for brand:', exactBrandName, '| Users:', usersToAssign.length);

      const result = await api.brands.assignUsers(exactBrandName, usersToAssign);

      if (!result?.success) {
        throw new Error(result?.message || 'Assignment failed');
      }

      // Wait for fetch to complete before showing success message
      await fetchBrands();

      showActionBanner(
        usersToAssign.length === 0
          ? '✅ All users removed from brand successfully!'
          : '✅ Users assigned successfully!',
        'success'
      );
    } catch (err) {
      debug.error('Failed to assign users:', err);
      showActionBanner(`Failed to update user assignments: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchBrands, showActionBanner]);

  const openConfigure = useCallback((brand) => {
    const mappedPlatforms = {
      youtube: brand.platforms?.includes('youtube') || false,
      twitter: brand.platforms?.includes('twitter') || false,
      reddit: brand.platforms?.includes('reddit') || false,
    };

    // Use utility function to normalize assigned users
    const usersArray = normalizeAssignedUsers(brand);

    setConfigData({
      ...createInitialConfigData(),
      keywords: (brand.keywords || []).join(', '),
      frequency: brand.frequency || '30m',
      avatarUrl: brand.avatarUrl || '',
      platforms: mappedPlatforms,
      aiFriendlyName: brand.aiFriendlyName || brand.brandName || '',
      description: brand.description || '',
      country: brand.country || '',
      brandColor: brand.brandColor || '#4f46e5',
      ticketCreation: !!brand.ticketCreation,
      users: usersArray
    });
    openEditModal(brand.brandName);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <DottedBackground />
        <div className="relative z-10">Loading brands...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 relative">
      <DottedBackground />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Edit Brand - Fullscreen overlay like Create */}
        {isEditModalOpen && (() => {
          const editBrandName = getEditBrandName();
          return (
            <div className="fixed inset-0 z-50 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="config-form-title">
              <div className="absolute inset-0 bg-black/60" onClick={closeModal} aria-label="Close dialog" />
              <div className="relative z-10 w-[96vw] max-w-6xl mx-auto bg-black border border-white/10 rounded-xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 id="config-form-title" className="text-xl font-semibold">Edit Brand — {editBrandName}</h2>
                  <div className="flex items-center gap-2">
                    <Button onClick={closeModal} className="bg-gray-800 hover:bg-gray-700 h-9 px-3 text-sm" aria-label="Close edit brand dialog">Close</Button>
                  </div>
                </div>
                <form onSubmit={(e) => handleConfigureBrand(e, editBrandName)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden">
                          {configData.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={configData.avatarUrl} alt={editBrandName || 'Brand'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-sm font-semibold">{(editBrandName || 'B').slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="config-avatar" className="text-sm mb-1.5 inline-block">Upload Brand Logo</Label>
                          <input
                            id="config-avatar"
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleFileUpload(
                                e,
                                (avatarUrl) => setConfigData((prev) => ({ ...prev, avatarUrl })),
                                { onError: (msg) => showActionBanner(msg, 'error') }
                              )
                            }
                            className="block text-sm text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"
                            aria-label="Upload brand logo image file"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="config-country" className="text-sm mb-1.5 inline-block">Country</Label>
                        <Input id="config-country" value={configData.country} onChange={(e) => setConfigData({ ...configData, country: e.target.value })} className="bg-gray-800 border-gray-700 text-white h-11 px-4 text-sm rounded-lg" placeholder="India" aria-label="Brand country" />
                      </div>
                      <div>
                        <Label htmlFor="config-brand-color" className="text-sm mb-1.5 inline-block">Select Brand Color</Label>
                        <div className="flex items-center gap-3">
                          <input id="config-brand-color" type="color" value={configData.brandColor} onChange={(e) => setConfigData((prev) => ({ ...prev, brandColor: e.target.value }))} className="h-10 w-10 p-0 border border-gray-700 rounded" aria-label="Select brand color using color picker" />
                          <input value={configData.brandColor} onChange={(e) => setConfigData((prev) => ({ ...prev, brandColor: e.target.value }))} className="bg-gray-800 border border-gray-700 text-white h-10 px-3 text-sm rounded-lg w-28" aria-label="Brand color hex code" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="config-keywords" className="text-sm mb-1.5 inline-block">Keywords (comma-separated)</Label>
                        <Input id="config-keywords" value={configData.keywords} onChange={(e) => setConfigData({ ...configData, keywords: e.target.value })} className="bg-gray-800 border-gray-700 text-white h-11 px-4 text-sm rounded-lg" placeholder="nike, sports, shoes" aria-label="Brand monitoring keywords" />
                      </div>
                      <div>
                        <Label htmlFor="config-frequency" className="text-sm mb-1.5 inline-block">Monitoring Frequency</Label>
                        <select id="config-frequency" value={configData.frequency} onChange={(e) => setConfigData({ ...configData, frequency: e.target.value })} className="w-full h-11 px-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" aria-label="Brand monitoring frequency">
                          <option value="5m">Every 5 Minutes</option>
                          <option value="30m">Every 30 Minutes (Default)</option>
                          <option value="1h">Every 1 Hour</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 inline-block">Ticket Creation</Label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setConfigData((prev) => ({ ...prev, ticketCreation: !prev.ticketCreation }))}
                            className={`w-12 h-6 rounded-full relative ${configData.ticketCreation ? 'bg-emerald-600' : 'bg-gray-700'}`}
                            role="switch"
                            aria-checked={configData.ticketCreation}
                            aria-label="Toggle ticket creation"
                          >
                            <span className={`absolute top-0.5 ${configData.ticketCreation ? 'left-6' : 'left-0.5'} transition-all w-5 h-5 rounded-full bg-white flex items-center justify-center`}>
                              {configData.ticketCreation ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <X className="w-3 h-3 text-gray-700" />
                              )}
                            </span>
                          </button>
                          <span className="text-xs text-gray-400">
                            {configData.ticketCreation ? 'Enabled' : 'Disabled'} - Enable ticket creation for this brand.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="config-ai-name" className="text-sm mb-1.5 inline-block">AI Friendly Name</Label>
                        <div className="flex items-center gap-2">
                          <Input id="config-ai-name" value={configData.aiFriendlyName} onChange={(e) => setConfigData({ ...configData, aiFriendlyName: e.target.value })} className="flex-1 bg-gray-800 border-gray-700 text-white h-11 px-4 text-sm rounded-lg" placeholder="Brand friendly name" aria-label="AI friendly brand name" />
                          <Button type="button" onClick={() => setConfigData({ ...configData, description: `${configData.aiFriendlyName || editBrandName} is a brand.` })} className="bg-fuchsia-600 hover:bg-fuchsia-700 h-10 px-3 text-sm" aria-label="Generate brand description automatically">Generate Description</Button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="config-description" className="text-sm mb-1.5 inline-block">Brand Description</Label>
                        <div className="relative">
                          <textarea id="config-description" value={configData.description} onChange={(e) => setConfigData({ ...configData, description: e.target.value })} rows={6} className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-3" placeholder="Describe your brand..." aria-label="Brand description" maxLength={200} />
                          <span className="absolute right-2 bottom-2 text-xs text-gray-400" aria-live="polite">{(configData.description || '').length}/200</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm mb-2 block">Platforms</Label>
                        <div className="flex gap-3 flex-wrap" role="group" aria-label="Select monitoring platforms">
                          {['youtube', 'twitter', 'reddit'].map((platform) => {
                            const map = { youtube: { icon: '/youtube-logo.svg', name: 'YouTube', w: 32, h: 32 }, twitter: { icon: '/x-logo.svg', name: 'X (Twitter)', w: 28, h: 28 }, reddit: { icon: '/reddit-logo.svg', name: 'Reddit', w: 32, h: 32 } };
                            const cfg = map[platform]; const isSel = configData.platforms[platform];
                            return (
                              <button
                                key={platform}
                                type="button"
                                onClick={() => setConfigData({ ...configData, platforms: { ...configData.platforms, [platform]: !configData.platforms[platform] } })}
                                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all min-w-[112px] ${isSel ? 'bg-white/10 border-white shadow-lg' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}`}
                                role="checkbox"
                                aria-checked={isSel}
                                aria-label={`${isSel ? 'Deselect' : 'Select'} ${cfg.name} platform`}
                              >
                                <Image src={cfg.icon} alt="" width={cfg.w} height={cfg.h} />
                                <span className={`text-xs font-semibold ${isSel ? 'text-white' : 'text-gray-400'}`}>{cfg.name}</span>
                                {isSel && <Check className="w-4 h-4 text-white" aria-hidden="true" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {currentUser?.role === 'admin' && (
                        <div>
                          <Label className="text-sm mb-1.5 inline-block">Assign Users (by Email)</Label>
                          <Chips
                            value={configData.users || []}
                            onChange={(v) => {
                              debug.log('Updating assigned users:', v.length, 'user(s)');
                              setConfigData({ ...configData, users: v });
                            }}
                            placeholder="Type email address and press Enter"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    {currentUser?.role === 'admin' && (
                      <Button
                        type="button"
                        className="bg-red-600 hover:bg-red-700 h-10 px-4 inline-flex items-center gap-2"
                        onClick={() => handleDeleteBrand(getEditBrandName())}
                        disabled={loading}
                      >
                        <Trash className="w-4 h-4" />
                        Delete Brand
                      </Button>
                    )}
                    {currentUser?.role !== 'admin' && <div />}
                    <div className="flex gap-2">
                      <Button type="button" onClick={closeModal} className="bg-gray-800 hover:bg-gray-700 h-10 px-4" disabled={loading}>Cancel</Button>
                      <Button type="submit" className="bg-white text-black hover:bg-white/90 h-10 px-4" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Brand'}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Brand Management</h1>
            <p className="text-gray-400">Manage your brands, keywords, and monitoring platforms</p>
          </div>
        </div>

        {/* Search Bar under header with Create Brand on the right */}
        <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative w-full md:max-w-md flex items-center gap-2">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              placeholder="Search by brand name or assigned user email"
              className="w-full h-10 pl-9 pr-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-400"
              aria-label="Search brands"
            />
            <Button
              type="button"
              onClick={() => setSearchText((s) => s.trim())}
              className="h-10 px-4 bg-white text-black hover:bg-white/90 text-sm rounded-lg"
            >
              Search
            </Button>
            <Button
              type="button"
              onClick={() => fetchBrands({ withSpinner: true })}
              variant="outline"
              size="icon"
              aria-label="Refresh brands"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          {currentUser?.role === 'admin' && (
            <Button onClick={openCreateModal} className="bg-white text-black hover:bg-white/90 w-full md:w-auto">+ Create Brand</Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-900/20 border-red-700 text-white mb-6">
            <CardContent className="pt-6">
              <p className="text-red-200">Error: {error}</p>
            </CardContent>
          </Card>
        )}
        {actionMessage.text && !error && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-4 ${MESSAGE_VARIANTS[actionMessage.type] || MESSAGE_VARIANTS.info
              }`}
            role="status"
            aria-live="polite"
          >
            <p className="leading-5 whitespace-pre-line flex-1">{actionMessage.text}</p>
            <button
              type="button"
              onClick={clearActionBanner}
              aria-label="Dismiss message"
              className="text-white/70 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Create Brand - Fullscreen Overlay */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="create-form-title">
            <div className="absolute inset-0 bg-black/60" onClick={closeModal} aria-label="Close dialog" />
            <div className="relative z-10 w-[96vw] max-w-6xl mx-auto bg-black border border-white/10 rounded-xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 id="create-form-title" className="text-xl font-semibold">Create Brand</h2>
                <Button onClick={closeModal} className="bg-gray-800 hover:bg-gray-700 h-9 px-3 text-sm" aria-label="Close create brand dialog">Close</Button>
              </div>
              <form onSubmit={handleCreateBrand}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden">
                        {newBrand.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={newBrand.avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-sm font-semibold">{(newBrand.brandName || 'B').slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="avatar" className="text-sm mb-1.5 inline-block">Upload Brand Logo</Label>
                        <input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileUpload(
                              e,
                              (avatarUrl) => setNewBrand((prev) => ({ ...prev, avatarUrl })),
                              { onError: (msg) => showActionBanner(msg, 'error') }
                            )
                          }
                          className="block text-sm text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"
                          aria-label="Upload brand logo image file"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="create-brand-name" className="text-sm mb-1.5 inline-block">Brand Name *</Label>
                      <Input id="create-brand-name" value={newBrand.brandName} onChange={(e) => setNewBrand((prev) => ({ ...prev, brandName: e.target.value }))} required className="bg-gray-800 border-gray-700 text-white h-11 px-4 text-sm rounded-lg" placeholder="Enter brand name" aria-label="Brand name (required)" aria-required="true" />
                    </div>
                    <div>
                      <Label htmlFor="create-country" className="text-sm mb-1.5 inline-block">Country</Label>
                      <Input id="create-country" value={newBrand.country} onChange={(e) => setNewBrand((prev) => ({ ...prev, country: e.target.value }))} className="bg-gray-800 border-gray-700 text-white h-11 px-4 text-sm rounded-lg" placeholder="India" aria-label="Brand country" />
                    </div>
                    <div>
                      <Label htmlFor="create-brand-color" className="text-sm mb-1.5 inline-block">Select Brand Color</Label>
                      <div className="flex items-center gap-3">
                        <input id="create-brand-color" type="color" value={newBrand.brandColor} onChange={(e) => setNewBrand((prev) => ({ ...prev, brandColor: e.target.value }))} className="h-10 w-10 p-0 border border-gray-700 rounded" aria-label="Select brand color using color picker" />
                        <input value={newBrand.brandColor} onChange={(e) => setNewBrand((prev) => ({ ...prev, brandColor: e.target.value }))} className="bg-gray-800 border border-gray-700 text-white h-10 px-3 text-sm rounded-lg w-28" aria-label="Brand color hex code" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 inline-block">Enable ticket creation</Label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setNewBrand((prev) => ({ ...prev, ticketCreation: !prev.ticketCreation }))}
                          className={`w-12 h-6 rounded-full relative ${newBrand.ticketCreation ? 'bg-emerald-600' : 'bg-gray-700'}`}
                          role="switch"
                          aria-checked={newBrand.ticketCreation}
                          aria-label="Toggle ticket creation"
                        >
                          <span className={`absolute top-0.5 ${newBrand.ticketCreation ? 'left-6' : 'left-0.5'} transition-all w-5 h-5 rounded-full bg-white flex items-center justify-center`}>
                            {newBrand.ticketCreation ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <X className="w-3 h-3 text-gray-700" />
                            )}
                          </span>
                        </button>
                        <span className="text-xs text-gray-400">
                          {newBrand.ticketCreation ? 'Enabled' : 'Disabled'} - By enabling ticket creation, tickets will be created based on mention.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="create-ai-name" className="text-sm mb-1.5 inline-block">AI Friendly Name</Label>
                      <Input id="create-ai-name" value={newBrand.aiFriendlyName} onChange={(e) => setNewBrand((prev) => ({ ...prev, aiFriendlyName: e.target.value }))} className="bg-gray-800 border-gray-700 text-white h-11 px-4 text-sm rounded-lg" placeholder="Brand friendly name" aria-label="AI friendly brand name" />
                    </div>
                    <div>
                      <Label htmlFor="create-description" className="text-sm mb-1.5 inline-block">Brand Description</Label>
                      <textarea id="create-description" value={newBrand.description} onChange={(e) => setNewBrand((prev) => ({ ...prev, description: e.target.value }))} rows={6} className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-3" placeholder="Describe your brand..." aria-label="Brand description" />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 inline-block">Assign Users (by Email)</Label>
                      <Chips value={assignedUsers} onChange={setAssignedUsers} placeholder="Type email address and press Enter" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Label htmlFor="create-guidelines" className="text-sm mb-1.5 inline-block">Brand Engagement Guidelines</Label>
                  <textarea id="create-guidelines" value={newBrand.guidelines} onChange={(e) => setNewBrand((prev) => ({ ...prev, guidelines: e.target.value }))} rows={4} className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-3" placeholder="Enter brand engagement guidelines..." aria-label="Brand engagement guidelines" />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" onClick={closeModal} className="bg-gray-800 hover:bg-gray-700 h-10 px-4" disabled={loading}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 h-10 px-4" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Brand'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Brands Table (polished) */}
        <div className="bg-black border border-white/10 rounded-lg overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Brand Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Users</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Channels Configured</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Keywords/Topics</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Created On</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Ticket Creation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleBrands.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-6 text-center text-gray-400">No matching brands. Adjust your search.</td>
                  </tr>
                ) : (
                  visibleBrands.map((brand) => (
                    <tr key={brand._id} className="border-t border-gray-800">
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center">
                            {brand.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={brand.avatarUrl} alt={brand.brandName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-gray-400 font-semibold">{(brand.brandName || 'B').slice(0, 1).toUpperCase()}</span>
                            )}
                          </span>
                          <span className="text-white">{brand.brandName}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {(() => {
                          // Use utility function to get normalized users
                          const usersArray = normalizeAssignedUsers(brand);

                          if (usersArray.length > 0) {
                            return (
                              <div className="flex flex-col gap-1">
                                {usersArray.slice(0, 2).map((email, idx) => (
                                  <span key={idx} className="text-xs text-gray-400">{email}</span>
                                ))}
                                {usersArray.length > 2 && (
                                  <span className="text-xs text-gray-500">+{usersArray.length - 2} more</span>
                                )}
                              </div>
                            );
                          }
                          return <span className="text-gray-500">No users assigned</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href="/settings/channel-config"
                          className="text-white hover:underline"
                        >
                          Configure Channels
                        </Link>
                        <div className="flex gap-1 mt-1">
                          {(brand.platforms || []).map((p, idx) => (
                            <PlatformBadge key={idx} platform={p} size="xs" />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {/* Keywords/Topics count with accessible tooltip */}
                        <div
                          className="relative inline-block group"
                          tabIndex={0}
                          aria-describedby={`keywords-tooltip-${brand._id}`}
                        >
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-white border border-white/40"
                            title={(() => {
                              if (!Array.isArray(brand.keywordGroups) || brand.keywordGroups.length === 0) {
                                return "No keyword groups";
                              }

                              // Show only group names inside title
                              const names = brand.keywordGroups
                                .map(g => g.groupName || g.name || "Unnamed Group")
                                .filter(Boolean);

                              return (
                                names.slice(0, 5).join(", ") +
                                (names.length > 5 ? ` and ${names.length - 5} more` : "")
                              );
                            })()}
                          >
                            {Array.isArray(brand.keywordGroups) ? brand.keywordGroups.length : 0}
                          </span>


                          <div
                            id={`keywords-tooltip-${brand._id}`}
                            role="tooltip"
                            className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 transform -translate-y-1 group-hover:translate-y-0 group-focus:translate-y-0 absolute left-1/2 -translate-x-1/2 mt-2 w-72 max-w-[80vw] bg-gray-900 border border-white/10 text-sm text-gray-200 rounded shadow-lg p-3 z-20"
                            style={{ pointerEvents: 'auto' }}
                          >
                            {(() => {
                              if (!Array.isArray(brand.keywordGroups) || brand.keywordGroups.length === 0) {
                                return (
                                  <div className="text-xs text-gray-400">
                                    No keyword groups configured for this brand.
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-3 max-h-64 overflow-auto">
                                  {brand.keywordGroups.map((group, index) => (
                                    <div key={index} className="border-b border-white/10 pb-2 last:border-none">
                                      <div className="text-xs font-semibold mb-1">
                                        {group.groupName || group.name || "Unnamed Group"}
                                        {" "}
                                        ({Array.isArray(group.keywords) ? group.keywords.length : 0})
                                      </div>

                                      {Array.isArray(group.keywords) && group.keywords.length > 0 ? (
                                        <ul className="space-y-0.5 pl-3">
                                          {group.keywords.map((kw, i) => (
                                            <li key={i} className="text-xs leading-snug break-words">
                                              • {String(kw).trim()}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <div className="text-xs text-gray-400 pl-3">No keywords</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{brand.createdAt ? new Date(brand.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-10 h-5 rounded-full relative ${brand.ticketCreation ? 'bg-emerald-600' : 'bg-gray-700'}`}
                            role="img"
                            aria-label={brand.ticketCreation ? 'Ticket creation enabled' : 'Ticket creation disabled'}
                          >
                            <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center ${brand.ticketCreation ? 'left-[1.25rem]' : 'left-0.5'} transition-all`}>
                              {brand.ticketCreation ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <X className="w-2.5 h-2.5 text-gray-700" />
                              )}
                            </span>
                          </div>
                          <span className="sr-only">{brand.ticketCreation ? 'Enabled' : 'Disabled'}</span>
                          <span className="text-xs text-gray-400">{brand.ticketCreation ? 'On' : 'Off'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-700/50">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => openConfigure(brand)}
                          className="text-white hover:underline focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black rounded px-2 py-1"
                          aria-label={`Edit ${brand.brandName}`}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Old list view hidden */}
        {false && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleBrands.length === 0 ? (
              <Card className="bg-gray-900 border-gray-700 text-white col-span-full">
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-400">No matching brands. Adjust your search.</p>
                </CardContent>
              </Card>
            ) : (
              visibleBrands.map((brand) => (
                <Card key={brand._id} className="bg-gray-900 border-gray-700 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center">
                          {brand.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brand.avatarUrl} alt={brand.brandName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-gray-400 font-semibold">{(brand.brandName || 'B').slice(0, 1).toUpperCase()}</span>
                          )}
                        </span>
                        {brand.brandName}
                      </span>
                      <span className="text-xs bg-white text-black px-2 py-1 rounded">
                        {brand.frequency || 'daily'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {brand.description && (
                      <p className="text-gray-400 text-sm mb-4">{brand.description}</p>
                    )}

                    <div className="space-y-3">
                      {/* Keywords */}
                      <div>
                        <p className="text-sm font-semibold text-gray-300 mb-1">Keywords:</p>
                        <div className="flex flex-wrap gap-2">
                          {brand.keywords && brand.keywords.length > 0 ? (
                            brand.keywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-800 px-2 py-1 rounded text-white"
                              >
                                {keyword}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">No keywords yet</span>
                          )}
                        </div>
                      </div>

                      {/* Platforms */}
                      <div>
                        <p className="text-sm font-semibold text-gray-300 mb-1">Platforms:</p>
                        <div className="flex flex-wrap gap-2">
                          {brand.platforms && brand.platforms.length > 0 ? (
                            brand.platforms.map((platform, idx) => (
                              <PlatformBadge key={idx} platform={platform} size="sm" />
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">No platforms yet</span>
                          )}
                        </div>
                      </div>

                      {/* Configure Button */}
                      <Button
                        onClick={() => openConfigure(brand)}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white mt-4"
                      >
                        Configure
                      </Button>

                      {/* Configure Form */}
                      {false && (
                        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                          <form onSubmit={(e) => handleConfigureBrand(e, brand.brandName)}>
                            <div className="space-y-4">
                              {/* Avatar change */}
                              <div>
                                <Label className="text-sm mb-1.5 inline-block">Avatar</Label>
                                <div className="flex items-center gap-4">
                                  <span className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700 overflow-hidden flex items-center justify-center">
                                    {(configData.avatarUrl || brand.avatarUrl) ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={configData.avatarUrl || brand.avatarUrl} alt={brand.brandName} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-xs text-gray-400 font-semibold">{(brand.brandName || 'B').slice(0, 1).toUpperCase()}</span>
                                    )}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, (avatarUrl) => setConfigData({ ...configData, avatarUrl }))}
                                    className="block text-sm text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor={`keywords-${brand._id}`} className="text-sm mb-1.5 inline-block">
                                  Keywords (comma-separated)
                                </Label>
                                <Input
                                  id={`keywords-${brand._id}`}
                                  value={configData.keywords}
                                  onChange={(e) =>
                                    setConfigData({ ...configData, keywords: e.target.value })
                                  }
                                  placeholder="nike, sports, shoes"
                                  className="bg-gray-700 border-gray-600 text-white text-sm h-10 px-3 rounded-lg"
                                />
                              </div>

                              <div>
                                <Label htmlFor={`frequency-${brand._id}`} className="text-sm mb-1.5 inline-block">
                                  Monitoring Frequency
                                </Label>
                                <select
                                  id={`frequency-${brand._id}`}
                                  value={configData.frequency}
                                  onChange={(e) =>
                                    setConfigData({ ...configData, frequency: e.target.value })
                                  }
                                  className="w-full h-10 px-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                                >
                                  <option value="5m">Every 5 Minutes</option>
                                  <option value="30m">Every 30 Minutes (Default)</option>
                                  <option value="1h">Every 1 Hour</option>
                                </select>
                              </div>

                              <div>
                                <Label className="text-sm mb-2 block">Platforms</Label>
                                <div className="flex gap-3 flex-wrap">
                                  {['youtube', 'twitter', 'reddit'].map((platform) => {
                                    const platformConfig = {
                                      youtube: {
                                        icon: '/youtube-logo.svg',
                                        name: 'YouTube',
                                        width: 32,
                                        height: 32
                                      },
                                      twitter: {
                                        icon: '/x-logo.svg',
                                        name: 'X (Twitter)',
                                        width: 28,
                                        height: 28
                                      },
                                      reddit: {
                                        icon: '/reddit-logo.svg',
                                        name: 'Reddit',
                                        width: 32,
                                        height: 32
                                      }
                                    };
                                    const config = platformConfig[platform];
                                    const isSelected = configData.platforms[platform];

                                    return (
                                      <button
                                        key={platform}
                                        type="button"
                                        onClick={() =>
                                          setConfigData({
                                            ...configData,
                                            platforms: {
                                              ...configData.platforms,
                                              [platform]: !configData.platforms[platform]
                                            }
                                          })
                                        }
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 min-w-[112px] ${isSelected
                                          ? 'bg-white/10 border-white shadow-lg'
                                          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                          }`}
                                      >
                                        <Image
                                          src={config.icon}
                                          alt={config.name}
                                          width={config.width}
                                          height={config.height}
                                          className="object-contain"
                                          style={{ filter: 'grayscale(0.2) brightness(0.9)' }}
                                        />
                                        <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-400'
                                          }`}>
                                          {config.name}
                                        </span>
                                        {isSelected && (
                                          <span className="text-xs text-white">✓</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Click to select/deselect platforms</p>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  className="flex-1 bg-white text-black hover:bg-white/90 h-10 text-sm rounded-lg"
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => setShowConfigureForm(null)}
                                  className="flex-1 bg-gray-700 hover:bg-gray-600 h-10 text-sm rounded-lg"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}