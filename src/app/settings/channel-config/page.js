"use client";

import { useEffect, useState } from "react";
import { FaFacebook, FaInstagram } from "react-icons/fa";

const BACKEND = "https://api.eminsights.in ";

export default function ChannelConfigPage() {
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  const [pages, setPages] = useState([]);
  const [error, setError] = useState("");

  // Facebook OAuth login
  const handleFacebookLogin = () => {
    setLoadingLogin(true);
    window.location.href = `${BACKEND}/auth/meta/login`;
  };

  // Fetch Facebook Pages + IG account
  const fetchPages = async () => {
    try {
      setLoadingPages(true);
      const res = await fetch(`${BACKEND}/api/pages`, {
        credentials: "include",
      });

      const data = await res.json();

      if (res.status !== 200) {
        setError(data.error || "Failed to fetch pages.");
        setPages([]);
      } else {
        const result = data.data || data || [];
        setPages(result);
      }
    } catch (err) {
      setError("Server error");
      setPages([]);
    } finally {
      setLoadingPages(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0e12] text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-bold">Channel Configuration</h1>

          <button
            onClick={handleFacebookLogin}
            disabled={loadingLogin}
            className="bg-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow"
          >
            <FaFacebook size={18} />
            {loadingLogin ? "Processing..." : "Add Channel"}
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-[#101218] p-6 rounded-xl shadow-lg border border-gray-800">
          <div className="flex items-center gap-3 mb-5">
            <FaFacebook size={24} className="text-blue-600" />
            <FaInstagram size={24} className="text-pink-500" />
            <h2 className="text-xl font-semibold">
              Facebook & Instagram Profiles ({pages.length})
            </h2>
          </div>

          {/* Loading */}
          {loadingPages && <p className="text-gray-400">Loading pages...</p>}

          {/* Error */}
          {error && <p className="text-red-500">Error: {error}</p>}

          {/* No Pages */}
          {!loadingPages && pages.length === 0 && !error && (
            <p className="text-gray-400">No connected profiles found.</p>
          )}

          {/* Pages List */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {pages.map((p) => (
              <div
                key={p.id}
                className="bg-[#161922] border border-gray-800 p-5 rounded-xl relative"
              >
                {/* Page Header */}
                <div className="flex items-center gap-3 mb-1">
                  <FaFacebook size={22} className="text-blue-500" />
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                </div>

                <p className="text-xs text-gray-400 mb-3">Page ID: {p.id}</p>

                {/* Instagram Info Block */}
                {p.instagram ? (
                  <div className="bg-[#1a1e27] p-4 rounded-lg border border-gray-700 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaInstagram size={20} className="text-pink-500" />
                      <h4 className="font-semibold">Instagram Account Connected</h4>
                    </div>

                    <p className="text-sm text-gray-300">
                      <span className="text-gray-400">Username:</span> @{p.instagram.username}
                    </p>

                    <p className="text-sm text-gray-300">
                      <span className="text-gray-400">Instagram ID:</span> {p.instagram.id}
                    </p>

                    <button
                      onClick={() => (window.location.href = "/hashtag-search")}
                      className="mt-3 bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition text-sm font-semibold"
                    >
                      Continue to Hashtag Search →
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#1a1e27] p-4 rounded-lg border border-gray-700 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaInstagram size={20} className="text-gray-500" />
                      <h4 className="font-semibold text-gray-300">Instagram Not Connected</h4>
                    </div>

                    <button
                      onClick={() =>
                        window.open(
                          `https://www.facebook.com/${p.id}/settings/?tab=linked_accounts`,
                          "_blank"
                        )
                      }
                      className="bg-[#232733] px-4 py-2 rounded-md border border-gray-600 hover:bg-[#2b2f3a] transition text-sm"
                    >
                      Connect Instagram
                    </button>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    "User Comments",
                    "User Post",
                    "Mentioned Comment",
                    "Public Comment",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-[#1e212b] px-3 py-1 rounded-full border border-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button className="bg-[#1e212b] px-4 py-2 rounded-md border border-gray-700 hover:bg-[#232733] transition">
                    Reauthorize
                  </button>

                  <button className="bg-red-600 px-4 py-2 rounded-md hover:bg-red-700 transition">
                    Delete
                  </button>
                </div>

                {/* Owned Tag */}
                <div className="absolute top-4 right-4">
                  <span className="text-xs bg-green-700 px-3 py-1 rounded-full">
                    Owned
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
