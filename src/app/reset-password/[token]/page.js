"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DottedBackground from "@/components/DottedBackground";
import api, { API_BASE_URL } from "@/lib/api";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [isInvalid, setIsInvalid] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("");

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/auth/reset-password/${token}?_=${Date.now()}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.ok && data?.success) {
          setEmailMasked(data.emailMasked || "");
          setIsInvalid(false);
        } else {
          setIsInvalid(true);
          setStatus("This reset link is invalid or has expired.");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("Unable to verify reset link. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setStatus("");
    if (password.length < 6) { setStatus("Password should be at least 6 characters"); return; }
    if (password !== confirm) { setStatus("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, { newPassword: password });
      setStatus("Password updated. Redirecting to login...");
      setIsInvalid(true);
      setTimeout(()=> router.push("/auth/login"), 1200);
    } catch (e) {
      const message = e?.message || "Failed to reset password. Try the link again.";
      if (message.toLowerCase().includes("token") || message.toLowerCase().includes("expired")) {
        setIsInvalid(true);
        setStatus("This reset link is invalid or has expired.");
      } else {
        setStatus(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black relative">
      <DottedBackground />
      <form onSubmit={submit} className="w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-6 border border-gray-700 relative z-10">
        <h2 className="text-2xl font-bold text-center text-white">Set new password</h2>
        {emailMasked && !isInvalid && (
          <p className="text-center text-xs text-gray-400">for {emailMasked}</p>
        )}
        {status && <p className="text-center text-sm text-gray-300">{status}</p>}
        {!isInvalid ? (
          <>
            <input type="password" placeholder="New password" className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white" value={password} onChange={(e)=>setPassword(e.target.value)} required />
            <input type="password" placeholder="Confirm password" className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
            <button type="submit" disabled={loading} className={`w-full py-2 rounded-lg font-semibold cursor-pointer transition duration-200 shadow-md ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-white text-black hover:bg-white/90"}`}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </>
        ) : (
          <div className="text-center">
            <a href="/auth/forgot" className="text-sm text-white underline">Request a new reset link</a>
          </div>
        )}
      </form>
    </div>
  );
}


