# Quick Start: Cloudinary Media Uploads

## What Changed?

Your application now uploads post, community post, and message media to Cloudinary instead of storing base64 strings in the database. This keeps payloads small and makes large audio/video uploads reliable.

## Do I Need to Change My Frontend?

**YES.** Clients must upload files to the new media upload API and send only the returned URLs in post/message payloads.

## Setup Steps (5 minutes)

### 1. Create a Cloudinary Account

1. Go to https://cloudinary.com/ and create an account
2. Navigate to **Dashboard** and copy:
   - Cloud name
   - API key
   - API secret

### 2. Configure Environment Variables

Set these variables on your backend:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**For local development:** set them in your IDE or `.env` file.

### 3. Deploy and Test

1. Restart the backend
2. Upload media from the web or mobile app
3. Verify the response contains a Cloudinary URL

## New Upload Flow

1. Client uploads files to:
   - `POST /api/media/upload` (single file)
   - `POST /api/media/upload/batch` (multiple files)
2. Backend returns `{ url, mediaType }`
3. Client sends only URLs in `mediaUrls` or `mediaUrl` fields

## Migration Notes

- Existing base64 media in the database will still render.
- New uploads reject base64 payloads to prevent oversized requests.
- To migrate old media, re-upload via the new API and update the records.

## Need Help?

See detailed documentation:
- `FIREBASE_STORAGE_SETUP.md` (now Cloudinary setup)
- `IMPLEMENTATION_SUMMARY.md` - Technical details

## Summary

✅ **Setup time:** 5 minutes  
✅ **Payload size:** Smaller  
✅ **Large media:** Supported  
✅ **Cloud storage:** Cloudinary  

Your app is now ready for large image/audio/video uploads. 🚀
