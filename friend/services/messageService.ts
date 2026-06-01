import api from './api';

export interface MessageData {
  receiverId: number;
  content?: string;
  /** Base64-encoded audio or video with data URI prefix, e.g. "data:audio/m4a;base64,..." */
  mediaBase64?: string;
}

export interface MessageResponse {
  id: number;
  senderId: number;
  receiverId: number;
  content: string | null;
  /** Public Firebase Storage URL for attached media. Null for text-only messages. */
  mediaUrl: string | null;
  /** "image" | "audio" | "video" — null for text-only messages. */
  mediaType: 'image' | 'audio' | 'video' | null;
  isRead: boolean;
  createdAt: string;
  senderUsername: string;
  receiverUsername: string;
}

export interface ConversationResponse {
  userId: number;
  username: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const messageService = {
  sendMessage: async (data: MessageData): Promise<MessageResponse> => {
    const response = await api.post('/api/messages', data);
    return response.data;
  },

  getConversations: async (): Promise<ConversationResponse[]> => {
    const response = await api.get('/api/messages/conversations');
    return response.data;
  },

  getMessagesWithUser: async (otherUserId: number): Promise<MessageResponse[]> => {
    const response = await api.get(`/api/messages/with/${otherUserId}`);
    return response.data;
  },

  markAsRead: async (otherUserId: number): Promise<void> => {
    await api.put(`/api/messages/read/${otherUserId}`);
  },
};

export default messageService;
