"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaFacebook, FaInstagram } from "react-icons/fa";

const BACKEND = process.env.NEXT_PUBLIC_API_URL;
const FB_BACKEND = process.env.NEXT_PUBLIC_FB_API_URL || BACKEND;

function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="bg-red-900/30 border border-red-600 text-red-400 p-4 rounded-lg mb-4">
      {message}
    </div>
  );
}

async function parseJsonOrNull(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err ?? "Unknown error");
}

export default function ChannelConfigClient() {
  const searchParams = useSearchParams();
  const metaToken = searchParams.get("metaToken");

  /* -------------------- STATE -------------------- */

  const [loadingLogin, setLoadingLogin] = useState(false);

  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [loadingConnected, setLoadingConnected] = useState(false);

  const [connectingPage, setConnectingPage] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [pagePosts, setPagePosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postError, setPostError] = useState("");

  const [pageIdInput, setPageIdInput] = useState("");
  const [pageNameInput, setPageNameInput] = useState("");
  const [savingPage, setSavingPage] = useState(false);
  const [storedPages, setStoredPages] = useState([]);
  const [loadingStoredPages, setLoadingStoredPages] = useState(false);
  const [storedPagesError, setStoredPagesError] = useState("");
  const [togglingPageId, setTogglingPageId] = useState(null);

  /* -------------------- LOGIN -------------------- */

  const handleFacebookLogin = () => {
    setLoadingLogin(true);
    window.location.href = `${BACKEND}/meta/auth/login`;
  };

  /* -------------------- FETCH CONNECTED ACCOUNTS (DB) -------------------- */

  const fetchConnectedAccounts = async () => {
    try {
      setLoadingConnected(true);

      const res = await fetch(`${BACKEND}/meta/connected-accounts`, {
        cache: "no-store"
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error("Failed to fetch connected accounts");
      }

      setConnectedAccounts(data.accounts || []);
    } catch (err) {
      console.error("Connected accounts error:", getErrorMessage(err));
    } finally {
      setLoadingConnected(false);
    }
  };

  /* -------------------- FETCH FACEBOOK PAGES (META) -------------------- */

  const fetchPages = async (token) => {
    try {
      setLoadingPages(true);
      setError("");

      const res = await fetch(`${BACKEND}/meta/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken: token })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch pages");
      }

      setPages(data.pages || []);
    } catch (err) {
      setError(getErrorMessage(err));
      setPages([]);
    } finally {
      setLoadingPages(false);
    }
  };

  /* -------------------- FETCH FACEBOOK PAGE POSTS -------------------- */

  const fetchFacebookPagePosts = async () => {
    try {
      setLoadingPosts(true);
      setPostError("");

      const res = await fetch(`${BACKEND}/meta/page-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: 10,
          brand: { brandName: "Default Brand" }
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch page posts");
      }

      setPagePosts(data.posts || []);
    } catch (err) {
      setPostError(getErrorMessage(err));
      setPagePosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  /* -------------------- MANUAL FACEBOOK PAGES -------------------- */

  const fetchStoredPages = async () => {
    try {
      setLoadingStoredPages(true);
      setStoredPagesError("");
  
      const res = await fetch(`${FB_BACKEND}/fb/listpages`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
  
      const data = await parseJsonOrNull(res);
      console.log("RAW API DATA:", data);
  
      if (!res.ok) {
        const message =
          (data && (data.error || data.message)) ||
          `Failed to fetch stored pages (status ${res.status})`;
        throw new Error(message);
      }
  
      const pagesArray =
        Array.isArray(data?.pages) && data.pages.length > 0
          ? data.pages
          : Array.isArray(data?.data)
          ? data.data
          : [];
  
      setStoredPages(pagesArray);
      console.log("Fetched stored pages:", pagesArray);
    } catch (err) {
      const msg = getErrorMessage(err);
      console.error("Stored pages error:", msg);
      setStoredPagesError(msg || "Failed to fetch stored pages");
      setStoredPages([]);
    } finally {
      setLoadingStoredPages(false);
    }
  };

  const handleInsertPage = async () => {
    const trimmedPageId = pageIdInput.trim();
    const trimmedPageName = pageNameInput.trim();

    if (!trimmedPageId || !trimmedPageName) {
      setStoredPagesError("Page ID and Page Name are required.");
      return;
    }

    try {
      setSavingPage(true);
      setStoredPagesError("");

      const res = await fetch(`${FB_BACKEND}/fb/add-pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: trimmedPageId,
          pageName: trimmedPageName,
        }),
      });
      const data = await parseJsonOrNull(res);

      if (!res.ok) {
        const message =
          (data && (data.error || data.message)) ||
          `Failed to add page (status ${res.status})`;
        throw new Error(message);
      }

      setPageIdInput("");
      setPageNameInput("");

      setSuccessMessage("✅ Facebook page added successfully.");
      setTimeout(() => setSuccessMessage(""), 5000);

      await fetchStoredPages();
    } catch (err) {
      const msg = getErrorMessage(err);
      console.error("Add page error:", msg);
      setStoredPagesError(msg || "Failed to add page");
    } finally {
      setSavingPage(false);
    }
  };

  const handleToggleStoredPage = async (page) => {
    const documentId = page._id || page.id || page.pageId;

    if (!documentId) {
      setStoredPagesError("Unable to toggle page: missing identifier.");
      return;
    }

    try {
      setTogglingPageId(documentId);
      setStoredPagesError("");

      const res = await fetch(`${FB_BACKEND}/fb/${documentId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      const data = await parseJsonOrNull(res);

      if (!res.ok) {
        const message =
          (data && (data.error || data.message)) ||
          `Failed to toggle page (status ${res.status})`;
        throw new Error(message);
      }

      const updatedPage = data?.data;

      if (updatedPage && (updatedPage._id || updatedPage.id || updatedPage.pageId)) {
        const updatedId = updatedPage._id || updatedPage.id || updatedPage.pageId;

        setStoredPages((prev) =>
          prev.map((p) =>
            (p._id || p.id || p.pageId) === updatedId ? { ...p, ...updatedPage } : p
          )
        );
      } else {
        await fetchStoredPages();
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      console.error("Toggle page error:", msg);
      setStoredPagesError(msg || "Failed to toggle page");
    } finally {
      setTogglingPageId(null);
    }
  };

  /* -------------------- CONNECT INSTAGRAM -------------------- */

  const connectInstagram = async (page) => {
    try {
      setConnectingPage(page.id);

      const res = await fetch(`${BACKEND}/meta/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "64f000000000000000000001",
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to connect Instagram");
      }

      setSuccessMessage(`✅ ${data.data?.instagram?.username ? `@${data.data.instagram.username}` : 'Instagram account'} connected successfully!`);
      setTimeout(() => setSuccessMessage(""), 5000);

      await fetchConnectedAccounts();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setConnectingPage(null);
    }
  };

  /* -------------------- HELPERS -------------------- */

  const formatDate = (date) =>
    new Date(date).toLocaleDateString();

  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const connectedPageIds = new Set(
    connectedAccounts.map((a) => a.pageId)
  );

  /* -------------------- EFFECTS -------------------- */

  useEffect(() => {
    fetchConnectedAccounts();
    fetchStoredPages();
  }, []);

  useEffect(() => {
    if (metaToken) {
      fetchPages(metaToken);
    }
  }, [metaToken]);

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-screen bg-[#0c0e12] text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-bold">Channel Configuration</h1>

          <button
            onClick={handleFacebookLogin}
            disabled={loadingLogin}
            className="bg-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
          >
            <FaFacebook size={18} />
            {loadingLogin ? "Redirecting..." : "Connect Facebook & Instagram"}
          </button>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div className="bg-green-900/30 border border-green-600 text-green-400 p-4 rounded-lg mb-6">
            {successMessage}
          </div>
        )}

        {/* CONNECTED ACCOUNTS (ALWAYS SHOWN) */}
        <div className="bg-[#101218] p-6 rounded-xl border border-gray-800 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaInstagram className="text-pink-500" />
            Connected Accounts ({connectedAccounts.length})
          </h2>

          {loadingConnected && (
            <p className="text-gray-400">Loading connected accounts...</p>
          )}

          {!loadingConnected && connectedAccounts.length === 0 && (
            <div className="text-center py-8">
              <FaInstagram className="text-gray-600 text-5xl mx-auto mb-4" />
              <p className="text-gray-500 text-sm mb-2">
                No accounts connected yet.
              </p>
              <p className="text-gray-600 text-xs">
                Click "Connect Facebook & Instagram" above to get started
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {connectedAccounts.map((acc) => (
              <div
                key={acc._id || acc.id}
                className="bg-[#161922] border border-gray-800 p-6 rounded-xl hover:border-gray-700 transition"
              >
                {/* FACEBOOK PAGE SECTION */}
                <div className="mb-6 pb-6 border-b border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <FaFacebook className="text-blue-500 text-xl" />
                    <h3 className="font-semibold text-lg">Facebook Page</h3>
                  </div>
                  
                  <p className="font-medium text-white mb-1">
                    {acc.pageName}
                  </p>
                  
                  <p className="text-xs text-gray-500">
                    ID: {acc.pageId}
                  </p>
                  
                  <span className="inline-block mt-2 px-3 py-1 bg-green-900/30 text-green-400 text-xs font-semibold rounded-full">
                    ✓ Connected
                  </span>
                </div>

                {/* INSTAGRAM PROFESSIONAL ACCOUNT SECTION */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FaInstagram className="text-pink-500 text-xl" />
                    <h3 className="font-semibold text-lg">Instagram Professional Account</h3>
                  </div>

                  {acc.instagram ? (
                    <div className="flex items-start gap-4">
                      {/* Profile Picture */}
                      {acc.instagram.profile_picture ? (
                        <img
                          src={acc.instagram.profile_picture}
                          alt={acc.instagram.username}
                          className="w-16 h-16 rounded-full border-2 border-pink-500"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <FaInstagram className="text-white text-2xl" />
                        </div>
                      )}

                      {/* Instagram Details */}
                      <div className="flex-1">
                        <p className="font-semibold text-white text-lg mb-1">
                          @{acc.instagram.username}
                        </p>
                        
                        {acc.instagram.name && (
                          <p className="text-gray-400 text-sm mb-2">
                            {acc.instagram.name}
                          </p>
                        )}

                        <div className="flex gap-4 text-sm text-gray-400">
                          {acc.instagram.followers_count !== undefined && (
                            <span className="font-medium">
                              {formatNumber(acc.instagram.followers_count)} followers
                            </span>
                          )}
                          {acc.instagram.media_count !== undefined && (
                            <span>
                              {formatNumber(acc.instagram.media_count)} posts
                            </span>
                          )}
                        </div>

                        <span className="inline-block mt-3 px-3 py-1 bg-green-900/30 text-green-400 text-xs font-semibold rounded-full">
                          ✓ Connected
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
                      <p className="text-yellow-400 text-sm font-medium mb-2">
                        ⚠️ No Instagram Professional account connected
                      </p>
                      <p className="text-gray-400 text-xs mb-3">
                        This Facebook Page doesn't have an Instagram Professional (Business or Creator) account linked.
                      </p>
                      <a
                        href="https://www.facebook.com/help/instagram/399237934150902"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-xs hover:underline"
                      >
                        Learn how to connect Instagram to your Page →
                      </a>
                    </div>
                  )}

                  {/* Additional Info */}
                  <p className="text-gray-600 text-xs mt-4">
                    Connected on: {formatDate(acc.connectedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* META PAGES (OAUTH FLOW) */}
        {metaToken && (
          <div className="bg-[#101218] p-6 rounded-xl border border-gray-800 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaFacebook className="text-blue-500" />
              Available Facebook Pages ({pages.length})
            </h2>

            {loadingPages && (
              <p className="text-gray-400">Loading pages...</p>
            )}
            <ErrorBanner message={error} />

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {pages.map((page) => {
                const isConnected = connectedPageIds.has(page.id);
                
                return (
                  <div
                    key={page.id}
                    className="bg-[#161922] border border-gray-800 p-5 rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold mb-1">{page.name}</h3>
                        <p className="text-xs text-gray-500">ID: {page.id}</p>
                        {page.category && (
                          <p className="text-xs text-gray-600 mt-1">
                            {page.category}
                          </p>
                        )}
                      </div>
                    </div>

                    {isConnected ? (
                      <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-3 text-center">
                        <p className="text-green-400 text-sm font-semibold">
                          ✅ Already Connected
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => connectInstagram(page)}
                        disabled={connectingPage === page.id}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <FaInstagram />
                        {connectingPage === page.id
                          ? "Connecting..."
                          : "Connect Instagram"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FACEBOOK PAGES (MANUAL) */}
        <div className="bg-[#101218] p-6 rounded-xl border border-gray-800 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaFacebook className="text-blue-500" />
            Facebook Pages (Manual)
          </h2>

          <p className="text-sm text-gray-400 mb-4">
            Manually register Facebook pages using their Page ID and name. This calls
            <code className="mx-1 bg-black/40 px-1 py-0.5 rounded text-xs">/fb/add-pages</code>
            and lists all stored pages from
            <code className="mx-1 bg-black/40 px-1 py-0.5 rounded text-xs">/fb/listpages</code>.
          </p>

          <div className="grid md:grid-cols-[2fr,2fr,1fr] gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Page ID
              </label>
              <input
                value={pageIdInput}
                onChange={(e) => setPageIdInput(e.target.value)}
                placeholder="119317973454"
                className="w-full bg-[#161922] border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Page Name
              </label>
              <input
                value={pageNameInput}
                onChange={(e) => setPageNameInput(e.target.value)}
                placeholder="Dainik Jaagran"
                className="w-full bg-[#161922] border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleInsertPage}
                disabled={savingPage}
                className="w-full bg-blue-600 px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {savingPage ? "Inserting..." : "Insert Page"}
              </button>
            </div>
          </div>

          <ErrorBanner message={storedPagesError} />

          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                Stored Pages ({storedPages.length})
              </h3>
              {loadingStoredPages && (
                <p className="text-xs text-gray-400">Refreshing...</p>
              )}
            </div>

            {!loadingStoredPages && storedPages.length === 0 && (
              <p className="text-gray-500 text-sm">
                No pages added yet. Use the form above to insert your first page.
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {storedPages.map((page) => {
                const id = page.pageId || page.id;
                const documentId = page._id || page.id || page.pageId;
                const name = page.pageName || page.name || "Untitled Page";
                const profilePicture =
                  page.profilePicture ||
                  (id
                    ? `https://graph.facebook.com/${id}/picture?type=square&width=200&height=200`
                    : null);
                const isActive =
                  typeof page.isActive === "boolean" ? page.isActive : true;

                return (
                  <div
                    key={id || name}
                    className="bg-[#161922] border border-gray-800 p-4 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative w-12 h-12 flex-shrink-0">
                        {profilePicture ? (
                          <img
                            src={profilePicture}
                            alt={name}
                            className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover"
                            onError={(e) => {
                              // Hide image and show fallback icon
                              e.target.style.display = 'none';
                              const fallback = e.target.parentElement.querySelector('.fb-fallback-icon');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="fb-fallback-icon w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center border-2 border-blue-500 absolute inset-0"
                          style={{ display: profilePicture ? 'none' : 'flex' }}
                        >
                          <FaFacebook className="text-white text-xl" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white mb-1 truncate">{name}</p>
                        {id && (
                          <p className="text-xs text-gray-500 mb-1">ID: {id}</p>
                        )}
                        {documentId && (
                          <button
                            onClick={() => handleToggleStoredPage(page)}
                            disabled={togglingPageId === documentId}
                            className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition ${
                              isActive
                                ? "bg-green-900/30 border-green-500 text-green-300"
                                : "bg-gray-800 border-gray-600 text-gray-300"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full mr-2 ${
                                isActive ? "bg-green-400" : "bg-gray-400"
                              }`}
                            />
                            {togglingPageId === documentId
                              ? "Updating..."
                              : isActive
                              ? "Selected"
                              : "Not Selected"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FACEBOOK PAGE POSTS */}
        <div className="bg-[#101218] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaFacebook className="text-blue-500" />
              Facebook Page Posts
            </h2>

            <button
              onClick={fetchFacebookPagePosts}
              disabled={loadingPosts}
              className="bg-blue-600 px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loadingPosts ? "Fetching..." : "Fetch Posts"}
            </button>
          </div>

          <ErrorBanner message={postError} />

          {!loadingPosts && pagePosts.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              No Facebook posts fetched yet. Click "Fetch Posts" to load posts.
            </p>
          )}

          <div className="space-y-4 mt-4">
            {pagePosts.map((post) => (
              <div
                key={post.facebookPostId}
                className="bg-[#161922] border border-gray-800 p-4 rounded-lg hover:border-gray-700 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-300">
                    {post.author?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(post.createdAt)}
                  </p>
                </div>

                <p className="text-sm mb-3 whitespace-pre-wrap text-gray-200">
                  {post.content?.text || "No text content"}
                </p>

                <div className="flex gap-4 text-xs text-gray-400 mb-3">
                  <span>👍 {post.metrics?.likes || 0}</span>
                  <span>💬 {post.metrics?.comments || 0}</span>
                  <span>🔁 {post.metrics?.shares || 0}</span>
                </div>

                <a
                  href={post.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-xs hover:underline inline-flex items-center gap-1"
                >
                  View on Facebook →
                </a>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}