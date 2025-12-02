"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import DottedBackground from "@/components/DottedBackground";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.auth.signin({ email, password });
      // Persist auth for Next middleware
      const maxAge = 120 * 60; // 2 hours auth expiry on 2 hrs
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
      document.cookie = `auth=${data.token}; Max-Age=${maxAge}; Path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      try {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('authToken', data.token);
        sessionStorage.setItem('authToken', data.token);
        window.__authToken = data.token;
      } catch { }
      // Use replace to avoid back to login and ensure cookie is sent
      window.location.replace("/inbox");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black relative">
      <DottedBackground />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-6 border border-gray-700 relative z-10"
      >
        <h2 className="text-3xl font-bold text-center text-white">Login</h2>
        {error && <p className="text-red-400 text-center text-sm">{error}</p>}

        <div>
          <Label htmlFor="email" className="text-white mb-2 block">Email</Label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="password" className="text-white mb-2 block">Password</Label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-2 pr-12 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-black-300 hover:text-white focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-lg font-semibold cursor-pointer transition duration-200 shadow-md ${loading
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-white text-black hover:bg-white/90"
            }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="text-center text-sm">
          <Link href="/auth/forgot" className="text-white hover:underline">Forgot password?</Link>
        </div>

        {/* Signup removed: accounts are created by admins only */}
      </form>
    </div>
  );
}


