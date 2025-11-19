# API Migration Guide

## How to Update Your Code to Use Backend on Port 5000

This guide shows you how to update your existing code to make API calls to your backend running on port 5000.

## Before and After Examples

### Example 1: Fetching Collections

**Before (using local Next.js API routes):**
```javascript
const res = await fetch('/api/collections');
const data = await res.json();
```

**After (using backend on port 5000):**
```javascript
import api from '@/lib/api';

const data = await api.collections.getAll();
```

**Alternative (manual fetch with environment variable):**
```javascript
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/collections`);
const data = await res.json();
```

---

### Example 2: Login Request

**Before:**
```javascript
const response = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

**After:**
```javascript
import api from '@/lib/api';

const response = await api.auth.login({ email, password });
```

---

### Example 3: Getting Collection Analysis

**Before:**
```javascript
const response = await fetch(`/api/collections/${collectionName}/analysis`);
const data = await response.json();
```

**After:**
```javascript
import api from '@/lib/api';

const data = await api.collections.getAnalysis(collectionName);
```

---

## Files That Need Updates

Based on your codebase, here are the main files that make API calls:

1. **src/app/dashboard/page.js**
   - Update `/api/collections` fetch

2. **src/app/analytics/page.js**
   - Update collection fetching and analysis calls

3. **src/app/collection/[collectionName]/page.js**
   - Update collection data fetching

4. **src/app/collection/[collectionName]/reports/page.js**
   - Update analysis data fetching

5. **src/components/AnalyseButton.jsx**
   - Update analysis API call

6. **src/components/Report.jsx**
   - Update any data fetching

7. **src/app/page.js** (login page)
   - Update login API call

8. **src/app/keywords/page.js**
   - Update keyword configuration calls

## Step-by-Step Migration Process

### Step 1: Set Up Environment Variables

Create `.env.local` file (see ENV_SETUP.md)

### Step 2: Test Backend Connection

Create a test component to verify backend connectivity:

```javascript
import { useEffect } from 'react';
import api from '@/lib/api';

export default function TestConnection() {
  useEffect(() => {
    const test = async () => {
      try {
        const response = await api.collections.getAll();
        console.log('✅ Backend connected:', response);
      } catch (error) {
        console.error('❌ Backend connection failed:', error);
      }
    };
    test();
  }, []);

  return <div>Check console for connection status</div>;
}
```

### Step 3: Update Files One by One

Start with the dashboard/home page, then move to other pages.

### Step 4: Remove Old API Routes (Optional)

Once everything works with the external backend, you can optionally remove or keep the `/api` routes in `src/app/api/` for fallback or local development.

## Important Considerations

### CORS Configuration

Your backend must allow requests from your Next.js frontend. Add CORS middleware to your backend:

**For Express.js:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3000', // Your Next.js app URL
  credentials: true
}));
```

**For FastAPI:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Authentication

If using cookie-based authentication:
- Ensure `credentials: 'include'` is set in fetch requests (already handled in `api.js`)
- Backend must set appropriate CORS headers for credentials

### Error Handling

The `api.js` helper includes error handling. Wrap calls in try-catch:

```javascript
try {
  const data = await api.collections.getAll();
  setData(data);
} catch (error) {
  console.error('Failed to fetch:', error);
  setError(error.message);
}
```

## Quick Start

1. Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:5000`
2. Restart your Next.js dev server: `npm run dev`
3. Make sure your backend is running on port 5000
4. Test with a simple API call using the new `api` helper

## Need Help?

If you encounter issues:
- Check browser console for errors
- Verify backend is running on port 5000
- Check CORS configuration on backend
- Verify environment variables are loaded (restart dev server after changes)

