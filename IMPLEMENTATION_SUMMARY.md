# Cloudinary Media Uploads - Implementation Summary

## Overview
This implementation replaces base64 media payloads with Cloudinary-hosted URLs for posts, community posts, and messages. It introduces a multipart upload API and updates clients to upload media first, then send only URLs in payloads.

## Problem Statement
Previously, media was sent as base64 strings in request bodies. This caused:
- Large payload sizes (base64 adds ~33% overhead)
- Slow uploads for audio/video
- Request size limits and timeouts

## Solution
1. Add a Cloudinary upload service on the backend
2. Provide `/api/media/upload` endpoints for multipart uploads
3. Store only Cloudinary URLs in the database
4. Reject base64 payloads for new uploads

## Backend Changes

### 1. CloudinaryStorageService
Handles:
- Uploading multipart files to Cloudinary
- Deleting Cloudinary media on post updates/deletes
- Determining media types from content type or URL

### 2. MediaUploadController
New endpoints:
- `POST /api/media/upload` (single)
- `POST /api/media/upload/batch` (multiple)

Validates:
- Content type (image/video/audio)
- Size limits (10MB images, 50MB video, 20MB audio)

### 3. Updated Services
- **PostService**: stores only media URLs, deletes old Cloudinary media
- **CommunityService**: stores only media URLs for community posts
- **MessageService**: accepts media URLs and mediaType instead of base64

## Frontend Changes

### Web
- Uploads media via `/api/media/upload/batch`
- Uses object URLs for previews
- Sends only Cloudinary URLs in post payloads

### Mobile
- Uploads media via `/api/media/upload`
- Sends only Cloudinary URLs in post and message payloads

## Configuration

Required environment variables:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Multipart limits:
- `spring.servlet.multipart.max-file-size=60MB`
- `spring.servlet.multipart.max-request-size=80MB`

## Migration Notes
- Existing base64 media remains in the database and will still render.
- New uploads reject base64 media.
- To migrate old media, re-upload via the new API and update records.

## Testing
1. Set Cloudinary credentials
2. Upload media via web/mobile clients
3. Confirm responses return Cloudinary URLs
4. Verify posts and messages render media correctly
