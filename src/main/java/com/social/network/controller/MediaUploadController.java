package com.social.network.controller;

import com.social.network.dto.MediaUploadResponse;
import com.social.network.service.CloudinaryStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/media")
@CrossOrigin(origins = "*", maxAge = 3600)
public class MediaUploadController {

    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    private static final long MAX_VIDEO_BYTES = 50L * 1024 * 1024;
    private static final long MAX_AUDIO_BYTES = 20L * 1024 * 1024;
    private static final Set<String> ALLOWED_FOLDERS = Set.of(
            "posts", "community-posts", "messages", "profiles", "communities", "uploads"
    );

    private final CloudinaryStorageService cloudinaryStorageService;

    public MediaUploadController(CloudinaryStorageService cloudinaryStorageService) {
        this.cloudinaryStorageService = cloudinaryStorageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadSingle(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", required = false) String folder) {
        return handleUpload(List.of(file), folder, false);
    }

    @PostMapping("/upload/batch")
    public ResponseEntity<?> uploadBatch(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "folder", required = false) String folder) {
        return handleUpload(files, folder, true);
    }

    private ResponseEntity<?> handleUpload(List<MultipartFile> files, String folder, boolean forceList) {
        if (!cloudinaryStorageService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Cloudinary is not configured");
        }
        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body("No files provided");
        }

        String safeFolder = normalizeFolder(folder);
        List<MediaUploadResponse> uploads = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body("File is empty");
            }
            String contentType = file.getContentType();
            if (contentType == null || !isSupportedContentType(contentType)) {
                return ResponseEntity.badRequest().body("Unsupported file type: " + contentType);
            }
            String mediaCategory = CloudinaryStorageService.getMediaCategoryFromContentType(contentType);
            long maxSize = maxSizeFor(mediaCategory);
            if (file.getSize() > maxSize) {
                return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                        .body("File too large for " + mediaCategory + " (max " + (maxSize / (1024 * 1024)) + "MB)");
            }
            String url = cloudinaryStorageService.uploadMedia(file, safeFolder, mediaCategory);
            uploads.add(new MediaUploadResponse(url, mediaCategory));
        }

        if (!forceList && uploads.size() == 1) {
            return ResponseEntity.ok(uploads.get(0));
        }
        return ResponseEntity.ok(uploads);
    }

    private boolean isSupportedContentType(String contentType) {
        return contentType.startsWith("image/")
                || contentType.startsWith("video/")
                || contentType.startsWith("audio/");
    }

    private long maxSizeFor(String mediaCategory) {
        return switch (mediaCategory) {
            case "video" -> MAX_VIDEO_BYTES;
            case "audio" -> MAX_AUDIO_BYTES;
            default -> MAX_IMAGE_BYTES;
        };
    }

    private String normalizeFolder(String folder) {
        if (folder == null || folder.isBlank()) {
            return "uploads";
        }
        String trimmed = folder.trim();
        if (ALLOWED_FOLDERS.contains(trimmed)) {
            return trimmed;
        }
        return "uploads";
    }
}
