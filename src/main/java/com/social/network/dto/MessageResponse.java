package com.social.network.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {

    private Long id;
    private Long senderId;
    private String senderUsername;
    private Long receiverId;
    private String receiverUsername;
    private String content;

    /** Public URL of an attached audio or video file. Null when no media. */
    private String mediaUrl;

    /** "image", "audio", or "video". Null when no media. */
    private String mediaType;

    private Boolean isRead;
    private LocalDateTime createdAt;
}
