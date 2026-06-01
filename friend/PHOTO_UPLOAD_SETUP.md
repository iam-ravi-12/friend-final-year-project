# Photo Upload Setup Instructions

## Installation Required

To enable photo uploads in posts, you need to install the `expo-image-picker` package:

```bash
cd friend
npx expo install expo-image-picker
```

## Features Added

1. **Create Post Screen** - Users can now:
   - Select images from their device gallery
   - Preview selected image before posting
   - Remove selected image
   - Post with or without an image

2. **Home Feed** - Posts with images display the image below the post content

3. **Post Detail Screen** - Full post view shows images

4. **Community Posts** - Images are displayed in community posts

## Current Limitation

✅ **Resolved**: The backend now provides a media upload endpoint backed by Cloudinary.

### Option 1: Use Public Image URLs (Quick Testing)
Instead of uploading from device, paste a public image URL directly into the `mediaUrl` field:
- Edit `CreatePostScreen.tsx`
- Replace the image picker with a text input for image URLs
- Users can paste URLs like `https://example.com/image.jpg`

### Option 2: Use the Cloudinary Upload API (Recommended)

Use the backend endpoint:

```
POST /api/media/upload
```

Send a multipart file and receive:

```json
{ "url": "https://res.cloudinary.com/...", "mediaType": "image" }
```

Then send the returned URL in `mediaUrls`.

## Testing Without Backend Changes

For now, to test the photo feature:

1. Use public image URLs from the internet
2. When creating a post, manually set the mediaUrl to a public URL in the database
3. The mobile app will display these images correctly

## Backend Requirements

The backend now supports:
- `POST /api/media/upload` for uploads
- `mediaUrls` in `PostRequest` and `PostResponse`
