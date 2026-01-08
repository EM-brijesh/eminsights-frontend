"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaFacebook, FaInstagram } from "react-icons/fa";

const BACKEND = "http://localhost:5050";

export default function ChannelConfigPage() {
  const searchParams = useSearchParams();
  const metaToken = searchParams.get("metaToken");

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [pages, setPages] = useState([]);
  const [error, setError] = useState("");
  const [connectingPage, setConnectingPage] = useState(null);

  /* -------------------- LOGIN -------------------- */

  const handleFacebookLogin = () => {
    setLoadingLogin(true);
    window.location.href = `${BACKEND}/meta/auth/login`;
  };

  /* -------------------- FETCH PAGES -------------------- */

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
          userId: "64f000000000000000000001", // 🔴 replace with real userId
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
    } catch (err) {
      alert(err.message);
    } finally {
      setConnectingPage(null);
    }
  };

  /* -------------------- EFFECT -------------------- */

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

        {/* CARD */}
        <div className="bg-[#101218] p-6 rounded-xl border border-gray-800">

          <div className="flex items-center gap-3 mb-5">
            <FaFacebook className="text-blue-500" size={22} />
            <FaInstagram className="text-pink-500" size={22} />
            <h2 className="text-xl font-semibold">
              Facebook Pages ({pages.length})
            </h2>
          </div>

          {/* STATES */}
          {loadingPages && <p className="text-gray-400">Loading pages...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loadingPages && pages.length === 0 && metaToken && (
            <p className="text-gray-400">No pages found.</p>
          )}

          {/* PAGES */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {pages.map((page) => (
              <div
                key={page.id}
                className="bg-[#161922] border border-gray-800 p-5 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FaFacebook className="text-blue-500" />
                  <h3 className="font-semibold">{page.name}</h3>
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  Page ID: {page.id}
                </p>

                <button
                  onClick={() => connectInstagram(page)}
                  disabled={connectingPage === page.id}
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
      </div>
    </div>
  );
}
