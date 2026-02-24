"use client";

import { useEffect, useMemo, useState } from "react";
import { FaFacebook } from "react-icons/fa";
import api from "@/lib/api";
import PlatformBadge from "@/components/PlatformBadge";

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
};

const formatNumber = (num) => {
  if (!num) return 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num;
};

export default function FacebookPostsPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState("");

  const [selectedPageId, setSelectedPageId] = useState("");

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");

  const [facebookPostIdFilter, setFacebookPostIdFilter] = useState("");

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setAccountsLoading(true);
        setAccountsError("");
        const base =
          process.env.NEXT_PUBLIC_API_URL ||
          (typeof window !== "undefined"
            ? `${window.location.protocol}//${window.location.hostname}:${
                process.env.NEXT_PUBLIC_API_PORT || "5000"
              }`
            : "http://localhost:5000");

        const res = await fetch(`${base}/meta/connected-accounts`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load connected accounts");
        }
        const list = data?.accounts || [];
        setAccounts(list);
        if (list.length > 0) {
          setSelectedPageId((prev) => prev || list[0].pageId);
        }
      } catch (err) {
        setAccountsError(err.message || "Unable to load connected accounts");
      } finally {
        setAccountsLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const handleFetchPosts = async () => {
    if (!selectedPageId) {
      setPostsError("Select a Facebook Page first");
      return;
    }

    try {
      setPostsLoading(true);
      setPostsError("");

      const params = {
        pageId: selectedPageId,
        sort: "desc",
        limit: 100,
      };

      if (facebookPostIdFilter.trim()) {
        params.facebookPostId = facebookPostIdFilter.trim();
      }

      const data = await api.facebook.posts(params);
      setPosts(data?.data || []);
    } catch (err) {
      setPostsError(err.message || "Failed to load posts");
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const selectedAccount = useMemo(
    () => accounts.find((acc) => acc.pageId === selectedPageId) || null,
    [accounts, selectedPageId]
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20">
              <FaFacebook className="h-5 w-5 text-blue-500" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">Facebook Page Posts</h1>
              <p className="text-xs text-gray-400">
                Browse stored Facebook posts by connected Page, including brand and keyword-group context.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-800 bg-[#0b0c10] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-100">
                  Connected Facebook Pages
                </h2>
                <span className="text-[11px] text-gray-500">
                  {accountsLoading ? "Loading…" : `${accounts.length} connected`}
                </span>
              </div>

              {accountsError && (
                <div className="mb-3 rounded-lg border border-red-600/40 bg-red-900/30 px-3 py-2 text-xs text-red-300">
                  {accountsError}
                </div>
              )}

              {accounts.length === 0 && !accountsLoading && !accountsError && (
                <p className="text-xs text-gray-500">
                  No Meta pages connected yet. Connect a page in{" "}
                  <span className="font-medium text-gray-300">
                    Settings → Channels
                  </span>
                  .
                </p>
              )}

              {accounts.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-gray-400">
                    Facebook Page
                  </label>
                  <select
                    value={selectedPageId}
                    onChange={(e) => setSelectedPageId(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id || acc.pageId} value={acc.pageId}>
                        {acc.pageName} ({acc.pageId})
                      </option>
                    ))}
                  </select>

                  {selectedAccount && (
                    <p className="mt-2 text-[11px] text-gray-500">
                      Linked brand account:{" "}
                      <span className="font-medium text-gray-200">
                        {selectedAccount.accountLabel ||
                          selectedAccount.pageName}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-800 bg-[#0b0c10] p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-100">
                Filters
              </h2>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">
                    Facebook Post ID (optional)
                  </label>
                  <input
                    type="text"
                    value={facebookPostIdFilter}
                    onChange={(e) => setFacebookPostIdFilter(e.target.value)}
                    placeholder="e.g. 123456789012345_678901234567890"
                    className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-xs outline-none ring-0 placeholder:text-gray-500 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-gray-500">
                    Leave blank to see all posts for the selected Page.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFetchPosts}
                  disabled={postsLoading || !selectedPageId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {postsLoading ? "Loading posts…" : "Load Posts"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#050608] p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-100">
                Stored Facebook Posts
              </h2>
              <div className="text-[11px] text-gray-500">
                {postsLoading
                  ? "Loading…"
                  : posts.length > 0
                  ? `${posts.length} posts`
                  : "No posts loaded"}
              </div>
            </div>

            {postsError && (
              <div className="mb-3 rounded-lg border border-red-600/40 bg-red-900/30 px-3 py-2 text-xs text-red-300">
                {postsError}
              </div>
            )}

            {!postsLoading && posts.length === 0 && !postsError && (
              <div className="py-10 text-center text-xs text-gray-500">
                Select a connected Page and click{" "}
                <span className="font-semibold text-gray-300">
                  Load Posts
                </span>{" "}
                to see stored Facebook content.
              </div>
            )}

            <div className="space-y-3">
              {posts.map((post) => (
                <article
                  key={post._id || post.facebookPostId || post.sourceUrl}
                  className="rounded-xl border border-gray-800 bg-black/40 p-3 text-xs hover:border-gray-600"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform="facebook" size="xs" />
                      <div>
                        <p className="font-medium text-gray-100">
                          {post.metaAccountId?.pageName ||
                            post.author?.name ||
                            "Facebook Page"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Brand:{" "}
                          <span className="font-medium text-gray-200">
                            {post.brand?.brandName || "Unknown"}
                          </span>{" "}
                          · Group:{" "}
                          <span className="font-medium text-gray-200">
                            {post.groupName || "Unknown group"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-gray-500">
                      <p>{formatDate(post.createdAt || post.fetchedAt)}</p>
                      {post.facebookPostId && (
                        <p className="mt-0.5 max-w-[200px] truncate">
                          ID:{" "}
                          <span className="font-mono">
                            {post.facebookPostId}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="mb-2 whitespace-pre-wrap text-[11px] text-gray-100">
                    {post.content?.text || "No text content"}
                  </p>

                  <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
                    <span>👍 {formatNumber(post.metrics?.likes)}</span>
                    <span>💬 {formatNumber(post.metrics?.comments)}</span>
                    <span>↻ {formatNumber(post.metrics?.shares)}</span>
                    {post.keyword && (
                      <span className="rounded-full border border-gray-700 bg-gray-900 px-2 py-0.5 text-[10px] text-gray-300">
                        Keyword: {post.keyword}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
                    <div className="truncate">
                      <span className="text-gray-400">Page ID:</span>{" "}
                      <span className="font-mono text-gray-300">
                        {post.pageId}
                      </span>
                    </div>
                    {post.sourceUrl && (
                      <a
                        href={post.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-blue-400 hover:text-blue-300"
                      >
                        View on Facebook →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

