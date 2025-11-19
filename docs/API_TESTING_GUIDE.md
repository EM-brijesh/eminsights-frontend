# 🧪 API Testing Guide

## 📦 Postman Collection

Import `Emlisting.postman_collection.json` into Postman to test all API endpoints.

---

## 🚀 Quick Start

### 1. **Health Check**
```bash
GET http://localhost:5000/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

---

## 🏢 Brand Management APIs

### 2. **Create a Brand**
```bash
POST http://localhost:5000/api/brands/create
Content-Type: application/json

{
  "brandName": "Nike Brand",
  "frequency": "30m"
}
```

**Frequency Options:**
- `"5m"` - Every 5 minutes
- `"30m"` - Every 30 minutes (default)
- `"1h"` - Every 1 hour

**Expected Response:**
```json
{
  "success": true,
  "brand": {
    "_id": "...",
    "brandName": "Nike Brand",
    "frequency": "30m",
    "keywords": [],
    "platforms": []
  }
}
```

---

### 3. **Get All Brands**
```bash
GET http://localhost:5000/api/brands/getbrands
```

**Expected Response:**
```json
{
  "success": true,
  "brands": [
    {
      "_id": "...",
      "brandName": "Nike Brand",
      "keywords": ["nike", "sports"],
      "platforms": ["twitter", "youtube"],
      "frequency": "30m"
    }
  ]
}
```

---

### 4. **Configure Brand (Add Keywords & Platforms)**
```bash
POST http://localhost:5000/api/brands/updateconfig
Content-Type: application/json

{
  "brandName": "Nike Brand",
  "keywords": ["nike", "just do it", "swoosh", "sports"],
  "platforms": ["twitter", "youtube", "reddit"],
  "frequency": "30m"
}
```

**Expected Response:**
```json
{
  "success": true,
  "brand": {
    "brandName": "Nike Brand",
    "keywords": ["nike", "just do it", "swoosh", "sports"],
    "platforms": ["twitter", "youtube", "reddit"],
    "frequency": "30m"
  }
}
```

---

## 🔍 Search APIs

### 5. **Run Brand Search**
```bash
POST http://localhost:5000/api/search/run
Content-Type: application/json

{
  "brandName": "Nike Brand",
  "keyword": "nike",
  "platforms": ["twitter", "youtube"]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Search completed",
  "results": {
    "twitter": 15,
    "youtube": 8
  }
}
```

**Note:** This fetches real-time data and stores it in the database.

---

### 6. **Get Posts Data (Analytics)**
```bash
GET http://localhost:5000/api/search/data?brandName=Nike Brand&limit=50&sort=desc
```

**Query Parameters:**
- `brandName` (required) - Brand name
- `limit` (optional) - Number of posts (default: 50)
- `sort` (optional) - `asc` or `desc` (default: desc)
- `platform` (optional) - Filter by platform (`twitter`, `youtube`, `reddit`)
- `keyword` (optional) - Filter by keyword

**Examples:**
```bash
# Get all posts for Nike Brand
GET http://localhost:5000/api/search/data?brandName=Nike Brand

# Get only Twitter posts
GET http://localhost:5000/api/search/data?brandName=Nike Brand&platform=twitter

# Get posts with specific keyword
GET http://localhost:5000/api/search/data?brandName=Nike Brand&keyword=swoosh

# Combine filters
GET http://localhost:5000/api/search/data?brandName=Nike Brand&platform=youtube&keyword=sports&limit=10
```

**Expected Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "_id": "...",
      "platform": "twitter",
      "keyword": "nike",
      "brandName": "Nike Brand",
      "content": {
        "text": "Just bought new Nike shoes!",
        "description": "Product review",
        "mediaUrl": "https://..."
      },
      "author": "user123",
      "url": "https://twitter.com/...",
      "createdAt": "2025-01-30T10:00:00Z"
    }
  ]
}
```

---

### 7. **Get Keywords for Brand**
```bash
GET http://localhost:5000/api/search/keywords?brandName=Nike Brand
```

**Expected Response:**
```json
{
  "success": true,
  "keywords": ["nike", "just do it", "swoosh", "sports"]
}
```

---

## 🧪 Testing Workflow

### **Complete Brand Setup & Search Workflow**

1. **Create Brand**
   ```bash
   POST /api/brands/create
   Body: { "brandName": "Test Brand", "frequency": "30m" }
   ```

2. **Configure Brand**
   ```bash
   POST /api/brands/updateconfig
   Body: {
     "brandName": "Test Brand",
     "keywords": ["test", "demo"],
     "platforms": ["twitter"],
     "frequency": "30m"
   }
   ```

3. **Run Search**
   ```bash
   POST /api/search/run
   Body: {
     "brandName": "Test Brand",
     "keyword": "test",
     "platforms": ["twitter"]
   }
   ```

4. **View Analytics**
   ```bash
   GET /api/search/data?brandName=Test Brand&limit=10
   ```

5. **Frontend Analytics**
   - Open: http://localhost:3000/analytics
   - Select "Test Brand" from dropdown
   - View charts and data

---

## 🐛 Troubleshooting

### **No Data in Analytics?**

1. **Check if brand exists:**
   ```bash
   GET http://localhost:5000/api/brands/getbrands
   ```

2. **Check if search was run:**
   ```bash
   GET http://localhost:5000/api/search/data?brandName=YOUR_BRAND_NAME&limit=5
   ```

3. **If 0 posts returned:**
   - Run a search first using POST `/api/search/run`
   - Wait a few seconds for data to be fetched
   - Then check analytics again

### **CORS Errors?**
- Make sure backend is running on port 5000
- Make sure frontend is on port 3000
- Check `social-listing/app.js` has correct CORS config

### **Search Not Working?**
- Check `.env` file has valid API keys:
  - `YT_API_KEY` for YouTube
  - `X_API_BEARER_TOKEN` for Twitter
  - `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` for Reddit

---

## 📊 Example: Testing with Real Data

### **Adani Tracker (Has Data)**
```bash
# View existing data
GET http://localhost:5000/api/search/data?brandName=Adani Tracker&limit=10

# Expected: 51 posts about Adani from twitter, youtube, reddit
```

### **Create Your Own Brand**
```bash
# 1. Create
POST http://localhost:5000/api/brands/create
{
  "brandName": "My Sports Brand",
  "frequency": "30m"
}

# 2. Configure
POST http://localhost:5000/api/brands/updateconfig
{
  "brandName": "My Sports Brand",
  "keywords": ["football", "cricket", "sports"],
  "platforms": ["twitter", "youtube"],
  "frequency": "30m"
}

# 3. Run Search (for first keyword)
POST http://localhost:5000/api/search/run
{
  "brandName": "My Sports Brand",
  "keyword": "football",
  "platforms": ["twitter", "youtube"]
}

# 4. View Results
GET http://localhost:5000/api/search/data?brandName=My Sports Brand&limit=20

# 5. Open Frontend
# http://localhost:3000/analytics
# Select "My Sports Brand" - See charts!
```

---

## 🔗 Quick Links

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Analytics:** http://localhost:3000/analytics
- **Brand Management:** http://localhost:3000/brands
- **Keyword Search:** http://localhost:3000/keywords

---

## 💡 Pro Tips

1. **Use Postman Environment Variables**
   - Set `{{baseUrl}}` = `http://localhost:5000`
   - Set `{{brandName}}` = Your test brand name

2. **Save Common Requests**
   - Save your test brand configuration
   - Reuse for quick testing

3. **Monitor Backend Logs**
   - Watch terminal for API responses
   - Check for errors in real-time

4. **Check Browser Console**
   - F12 → Console tab
   - Look for API call logs (📊 emoji)

---

**Happy Testing! 🚀**

