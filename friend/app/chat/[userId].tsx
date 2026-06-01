import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Video, Audio, ResizeMode } from 'expo-av';
import messageService, { MessageResponse } from '../../services/messageService';
import { useAuth } from '../../contexts/AuthContext';
import { parseUTCDate } from '../../utils/helpers';

// ── Types ────────────────────────────────────────────────────────────────────

type PendingMedia = {
  uri: string;
  base64: string; // full data URI with prefix
  type: 'audio' | 'video';
  label: string;  // display name
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { userId } = useLocalSearchParams();
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();;
  const flatListRef = useRef<FlatList>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  // Track currently playing audio so we can stop it when another starts
  const soundRef = useRef<Audio.Sound | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadMessages();
      pollingInterval.current = setInterval(loadMessages, 5000);
      return () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        soundRef.current?.unloadAsync();
      };
    }, [userId])
  );

  const loadMessages = async () => {
    try {
      const data = await messageService.getMessagesWithUser(Number(userId));
      setMessages(data);
      await messageService.markAsRead(Number(userId));
    } catch {
      if (loading) Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // ── Media pickers ────────────────────────────────────────────────────────

  const pickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant media library permission.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.7,
        base64: true,
        videoMaxDuration: 60,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        if (!asset.base64) {
          Alert.alert('Not Supported', 'Base64 encoding unavailable for this video. Try a shorter clip.');
          return;
        }
        setPendingMedia({
          uri: asset.uri,
          base64: `data:video/mp4;base64,${asset.base64}`,
          type: 'video',
          label: 'Video',
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      // Convert file URI to base64 using fetch + blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPendingMedia({
          uri: asset.uri,
          base64,
          type: 'audio',
          label: asset.name || 'Audio',
        });
      };
      reader.readAsDataURL(blob);
    } catch {
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const removePendingMedia = () => setPendingMedia(null);

  // ── Send ─────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const hasText = newMessage.trim().length > 0;
    const hasMedia = pendingMedia !== null;
    if (!hasText && !hasMedia) return;

    const textContent = newMessage.trim();
    setNewMessage('');
    const mediaToSend = pendingMedia;
    setPendingMedia(null);
    setSending(true);

    try {
      await messageService.sendMessage({
        receiverId: Number(userId),
        content: textContent || undefined,
        mediaBase64: mediaToSend?.base64 || undefined,
      });
      await loadMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(textContent);
      setPendingMedia(mediaToSend);
    } finally {
      setSending(false);
    }
  };

  // ── Audio playback ────────────────────────────────────────────────────────

  const playAudio = async (url: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
    } catch {
      Alert.alert('Error', 'Could not play audio');
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatTime = (timestamp: string) => {
    const date = parseUTCDate(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const chatTitle =
    messages.length > 0
      ? messages[0].senderId === user?.id
        ? messages[0].receiverUsername
        : messages[0].senderUsername
      : 'Chat';

  // ── Render message ────────────────────────────────────────────────────────

  const renderMessage = ({ item }: { item: MessageResponse }) => {
    const isOwn = item.senderId === user?.id;

    return (
      <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>

          {/* Text content */}
          {item.content ? (
            <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
              {item.content}
            </Text>
          ) : null}

          {/* Video attachment */}
          {item.mediaType === 'video' && item.mediaUrl ? (
            <View style={styles.mediaAttachment}>
              <Video
                source={{ uri: item.mediaUrl }}
                style={styles.videoPlayer}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
              />
            </View>
          ) : null}

          {/* Audio attachment */}
          {item.mediaType === 'audio' && item.mediaUrl ? (
            <TouchableOpacity
              style={[styles.audioButton, isOwn ? styles.audioButtonOwn : styles.audioButtonOther]}
              onPress={() => playAudio(item.mediaUrl!)}
            >
              <Ionicons name="play-circle" size={28} color={isOwn ? '#fff' : '#007AFF'} />
              <Text style={[styles.audioLabel, isOwn ? styles.audioLabelOwn : styles.audioLabelOther]}>
                Play Audio
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text style={[styles.messageTime, isOwn ? styles.ownMessageTime : styles.otherMessageTime]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ title: chatTitle }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation!</Text>
              </View>
            }
          />
        )}

        {/* Pending media preview */}
        {pendingMedia && (
          <View style={styles.pendingMediaBar}>
            <Ionicons
              name={pendingMedia.type === 'video' ? 'videocam' : 'musical-notes'}
              size={20}
              color="#007AFF"
            />
            <Text style={styles.pendingMediaLabel} numberOfLines={1}>
              {pendingMedia.label}
            </Text>
            <TouchableOpacity onPress={removePendingMedia}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputContainer}>
          {/* Attachment: video */}
          <TouchableOpacity style={styles.attachButton} onPress={pickVideo} disabled={sending}>
            <Ionicons name="videocam-outline" size={24} color="#007AFF" />
          </TouchableOpacity>

          {/* Attachment: audio */}
          <TouchableOpacity style={styles.attachButton} onPress={pickAudio} disabled={sending}>
            <Ionicons name="musical-notes-outline" size={24} color="#007AFF" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            editable={!sending}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              ((!newMessage.trim() && !pendingMedia) || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={(!newMessage.trim() && !pendingMedia) || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList: { padding: 16, flexGrow: 1 },
  messageContainer: { marginBottom: 12, maxWidth: '80%' },
  ownMessage: { alignSelf: 'flex-end' },
  otherMessage: { alignSelf: 'flex-start' },
  messageBubble: { padding: 12, borderRadius: 16 },
  ownBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  ownMessageText: { color: '#fff' },
  otherMessageText: { color: '#333' },
  messageTime: { fontSize: 11, marginTop: 4 },
  ownMessageTime: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  otherMessageTime: { color: '#999' },

  // Media in messages
  mediaAttachment: { marginTop: 8, borderRadius: 8, overflow: 'hidden' },
  videoPlayer: { width: 220, height: 140, borderRadius: 8 },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 6,
    gap: 8,
  },
  audioButtonOwn: { backgroundColor: 'rgba(255,255,255,0.2)' },
  audioButtonOther: { backgroundColor: '#f0f0f0' },
  audioLabel: { fontSize: 14 },
  audioLabelOwn: { color: '#fff' },
  audioLabelOther: { color: '#333' },

  // Pending media bar above input
  pendingMediaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  pendingMediaLabel: { flex: 1, fontSize: 13, color: '#333' },

  // Input row
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  attachButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, color: '#999', fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 8 },
});
