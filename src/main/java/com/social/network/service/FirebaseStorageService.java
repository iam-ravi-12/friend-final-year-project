package com.social.network.service;

import com.google.cloud.storage.*;
import com.google.firebase.cloud.StorageClient;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

@Service
public class FirebaseStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseStorageService.class);

    @Value("${FIREBASE_STORAGE_BUCKET:#{null}}")
    private String bucketName;

    @PostConstruct
    public void init() {
        if (bucketName != null && !bucketName.isEmpty()) {
            logger.info("Firebase Storage configured with bucket: {}", bucketName);
        } else {
            logger.warn("Firebase Storage bucket not configured. Media uploads will fall back to base64 storage.");
        }
    }

    /**
     * Upload a base64 encoded media file (image, audio, or video) to Firebase Storage.
     *
     * @param base64Media The base64 encoded string (with or without data URI prefix)
     * @param folder      The folder path in Firebase Storage (e.g., "profiles", "posts", "messages")
     * @return The public URL of the uploaded file, or the original base64 string if upload fails
     */
    public String uploadMedia(String base64Media, String folder) {
        if (base64Media == null || base64Media.isEmpty()) {
            logger.warn("Attempted to upload null or empty media");
            return null;
        }

        if (bucketName == null || bucketName.isEmpty()) {
            logger.warn("Firebase Storage bucket not configured. Falling back to base64 storage.");
            return base64Media;
        }

        try {
            Bucket bucket = StorageClient.getInstance().bucket(bucketName);
            if (bucket == null) {
                logger.warn("Firebase Storage bucket not available. Falling back to base64 storage.");
                return base64Media;
            }

            String base64Data = base64Media;
            String contentType = "image/jpeg"; // default

            if (base64Media.contains(",")) {
                String[] parts = base64Media.split(",", 2);
                base64Data = parts[1];
                if (parts[0].contains(":") && parts[0].contains(";")) {
                    String dataUri = parts[0];
                    contentType = dataUri.substring(dataUri.indexOf(":") + 1, dataUri.indexOf(";"));
                }
            }

            byte[] mediaBytes = Base64.getDecoder().decode(base64Data);
            String filename = folder + "/" + UUID.randomUUID() + getFileExtension(contentType);

            Blob blob = bucket.create(filename, mediaBytes, contentType);

            String publicUrl = String.format("https://storage.googleapis.com/%s/%s", bucketName, filename);
            logger.info("Successfully uploaded media to Firebase Storage: {}", publicUrl);
            return publicUrl;

        } catch (IllegalStateException e) {
            logger.error("Firebase not initialized. Falling back to base64 storage.", e);
            return base64Media;
        } catch (Exception e) {
            logger.error("Error uploading media to Firebase Storage. Falling back to base64.", e);
            return base64Media;
        }
    }

    /**
     * Kept for backward compatibility — delegates to uploadMedia.
     */
    public String uploadImage(String base64Image, String folder) {
        return uploadMedia(base64Image, folder);
    }

    /**
     * Delete a media file from Firebase Storage.
     *
     * @param mediaUrl The public URL of the file to delete
     * @return true if deletion was successful, false otherwise
     */
    public boolean deleteMedia(String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isEmpty()) {
            return false;
        }
        if (!mediaUrl.contains("storage.googleapis.com") && !mediaUrl.contains("firebasestorage.googleapis.com")) {
            logger.info("Not a Firebase Storage URL, skipping deletion: {}", mediaUrl);
            return false;
        }
        if (bucketName == null || bucketName.isEmpty()) {
            logger.warn("Firebase Storage bucket not configured");
            return false;
        }
        try {
            Bucket bucket = StorageClient.getInstance().bucket(bucketName);
            if (bucket == null) {
                logger.warn("Firebase Storage bucket not available");
                return false;
            }
            String filename = extractFilenameFromUrl(mediaUrl);
            if (filename == null) {
                logger.warn("Could not extract filename from URL: {}", mediaUrl);
                return false;
            }
            Blob blob = bucket.get(filename);
            if (blob != null && blob.exists()) {
                boolean deleted = blob.delete();
                if (deleted) {
                    logger.info("Successfully deleted media from Firebase Storage: {}", filename);
                } else {
                    logger.warn("Failed to delete media from Firebase Storage: {}", filename);
                }
                return deleted;
            } else {
                logger.warn("Media not found in Firebase Storage: {}", filename);
                return false;
            }
        } catch (IllegalStateException e) {
            logger.error("Firebase not initialized", e);
            return false;
        } catch (Exception e) {
            logger.error("Error deleting media from Firebase Storage", e);
            return false;
        }
    }

    /** Kept for backward compatibility — delegates to deleteMedia. */
    public boolean deleteImage(String imageUrl) {
        return deleteMedia(imageUrl);
    }

    /**
     * Determine the media type category from a content-type string.
     * Returns "image", "video", or "audio".
     */
    public static String getMediaCategory(String contentType) {
        if (contentType == null) return "image";
        if (contentType.startsWith("video/")) return "video";
        if (contentType.startsWith("audio/")) return "audio";
        return "image";
    }

    /**
     * Determine the media type category from a data URI or URL.
     */
    public static String getMediaCategoryFromUri(String uri) {
        if (uri == null) return "image";
        // Data URI: "data:video/mp4;base64,..."
        if (uri.startsWith("data:")) {
            String mime = uri.substring(5, uri.indexOf(";"));
            return getMediaCategory(mime);
        }
        // URL extension heuristic
        String lower = uri.toLowerCase();
        if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm") || lower.endsWith(".avi")) return "video";
        if (lower.endsWith(".mp3") || lower.endsWith(".aac") || lower.endsWith(".wav") || lower.endsWith(".m4a") || lower.endsWith(".ogg")) return "audio";
        return "image";
    }

    private String getFileExtension(String contentType) {
        switch (contentType) {
            case "image/jpeg":
            case "image/jpg":
                return ".jpg";
            case "image/png":
                return ".png";
            case "image/gif":
                return ".gif";
            case "image/webp":
                return ".webp";
            case "video/mp4":
                return ".mp4";
            case "video/mov":
            case "video/quicktime":
                return ".mov";
            case "video/webm":
                return ".webm";
            case "audio/mpeg":
            case "audio/mp3":
                return ".mp3";
            case "audio/aac":
                return ".aac";
            case "audio/wav":
                return ".wav";
            case "audio/m4a":
            case "audio/x-m4a":
                return ".m4a";
            case "audio/ogg":
                return ".ogg";
            default:
                return ".bin";
        }
    }

    private String extractFilenameFromUrl(String url) {
        try {
            if (url.contains("storage.googleapis.com")) {
                String[] parts = url.split(bucketName + "/", 2);
                if (parts.length == 2) {
                    return parts[1].split("\\?")[0];
                }
            } else if (url.contains("firebasestorage.googleapis.com")) {
                String[] parts = url.split("/o/", 2);
                if (parts.length == 2) {
                    String encodedPath = parts[1].split("\\?")[0];
                    return java.net.URLDecoder.decode(encodedPath, StandardCharsets.UTF_8);
                }
            }
        } catch (Exception e) {
            logger.error("Error extracting filename from URL", e);
        }
        return null;
    }
}
