# Backend API Documentation - Social Listing Backend

## 📡 Backend Information

**Repository:** [https://github.com/Brijesh-09/social-listing.git](https://github.com/Brijesh-09/social-listing.git)  
**Port:** 5000  
**Base URL:** `http://localhost:5000`

---

## 🚀 Backend Setup

### 1. Clone and Install

```bash
cd C:\Users\PAWAN\Downloads\locobuzz
git clone https://github.com/Brijesh-09/social-listing.git
cd social-listing
npm install
```

### 2. Configure Environment

Create `.env` file in the backend directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
# Add other required environment variables
```

### 3. Run Backend Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

---

## 📋 API Endpoints

### Health Check

#### GET `/health`
Check if the server is running.

**Response:**
```json
{
  "success": true,
  "message": "Server is running"
}
```

---

### Brand Management Endpoints

#### GET `/api/brands/getbrands`
Get all brands.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "brands": [
    {
      "_id": "...",
      "brandName": "Nike",
      "description": "Sports brand",
      "frequency": "daily",
      "keywords": ["nike", "sports"],
      "platforms": ["twitter", "youtube"]
    }
  ]
}
```

#### POST `/api/brands/create`
Create a new brand.

**Request Body:**
```json
{
  "brandName": "Nike",
  "description": "Sports brand",
  "frequency": "daily"
}
```

**Response:**
```json
{
  "success": true,
  "brand": {
    "_id": "...",
    "brandName": "Nike",
    "description": "Sports brand",
    "frequency": "daily"
  }
}
```

#### POST `/api/brands/configure`
Update brand configuration (add keywords and platforms).

**Request Body:**
```json
{
  "brandName": "Nike",
  "keywords": ["nike", "just do it"],
  "platforms": ["twitter", "youtube", "reddit"]
}
```

**Response:**
```json
{
  "success": true,
  "brand": {
    "_id": "...",
    "brandName": "Nike",
    "keywords": ["nike", "just do it"],
    "platforms": ["twitter", "youtube", "reddit"]
  }
}
```

---

### Search Endpoints

#### POST `/api/search/recent`
Search for recent social media posts.

**Request Body:**
```json
{
  "keyword": "nike",
  "platforms": ["twitter", "youtube"]
}
```

#### POST `/api/search/historical`
Search historical data.

**Request Body:**
```json
{
  "keyword": "nike",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

#### POST `/api/search/run`
Run search for a brand.

**Request Body:**
```json
{
  "brandName": "Nike",
  "keyword": "nike shoes"
}
```

#### POST `/api/search/brandsearch`
Run brand-specific search.

**Request Body:**
```json
{
  "brandName": "Nike"
}
```

---

### Dashboard Data Endpoints

#### GET `/api/search/data`
Get posts by brand with optional filters.

**Query Parameters:**
- `brandName` (required): The brand name
- `platform` (optional): Filter by platform (youtube/twitter/reddit)
- `keyword` (optional): Filter by keyword
- `limit` (optional): Number of results (default: 20)
- `sort` (optional): Sort order - "asc" or "desc" (default: "desc")

**Example Request:**
```
GET /api/search/data?brandName=Nike&platform=twitter&limit=50&sort=desc
```

**Response:**
```json
{
  "success": true,
  "brand": "Nike",
  "count": 50,
  "filters": {
    "platform": "twitter",
    "keyword": "all"
  },
  "data": [
    {
      "_id": "...",
      "brand": {
        "_id": "...",
        "brandName": "Nike"
      },
      "platform": "twitter",
      "keyword": "nike",
      "content": "Just got new Nike shoes!",
      "createdAt": "2024-10-29T10:00:00Z"
    }
  ]
}
```

#### GET `/api/search/keywords`
Get all keywords for a specific brand.

**Query Parameters:**
- `brandName` (required): The brand name

**Example Request:**
```
GET /api/search/keywords?brandName=Nike
```

**Response:**
```json
{
  "success": true,
  "brand": "Nike",
  "count": 3,
  "keywords": ["nike", "nike shoes", "just do it"]
}
```

---

## 🔧 Frontend Integration

### Using the API Helper

Import and use the pre-configured API helper:

```javascript
import api from '@/lib/api';

// Health check
const health = await api.health();

// Get all brands
const brands = await api.brands.getAll();

// Create a new brand
const newBrand = await api.brands.create({
  brandName: "Nike",
  description: "Sports brand",
  frequency: "daily"
});

// Configure brand
await api.brands.configure({
  brandName: "Nike",
  keywords: ["nike", "sports"],
  platforms: ["twitter", "youtube"]
});

// Get dashboard posts
const posts = await api.dashboard.getPosts({
  brandName: "Nike",
  platform: "twitter",
  limit: 50
});

// Get brand keywords
const keywords = await api.dashboard.getKeywords("Nike");

// Search recent
const recentResults = await api.search.recent({
  keyword: "nike",
  platforms: ["twitter", "youtube"]
});

// Run brand search
await api.search.runForBrand({
  brandName: "Nike",
  keyword: "nike shoes"
});
```

---

## 📊 Data Models

### Brand Model
```javascript
{
  brandName: String,        // Required, unique
  description: String,      // Optional
  frequency: String,        // Optional, default: "daily"
  keywords: [String],       // Array of keywords
  platforms: [String],      // Array of platforms
  createdAt: Date,
  updatedAt: Date
}
```

### Social Post Model
```javascript
{
  brand: ObjectId,          // Reference to Brand
  platform: String,         // "twitter", "youtube", "reddit"
  keyword: String,          // Search keyword
  content: String,          // Post content
  author: String,           // Author info
  url: String,             // Original post URL
  engagement: Object,      // Likes, shares, etc.
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔄 Complete Integration Example

### Step 1: Set up environment

Create `.env.local` in your frontend:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Step 2: Use in your components

```javascript
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const data = await api.brands.getAll();
        setBrands(data.brands || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  if (loading) return <div>Loading brands...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Brands ({brands.length})</h1>
      {brands.map((brand) => (
        <div key={brand._id}>
          <h2>{brand.brandName}</h2>
          <p>{brand.description}</p>
          <p>Keywords: {brand.keywords.join(', ')}</p>
          <p>Platforms: {brand.platforms.join(', ')}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ Pre-Flight Checklist

Before using the frontend with this backend:

- [ ] Backend repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured with MongoDB URI
- [ ] Backend server running on port 5000
- [ ] MongoDB connected successfully
- [ ] Frontend `.env.local` configured with backend URL
- [ ] Frontend dev server restarted
- [ ] CORS is already enabled in backend
- [ ] Test health endpoint: `curl http://localhost:5000/health`

---

## 🐛 Troubleshooting

### Backend not starting
- Check if port 5000 is already in use
- Verify MongoDB connection string in `.env`
- Check console logs for errors

### CORS errors
- Backend already has CORS enabled for all origins
- If still having issues, check browser console for specific error

### Cannot connect from frontend
- Verify backend is running: `curl http://localhost:5000/health`
- Check `.env.local` has correct URL
- Restart frontend dev server after changing env variables

---

## 📝 Notes

1. The backend uses **ES modules** (`import/export`)
2. **CORS is already configured** - no additional setup needed
3. Backend runs on **port 5000** by default
4. All routes are prefixed with `/api/` except `/health`
5. The API helper is already configured for all endpoints

---

## 🎯 Next Steps

1. ✅ Backend cloned and examined
2. ✅ API helper updated with correct endpoints
3. ⏭️ Start backend server
4. ⏭️ Test backend endpoints
5. ⏭️ Create brand management pages in frontend
6. ⏭️ Integrate dashboard with backend data
7. ⏭️ Test full integration

Ready to integrate! 🚀

