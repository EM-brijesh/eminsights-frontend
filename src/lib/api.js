/**
 * API Configuration and Helper Functions
 * Central place to manage all API calls to the backend
 */

import axios from "axios";

// Get the API base URL from environment variables
// For development, we'll use localhost:5000 directly to avoid env var issues
export const API_BASE_URL = typeof window !== 'undefined'
  ? (
      process.env.NEXT_PUBLIC_API_URL ||
      `${window.location.protocol}//${window.location.hostname}:${process.env.NEXT_PUBLIC_API_PORT || '5000'}`
    )
  : `http://localhost:${process.env.NEXT_PUBLIC_API_PORT || '5000'}`;

const AUTH_COOKIE_NAME = 'auth';
const AUTH_STORAGE_KEY = 'authToken';

const readAuthCookie = () => {
  if (typeof document === 'undefined') return '';
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]+)`)
    );
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
};

const readStoredToken = () => {
  if (typeof window === 'undefined') return '';
  const safeRead = (storage) => {
    try {
      return storage?.getItem(AUTH_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  };
  return safeRead(window.localStorage) || safeRead(window.sessionStorage);
};

const cacheToken = (token) => {
  if (!token || typeof window === 'undefined') return;
  try {
    window.__authToken = token;
  } catch {}
};

export const getAuthToken = () => {
  if (typeof window === 'undefined') return '';

  const cached = (() => {
    try {
      return window.__authToken;
    } catch {
      return '';
    }
  })();

  if (cached && typeof cached === 'string') {
    return cached;
  }

  const token = readAuthCookie() || readStoredToken();
  cacheToken(token);
  return token;
};

/* ------------------------------------------------------------------
   🔥 CREATE AXIOS INSTANCE
------------------------------------------------------------------ */
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, //fix 1-brijesh
});

const PLATFORM_KEY_TO_BACKEND = {
  youtube: 'youtube',
  reddit: 'reddit',
  quora: 'reddit',
  google: 'google',
  instagram: 'instagram',
  facebook: 'facebook',
  news: 'google',
  twitter: 'twitter',
};

const normalizePlatformsList = (platforms) =>
  Array.isArray(platforms)
    ? Array.from(new Set(platforms.map((platform) => PLATFORM_KEY_TO_BACKEND[platform] || platform).filter(Boolean)))
    : platforms;

const normalizeKeywordGroupsPayload = (data) => {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data.platforms)) {
    data.platforms = normalizePlatformsList(data.platforms);
  }

  if (Array.isArray(data.keywordGroups)) {
    data.keywordGroups = data.keywordGroups.map((group) => {
      if (group && typeof group === 'object' && Array.isArray(group.platforms)) {
        return {
          ...group,
          platforms: normalizePlatformsList(group.platforms),
        };
      }
      return group;
    });
  }

  return data;
};

/* ------------------------------------------------------------------
   🔥 GLOBAL FIX ADDED HERE
   Prevent frontend from sending keywordGroups accidentally
   to ANY endpoint except /add-keywordgrp
------------------------------------------------------------------ */
axiosInstance.interceptors.request.use((config) => {
  if (config.data && typeof config.data === "object") {
    const allowKeywordGroupsEndpoints = ["/api/brands/configure", "/api/brands/keywordconfig"];
    const allowsKeywordGroups = allowKeywordGroupsEndpoints.some((endpoint) => config.url?.includes(endpoint));
    if (!allowsKeywordGroups) {
      delete config.data.keywordGroups;
    } else {
      normalizeKeywordGroupsPayload(config.data);
    }
  }
  return config;
});

/**
 * Helper function to make API requests using axiosInstance
 */
export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();

  try {
    const response = await axiosInstance({
      url: endpoint,
      method: options.method || "GET",
      data: options.body ? JSON.parse(options.body) : undefined,
      params: options.params,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    let message = error?.response?.data?.message || error.message || "API error";
    throw new Error(message);
  }
}

/**
 * Full API Object (unchanged)
 */
export const api = {
  auth: {
    signin: (payload) =>
      apiRequest("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    forgotPassword: (payload) =>
      apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    resetPassword: (token, payload) =>
      apiRequest(`/api/auth/reset-password/${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  health: () => apiRequest("/health"),

  brands: {
    getAll: () => apiRequest("/api/brands/all"),
    getByUser: (email) =>
      apiRequest(`/api/brands/user/${encodeURIComponent(email)}`),
    getAssigned: (email) =>
      apiRequest(`/api/brands/assigned/${encodeURIComponent(email)}`),

    deletePost: (postId) =>
      apiRequest(`/api/brands/delete/${encodeURIComponent(postId)}`, {
        method: "DELETE",
      }),

    create: (data) =>
      apiRequest("/api/brands/create", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    configure: (data) =>
      apiRequest("/api/brands/configure", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    delete: (brandName) =>
      apiRequest("/api/brands/delete", {
        method: "POST",
        body: JSON.stringify({ brandName }),
      }),

    assignUsers: (brandName, users) =>
      apiRequest("/api/brands/assign-users", {
        method: "POST",
        body: JSON.stringify({ brandName, users }),
      }),

    addKeywordconfig: (data) =>
      apiRequest("/api/brands/keywordconfig", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deletePost: (postId) =>
      apiRequest(`/api/brands/delete/${encodeURIComponent(postId)}`, {
        method: "DELETE",
      }),
  },

  search: {
    recent: (data) =>
      apiRequest("/api/search/recent", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    historical: (data) =>
      apiRequest("/api/search/historical", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    runForBrand: (data) =>
      apiRequest("/api/search/run", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    runBrandSearch: (data) =>
      apiRequest("/api/search/brandsearch", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  dashboard: {
    getPosts: (params) =>
      apiRequest("/api/search/data", { params }),
    getKeywords: (brandName) =>
      apiRequest(`/api/search/keywords?brandName=${encodeURIComponent(brandName)}`),
  },

  data: {
    userPosts: (params) =>
      apiRequest("/api/data/user-posts", { params }),
    getData: (params) =>
      apiRequest("/api/data/refreshbrand", { params }),
  },

  facebook: {
    posts: (params) =>
      apiRequest("/api/facebook/posts", { params }),
  },

  channels: {
    list: (brandName) =>
      apiRequest(`/api/channels/list?brandName=${encodeURIComponent(brandName)}`),

    connect: (data) =>
      apiRequest("/api/channels/connect", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    reauthorize: (data) =>
      apiRequest("/api/channels/reauthorize", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    remove: (data) =>
      apiRequest("/api/channels/delete", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  users: {
    create: (data) =>
      apiRequest("/api/users/create", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  sentiment: {
    analyze: (posts) =>
      apiRequest("/api/sentiment/analyze", {
        method: "POST",
        body: JSON.stringify({ posts }),
      }),
    save: (posts) =>
      apiRequest("/api/sentiment/save", {
        method: "POST",
        body: JSON.stringify({ posts }),
      }),
    check: (posts) =>
      apiRequest("/api/sentiment/check", {
        method: "POST",
        body: JSON.stringify({ posts }),
      }),
    summary: (params) =>
      apiRequest("/api/sentiment/summary", {
        params,
      }),
    manualUpdate: (postId, sentiment) => {
      const allowed = ["positive", "neutral", "negative"];
      const normalizedSentiment =
        typeof sentiment === "string" ? sentiment.toLowerCase() : "";

      if (!postId) {
        throw new Error("Post ID is required to update sentiment");
      }

      if (!allowed.includes(normalizedSentiment)) {
        throw new Error("Invalid sentiment value");
      }

      return apiRequest("/api/sentiment/manual", {
        method: "PATCH",
        body: JSON.stringify({ postId, sentiment: normalizedSentiment }),
      });
    },
  },
};

export default api;