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

    /** Text content of the message. Optional when mediaBase64 is provided. */
    private String content;

    /**
     * Base64-encoded audio or video file with data URI prefix,
     * e.g. "data:audio/m4a;base64,..." or "data:video/mp4;base64,...".
     * Optional — omit for text-only messages.
     */
    private String mediaBase64;
}
