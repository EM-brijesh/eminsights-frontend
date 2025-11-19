# Updated File Examples - Using Backend on Port 5000

## Example 1: Login Page (src/app/page.js)

```javascript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DottedBackground from "@/components/DottedBackground";
import api from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Using the new API helper
      await api.auth.login({ email, password });
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the component
}
```

---

## Example 2: Dashboard Page (src/app/dashboard/page.js)

**Before:**
```javascript
const fetchCollections = async () => {
  try {
    const res = await fetch('/api/collections');
    const data = await res.json();
    setSearches(data.collections || []);
  } catch (err) {
    console.error('Failed to load collections:', err);
  }
};
```

**After:**
```javascript
import api from "@/lib/api";

const fetchCollections = async () => {
  try {
    const data = await api.collections.getAll();
    setSearches(data.collections || []);
  } catch (err) {
    console.error('Failed to load collections:', err);
  }
};
```

**Alternative (Direct fetch with env variable):**
```javascript
const fetchCollections = async () => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/collections`, {
      credentials: 'include' // For cookie-based auth
    });
    const data = await res.json();
    setSearches(data.collections || []);
  } catch (err) {
    console.error('Failed to load collections:', err);
  }
};
```

---

## Example 3: Collection Page (src/app/collection/[collectionName]/page.js)

**Before:**
```javascript
const res = await fetch(`/api/collections/${collectionName}`);
const data = await res.json();
```

**After:**
```javascript
import api from "@/lib/api";

const data = await api.collections.getByName(collectionName);
```

---

## Example 4: Analysis Button (src/components/AnalyseButton.jsx)

**Before:**
```javascript
const response = await fetch(`/api/analyse/${encodeURIComponent(collectionName)}`, {
  method: 'POST'
});
const result = await response.json();
```

**After:**
```javascript
import api from "@/lib/api";

const result = await api.analysis.analyze(collectionName);
```

---

## Example 5: Keywords Page (src/app/keywords/page.js)

**Before:**
```javascript
const submitKeyword = async () => {
  const promises = [];
  
  if (platforms.twitter) {
    promises.push(
      fetch('/api/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: keyword })
      })
    );
  }
  
  if (platforms.youtube) {
    promises.push(
      fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: keyword })
      })
    );
  }
};
```

**After:**
```javascript
import api from "@/lib/api";

const submitKeyword = async () => {
  const promises = [];
  
  if (platforms.twitter) {
    promises.push(api.social.searchTwitter(keyword));
  }
  
  if (platforms.youtube) {
    promises.push(api.social.searchYouTube(keyword));
  }
  
  // ... rest of the logic
};
```

---

## Example 6: Reports Page (src/app/collection/[collectionName]/reports/page.js)

**Before:**
```javascript
const analysisRes = await fetch(`/api/collections/${collectionName}/analysis`);
const analysisData = await analysisRes.json();
```

**After:**
```javascript
import api from "@/lib/api";

const analysisData = await api.collections.getAnalysis(collectionName);
```

---

## Complete Updated Dashboard Example

```javascript
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useRouter } from 'next/navigation';
import { useAuth } from "../hooks/useAuth";
import DottedBackground from "@/components/DottedBackground";
import api from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [searches, setSearches] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const data = await api.collections.getAll();
        setSearches(data.collections || []);
      } catch (err) {
        console.error('Failed to load collections:', err);
        setError(err.message);
      }
    };

    fetchCollections();
  }, []);

  const { loadings } = useAuth();

  if (loadings) return <div className="min-h-screen bg-gray-950 text-white px-6 py-4">Loading...</div>;

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      window.location.href = "/";
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-4 relative">
      <DottedBackground />
      <div className="relative z-10">
        {/* Navbar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.gif"
              alt="logo"
              width={60}
              height={60}
              className="rounded-full"
              unoptimized
            />
            <h2 className="text-2xl font-bold">EM-Social</h2>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Welcome Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Welcome to EM-Social Dashboard</h1>
            <p className="text-gray-400 text-lg">
              Monitor social media conversations and analyze trends across platforms
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <Card 
              className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800 transition cursor-pointer"
              onClick={() => router.push('/keywords')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-2xl">🔍</span>
                  Search Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Configure and search for keywords across Twitter and YouTube. Set up new searches and manage existing ones.
                </p>
              </CardContent>
            </Card>

            <Card 
              className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800 transition cursor-pointer"
              onClick={() => router.push('/analytics')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  View detailed analytics and insights about your social media presence and engagement metrics.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Searches */}
          <Card className="bg-gray-900 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-xl">📌 Recent Searches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {searches.length > 0 ? (
                  searches.map((name, idx) => (
                    <div
                      key={idx}
                      onClick={() => router.push(`/collection/${name}`)}
                      className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:bg-blue-600 hover:border-blue-400 hover:scale-105 transition text-blue-300 hover:text-white shadow-md"
                    >
                      #{name}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No recent searches yet. Go to Keywords Configuration to start searching!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

## Quick Migration Checklist

- [ ] Create `.env.local` file with `NEXT_PUBLIC_API_URL=http://localhost:5000`
- [ ] Verify backend is running on port 5000
- [ ] Check backend has CORS enabled for `http://localhost:3000`
- [ ] Update login page to use `api.auth.login()`
- [ ] Update dashboard to use `api.collections.getAll()`
- [ ] Update collection pages to use `api.collections.getByName()`
- [ ] Update analysis to use `api.analysis.analyze()`
- [ ] Test all functionality
- [ ] Check browser console for errors
- [ ] Verify authentication works (cookies/tokens)

## Testing Your Setup

Add this to any page to test the connection:

```javascript
useEffect(() => {
  const testConnection = async () => {
    console.log('🔍 Testing backend connection...');
    console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
    
    try {
      const data = await api.collections.getAll();
      console.log('✅ Backend connected successfully:', data);
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
    }
  };
  
  testConnection();
}, []);
```

