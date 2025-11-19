import mongoose from 'mongoose';

// Unified schema for social posts without platform type
export const SocialPostSchema = new mongoose.Schema({
  keyword:      { type: String, required: true },   // E.g., "elonmusk", "startup2024"

  postId:       { type: String, required: true },   // ID from Twitter or Instagram
  text:         String,                             // Tweet text or Instagram caption
  mediaUrl:     String,                             // Thumbnail, image, or video URL
  postUrl:      String,                             // URL to the post
  authorId:     String,                             // Poster ID
  authorName:   String,                             // Poster name
  createdAt:    Date,                               // When the post was originally created

  // Engagement
  likeCount:    Number,
  commentCount: Number,
  shareCount:   Number, // Retweet, reshare, etc.
  viewCount:    Number, // optional, if available

  // AI analysis (optional)
  analysis:     { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// Get model based on keyword (collection name = cleaned keyword)
export function getModelForKeyword(keyword) {
  const name = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (mongoose.models[name]) {
    return mongoose.models[name];
  }
  return mongoose.model(name, SocialPostSchema, name);
}
