"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaFacebook, FaInstagram } from "react-icons/fa";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

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
      console.error("Connected accounts error:", err.message);
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
      setError(err.message);
      setPages([]);
    } finally {
      setLoadingPages(false);
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

      alert("Instagram account connected successfully ✅");

      await fetchConnectedAccounts();
    } catch (err) {
      alert(err.message);
    } finally {
      setConnectingPage(null);
    }
  };

  /* -------------------- HELPERS -------------------- */

  const formatDate = (date) =>
    new Date(date).toLocaleDateString();

  const connectedPageIds = new Set(
    connectedAccounts.map((a) => a.pageId)
  );

  /* -------------------- EFFECTS -------------------- */

  // Always load DB data
  useEffect(() => {
    fetchConnectedAccounts();
  }, []);

  // Load Meta pages only when token exists
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
            {loadingLogin ? "Redirecting..." : "Add Meta Channel"}
          </button>
        </div>

        {/* CONNECTED ACCOUNTS (ALWAYS SHOWN) */}
        <div className="bg-[#101218] p-6 rounded-xl border border-gray-800 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaInstagram className="text-pink-500" />
            Connected Instagram Accounts ({connectedAccounts.length})
          </h2>

          {loadingConnected && (
            <p className="text-gray-400">Loading connected accounts...</p>
          )}

          {!loadingConnected && connectedAccounts.length === 0 && (
            <p className="text-gray-500 text-sm">
              No Instagram accounts connected yet.
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {connectedAccounts.map((acc) => (
              <div
                key={acc._id}
                className="bg-[#161922] border border-gray-800 p-5 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FaFacebook className="text-blue-500" />
                  <FaInstagram className="text-pink-500" />
                  <h3 className="font-semibold">{acc.pageName}</h3>
                </div>

                <p className="text-xs text-gray-400">
                  Page ID: {acc.pageId}
                </p>

                <p className="text-green-500 text-sm mt-2">
                  ✅ Instagram Connected
                </p>

                <p className="text-gray-400 text-xs">
                  IG Business ID: {acc.instagramBusinessId}
                </p>

                <p className="text-gray-500 text-xs">
                  Connected on: {formatDate(acc.connectedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* META PAGES (OAUTH FLOW) */}
        {metaToken && (
          <div className="bg-[#101218] p-6 rounded-xl border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaFacebook className="text-blue-500" />
              Facebook Pages ({pages.length})
            </h2>

            {loadingPages && (
              <p className="text-gray-400">Loading pages...</p>
            )}
            {error && <p className="text-red-500">{error}</p>}

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="bg-[#161922] border border-gray-800 p-5 rounded-xl"
                >
                  <h3 className="font-semibold mb-2">{page.name}</h3>

                  {connectedPageIds.has(page.id) && (
                    <p className="text-green-500 text-sm mb-2">
                      ✅ Already connected
                    </p>
                  )}

                  <button
                    onClick={() => connectInstagram(page)}
                    className="bg-pink-600 px-4 py-2 rounded-md hover:bg-pink-700 transition text-sm font-semibold"
                  >
                    {connectingPage === page.id
                      ? "Connecting..."
                      : "Connect Instagram"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
