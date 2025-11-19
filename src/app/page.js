// landing page of the app where user will see login button 
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DottedBackground from "@/components/DottedBackground";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const hasToken = document.cookie.includes('auth=');
      setIsLoggedIn(hasToken);
      if (hasToken) {
        // If already authenticated, take the user straight to Inbox
        router.replace('/inbox');
      }
    }
  }, [router]);
  //dummy data

  return (
    <div className="min-h-screen bg-black text-white relative">
      <DottedBackground />
      <div className="relative z-10 px-6 py-24 md:py-32 mx-auto max-w-7xl text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
          Social Monitoring Made Simple
        </h1>
        
        <div className="mt-12 flex items-center justify-center gap-4">
          {!isLoggedIn ? (
            <Link href="/auth/login" className="px-7 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-base font-semibold">
              Login
            </Link>
          ) : (
            <button
              onClick={() => router.push('/inbox')}
              className="px-7 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-base font-semibold"
            >
              Go to Inbox
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
