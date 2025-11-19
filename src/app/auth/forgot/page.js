"use client";

import { useState } from "react";
import Link from "next/link";
import DottedBackground from "@/components/DottedBackground";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      await api.auth.forgotPassword({ email });
      setStatus("If an account exists, a reset link has been sent to your email.");
    } catch (e) {
      setStatus("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black relative">
      <DottedBackground />
      <form onSubmit={submit} className="w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-6 border border-gray-700 relative z-10">
        <h2 className="text-2xl font-bold text-center text-white">Reset your password</h2>
        {status && <p className="text-center text-sm text-gray-300">{status}</p>}
        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
        <button type="submit" disabled={loading} className={`w-full py-2 rounded-lg font-semibold cursor-pointer transition duration-200 shadow-md ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-white text-black hover:bg-white/90"}`}>
          {loading ? "Sending..." : "Send reset link"}
        </button>
        <div className="text-center text-sm text-gray-400">
          <Link href="/auth/login" className="text-white hover:underline">Back to login</Link>
        </div>
      </form>
    </div>
  );
}


