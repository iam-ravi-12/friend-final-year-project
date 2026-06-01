package com.social.network.service;

import com.social.network.dto.ConversationResponse;
import com.social.network.dto.MessageRequest;
import com.social.network.dto.MessageResponse;
import com.social.network.entity.Message;
import com.social.network.entity.User;
import com.social.network.repository.MessageRepository;
import com.social.network.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final FirebaseStorageService firebaseStorageService;

    @Transactional
    public MessageResponse sendMessage(String senderUsername, MessageRequest request) {
        User sender = userRepository.findByUsername(senderUsername)
                .orElseThrow(() -> new UsernameNotFoundException("Sender not found"));

        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new UsernameNotFoundException("Receiver not found"));

        // Validate: must have text content OR media
        if ((request.getContent() == null || request.getContent().isBlank())
                && (request.getMediaBase64() == null || request.getMediaBase64().isBlank())) {
            throw new IllegalArgumentException("Message must contain text or media");
        }

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(request.getContent());
        message.setIsRead(false);

        // Upload media to Firebase Storage if provided
        if (request.getMediaBase64() != null && !request.getMediaBase64().isBlank()) {
            String uploadedUrl = firebaseStorageService.uploadMedia(request.getMediaBase64(), "messages");
            message.setMediaUrl(uploadedUrl);
            message.setMediaType(FirebaseStorageService.getMediaCategoryFromUri(request.getMediaBase64()));
        }

        Message savedMessage = messageRepository.save(message);
        return mapToMessageResponse(savedMessage);
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getMessagesBetweenUsers(String currentUsername, Long otherUserId) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UsernameNotFoundException("Current user not found"));

        User otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new UsernameNotFoundException("Other user not found"));

        List<Message> messages = messageRepository.findMessagesBetweenUsers(currentUser, otherUser);
        return messages.stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markMessagesAsRead(String currentUsername, Long senderId) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UsernameNotFoundException("Current user not found"));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new UsernameNotFoundException("Sender not found"));

        List<Message> unreadMessages = messageRepository.findMessagesBetweenUsers(currentUser, sender).stream()
                .filter(m -> m.getReceiver().getId().equals(currentUser.getId()) && !m.getIsRead())
                .peek(m -> m.setIsRead(true))
                .collect(Collectors.toList());

        if (!unreadMessages.isEmpty()) {
            messageRepository.saveAll(unreadMessages);
        }
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> getConversations(String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        List<Long> partnerIds = messageRepository.findConversationPartnerIds(currentUser.getId());
        if (partnerIds.isEmpty()) {
            return List.of();
        }

        List<User> partners = userRepository.findAllById(partnerIds);
        Map<Long, User> partnerMap = partners.stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<ConversationResponse> conversations = new ArrayList<>();

        for (Long partnerId : partnerIds) {
            User partner = partnerMap.get(partnerId);
            if (partner == null) continue;

            List<Message> messages = messageRepository.findMessagesBetweenUsers(currentUser, partner);

            if (!messages.isEmpty()) {
                Message lastMessage = messages.get(messages.size() - 1);
                Long unreadCount = messageRepository.countBySenderAndReceiverAndIsRead(
                        partner, currentUser, false);

                ConversationResponse conversation = new ConversationResponse();
                conversation.setUserId(partner.getId());
                conversation.setUsername(partner.getUsername());
                conversation.setProfession(partner.getProfession());
                // Show a placeholder for media-only messages
                if (lastMessage.getContent() != null && !lastMessage.getContent().isBlank()) {
                    conversation.setLastMessage(lastMessage.getContent());
                } else if (lastMessage.getMediaType() != null) {
                    conversation.setLastMessage("📎 " + capitalize(lastMessage.getMediaType()));
                } else {
                    conversation.setLastMessage("");
                }
                conversation.setLastMessageTime(lastMessage.getCreatedAt());
                conversation.setUnreadCount(unreadCount);
                conversations.add(conversation);
            }
        }

        conversations.sort((c1, c2) -> c2.getLastMessageTime().compareTo(c1.getLastMessageTime()));
        return conversations;
    }

    private MessageResponse mapToMessageResponse(Message message) {
        MessageResponse response = new MessageResponse();
        response.setId(message.getId());
        response.setSenderId(message.getSender().getId());
        response.setSenderUsername(message.getSender().getUsername());
        response.setReceiverId(message.getReceiver().getId());
        response.setReceiverUsername(message.getReceiver().getUsername());
        response.setContent(message.getContent());
        response.setMediaUrl(message.getMediaUrl());
        response.setMediaType(message.getMediaType());
        response.setIsRead(message.getIsRead());
        response.setCreatedAt(message.getCreatedAt());
        return response;
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
