# Cloudinary Media Setup Guide

This application uses Cloudinary to store user-uploaded media (posts, community posts, and message attachments) instead of storing base64 strings in the database.

## Prerequisites

1. A Cloudinary account
2. Cloudinary API credentials (cloud name, API key, API secret)

## Configuration Steps

### 1. Create a Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/)
2. Create an account and open the **Dashboard**
3. Copy your **Cloud Name**, **API Key**, and **API Secret**

### 2. Set Environment Variables

Set these variables on your backend:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

For production (Render/Railway/etc.), add the variables in your deployment platform.

### 3. Upload Flow

1. Client uploads media via multipart/form-data
2. Backend uploads to Cloudinary
3. Backend stores the secure URL in the database

## API Endpoints

- `POST /api/media/upload` (single file)
- `POST /api/media/upload/batch` (multiple files)

Each response returns:

```json
{ "url": "https://res.cloudinary.com/...", "mediaType": "image" }
```

## Notes

- If Cloudinary is not configured, uploads return a 503 error.
- Existing base64 data remains in the database and will still render.
- New uploads reject base64 payloads to avoid oversized requests.
