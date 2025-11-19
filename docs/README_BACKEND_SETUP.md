# Backend Integration - Complete Setup Guide

## 📋 Overview

Your Next.js frontend is now configured to connect to a backend API running on **port 5000**.

## 🗂️ Files Created

1. **`src/lib/api.js`** - Centralized API helper for all backend calls
2. **`ENV_SETUP.md`** - Environment variables configuration guide
3. **`MIGRATION_GUIDE.md`** - Step-by-step code migration instructions
4. **`EXAMPLES_UPDATED_FILES.md`** - Before/after code examples
5. **`QUICK_START.md`** - Quick setup instructions
6. **`README_BACKEND_SETUP.md`** - This overview document

## ⚡ Quick Setup

### 1. Create `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 2. Restart Dev Server

```bash
npm run dev
```

### 3. Verify Backend

Ensure your backend on port 5000:
- Is running
- Has CORS enabled for `http://localhost:3000`
- Responds to API requests

## 🎯 API Helper Usage

### Import

```javascript
import api from '@/lib/api';
```

### Available Methods

#### Authentication
```javascript
await api.auth.login({ email, password });
await api.auth.logout();
await api.auth.me();
```

#### Collections
```javascript
await api.collections.getAll();
await api.collections.getByName(name);
await api.collections.getAnalysis(name);
```

#### Analysis
```javascript
await api.analysis.analyze(query);
```

#### Social Media
```javascript
await api.social.searchTwitter(query, options);
await api.social.searchYouTube(query, options);
```

#### Users
```javascript
await api.users.getAll();
await api.users.getById(id);
```

## 🔄 Migration Path

### Pages to Update (in order)

1. **Login page** (`src/app/page.js`)
   - Update login API call

2. **Dashboard** (`src/app/dashboard/page.js`)
   - Update collections fetching

3. **Collections page** (`src/app/collection/[collectionName]/page.js`)
   - Update collection data fetching

4. **Reports page** (`src/app/collection/[collectionName]/reports/page.js`)
   - Update analysis fetching

5. **Analytics page** (`src/app/analytics/page.js`)
   - Update analytics data fetching

6. **Keywords page** (`src/app/keywords/page.js`)
   - Update social media search calls

7. **Components** (`src/components/AnalyseButton.jsx`, etc.)
   - Update any API calls in components

## 📝 Example Migration

### Before
```javascript
const res = await fetch('/api/collections');
const data = await res.json();
```

### After
```javascript
import api from '@/lib/api';

const data = await api.collections.getAll();
```

## 🛠️ Backend Requirements

Your backend should implement these endpoints:

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/auth/me` - Get current user

### Collections
- `GET /api/collections` - Get all collections
- `GET /api/collections/:name` - Get specific collection
- `GET /api/collections/:name/analysis` - Get collection analysis

### Analysis
- `POST /api/analyse/:query` - Analyze a query

### Social Media
- `POST /api/x` - Search Twitter
- `POST /api/youtube` - Search YouTube

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user

## 🔒 CORS Configuration

### Express.js Example

```javascript
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### FastAPI Example

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

## ✅ Testing

### Test Connection

```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);

try {
  const data = await api.collections.getAll();
  console.log('✅ Connected:', data);
} catch (error) {
  console.error('❌ Failed:', error);
}
```

### Test with curl

```bash
curl http://localhost:5000/api/collections
```

## 🐛 Common Issues

### Issue: CORS errors
- **Fix:** Enable CORS on backend for `http://localhost:3000`

### Issue: Environment variable undefined
- **Fix:** Restart Next.js dev server after creating `.env.local`

### Issue: 404 on API calls
- **Fix:** Verify backend endpoints match the ones in `api.js`

### Issue: Authentication fails
- **Fix:** Ensure cookies are being sent (`credentials: 'include'`)

## 📚 Documentation

- **QUICK_START.md** - Fast setup guide
- **ENV_SETUP.md** - Environment configuration
- **MIGRATION_GUIDE.md** - Code migration steps
- **EXAMPLES_UPDATED_FILES.md** - Code examples

## 🎉 Benefits

✅ **Centralized API management** - All API calls in one place  
✅ **Easy configuration** - Change backend URL via environment variable  
✅ **Error handling** - Consistent error handling across app  
✅ **Type safety** - Organized methods with clear parameters  
✅ **Flexibility** - Works with any backend technology  
✅ **Development friendly** - Easy to switch between dev/prod backends  

## 🚀 Next Steps

1. ✅ Created environment configuration
2. ✅ Created API helper
3. ✅ Created documentation
4. ⏭️ Create `.env.local` file
5. ⏭️ Start/verify backend on port 5000
6. ⏭️ Update login page
7. ⏭️ Update dashboard
8. ⏭️ Test and migrate remaining pages

---

**Ready to start!** Follow **QUICK_START.md** for immediate setup.

