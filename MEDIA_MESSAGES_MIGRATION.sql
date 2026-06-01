-- Migration: Add audio/video support to messages
-- Run this against your MySQL database before deploying the updated backend.

ALTER TABLE messages
    MODIFY COLUMN content TEXT NULL,
    ADD COLUMN media_url  TEXT         NULL AFTER content,
    ADD COLUMN media_type VARCHAR(10)  NULL AFTER media_url;

-- media_type values: 'image' | 'audio' | 'video'
-- content is now nullable to allow media-only messages
