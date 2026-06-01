package com.social.network.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Set;
import java.util.Map;
import java.util.UUID;

@Service
public class CloudinaryStorageService {

    private static final Logger logger = LoggerFactory.getLogger(CloudinaryStorageService.class);
    private static final Set<String> AUDIO_EXTENSIONS = Set.of("mp3", "aac", "m4a", "wav", "ogg");

    @Value("${CLOUDINARY_CLOUD_NAME:#{null}}")
    private String cloudName;

    @Value("${CLOUDINARY_API_KEY:#{null}}")
    private String apiKey;

    @Value("${CLOUDINARY_API_SECRET:#{null}}")
    private String apiSecret;

    private Cloudinary cloudinary;

    @PostConstruct
    public void init() {
        if (cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank()) {
            cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret
            ));
            logger.info("Cloudinary configured for cloud: {}", cloudName);
        } else {
            logger.warn("Cloudinary not configured. Media uploads will be disabled.");
        }
    }

    public boolean isConfigured() {
        return cloudinary != null;
    }

    public String uploadMedia(MultipartFile file, String folder, String mediaCategory) {
        if (!isConfigured()) {
            throw new IllegalStateException("Cloudinary is not configured");
        }

        try {
            String resourceType = mediaCategory.equals("image") ? "image" : "video";
            Map<String, Object> options = ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", resourceType,
                    "public_id", UUID.randomUUID().toString(),
                    "overwrite", false
            );

            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), options);
            Object url = result.get("secure_url");
            if (url == null) {
                throw new IllegalStateException("Cloudinary did not return a secure URL");
            }
            return url.toString();
        } catch (Exception e) {
            logger.error("Error uploading media to Cloudinary", e);
            throw new RuntimeException("Failed to upload media");
        }
    }

    public boolean deleteMedia(String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) {
            return false;
        }
        if (!isConfigured()) {
            logger.warn("Cloudinary not configured. Skipping media delete.");
            return false;
        }
        if (!mediaUrl.contains("res.cloudinary.com")) {
            logger.info("Not a Cloudinary URL, skipping deletion: {}", mediaUrl);
            return false;
        }

        try {
            String publicId = extractPublicId(mediaUrl);
            if (publicId == null) {
                logger.warn("Could not extract Cloudinary public ID for URL: {}", mediaUrl);
                return false;
            }
            String resourceType = mediaUrl.contains("/video/upload/") ? "video" : "image";
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "invalidate", true
            ));
            Object deleted = result.get("result");
            boolean success = deleted != null && "ok".equalsIgnoreCase(deleted.toString());
            if (success) {
                logger.info("Deleted Cloudinary media: {}", publicId);
            } else {
                logger.warn("Cloudinary delete returned: {}", deleted);
            }
            return success;
        } catch (Exception e) {
            logger.error("Error deleting Cloudinary media", e);
            return false;
        }
    }

    public static String getMediaCategoryFromContentType(String contentType) {
        if (contentType == null) return "image";
        if (contentType.startsWith("video/")) return "video";
        if (contentType.startsWith("audio/")) return "audio";
        if (contentType.startsWith("image/")) return "image";
        return "image";
    }

    public static String getMediaCategoryFromUrl(String url) {
        if (url == null) return "image";
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains("/video/upload/")) {
            if (hasAudioExtension(lower)) {
                return "audio";
            }
            return "video";
        }
        if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm") || lower.endsWith(".avi")) {
            return "video";
        }
        if (hasAudioExtension(lower)) {
            return "audio";
        }
        return "image";
    }

    private String extractPublicId(String url) {
        String[] parts = url.split("/upload/");
        if (parts.length < 2) {
            return null;
        }
        String path = parts[1];
        if (path.startsWith("v") && path.length() > 2 && Character.isDigit(path.charAt(1))) {
            int slashIndex = path.indexOf("/", 2);
            if (slashIndex > 0) {
                path = path.substring(slashIndex + 1);
            }
        }
        int queryIndex = path.indexOf("?");
        if (queryIndex >= 0) {
            path = path.substring(0, queryIndex);
        }
        int extensionIndex = path.lastIndexOf(".");
        if (extensionIndex > 0) {
            path = path.substring(0, extensionIndex);
        }
        return path;
    }

    private static boolean hasAudioExtension(String url) {
        for (String extension : AUDIO_EXTENSIONS) {
            if (url.endsWith("." + extension)) {
                return true;
            }
        }
        return false;
    }
}
