package com.social.network.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageRequest {

    @NotNull(message = "Receiver ID is required")
    private Long receiverId;

    /** Text content of the message. Optional when mediaUrl is provided. */
    private String content;

    /**
     * Public media URL (Cloudinary) for audio or video attachments.
     * Optional — omit for text-only messages.
     */
    private String mediaUrl;

    /**
     * Media category: "image", "audio", or "video".
     * Optional; server will infer from URL when omitted.
     */
    private String mediaType;
}
