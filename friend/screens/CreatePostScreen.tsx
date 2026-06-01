import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Video, Audio, ResizeMode } from 'expo-av';
import postService from '../services/postService';

type MediaItem = {
  uri: string;
  base64: string; // full data URI with prefix
  type: 'image' | 'video' | 'audio';
  label?: string; // filename for audio
};

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [isHelpSection, setIsHelpSection] = useState(false);
  const [showInHome, setShowInHome] = useState(true);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // ── Pickers ───────────────────────────────────────────────────────────────

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant media library permission.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          setMedia({ uri: asset.uri, base64: `data:${mime};base64,${asset.base64}`, type: 'image' });
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant media library permission.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
        videoMaxDuration: 120,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setMedia({ uri: asset.uri, base64: `data:video/mp4;base64,${asset.base64}`, type: 'video' });
        } else {
          Alert.alert('Not Supported', 'Base64 encoding unavailable for this video. Try a shorter clip.');
        }
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

      // Convert file URI → base64 via fetch + FileReader
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setMedia({
          uri: asset.uri,
          base64,
          type: 'audio',
          label: asset.name || 'Audio file',
        });
      };
      reader.readAsDataURL(blob);
    } catch {
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const removeMedia = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setMedia(null);
  };

  // ── Audio preview playback ────────────────────────────────────────────────

  const previewAudio = async () => {
    if (!media || media.type !== 'audio') return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: media.uri }, { shouldPlay: true });
      soundRef.current = sound;
    } catch {
      Alert.alert('Error', 'Could not play audio preview');
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter post content');
      return;
    }
    setLoading(true);
    try {
      const postData: any = { content, isHelpSection, showInHome };
      if (media) {
        postData.mediaUrls = [media.base64];
      }
      await postService.createPost(postData);
      Alert.alert('Success', 'Post created successfully!');
      setContent('');
      await removeMedia();
      setIsHelpSection(false);
      setShowInHome(true);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.postButton, loading && styles.postButtonDisabled]}>
              {loading ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Text input */}
          <TextInput
            style={styles.textArea}
            placeholder="What's on your mind?"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            editable={!loading}
          />

          {/* Media preview */}
          {media && (
            <View style={styles.mediaContainer}>
              {media.type === 'image' && (
                <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
              )}
              {media.type === 'video' && (
                <Video
                  source={{ uri: media.uri }}
                  style={styles.mediaPreview}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls
                />
              )}
              {media.type === 'audio' && (
                <TouchableOpacity style={styles.audioPreview} onPress={previewAudio}>
                  <Ionicons name="musical-notes" size={32} color="#007AFF" />
                  <View style={styles.audioPreviewText}>
                    <Text style={styles.audioFileName} numberOfLines={1}>
                      {media.label}
                    </Text>
                    <Text style={styles.audioHint}>Tap to preview</Text>
                  </View>
                  <Ionicons name="play-circle" size={36} color="#007AFF" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={removeMedia}
                disabled={loading}
              >
                <Ionicons name="close-circle" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Media picker buttons — 3 in a row */}
          <View style={styles.mediaButtonRow}>
            <TouchableOpacity
              style={styles.mediaPickerButton}
              onPress={pickImage}
              disabled={loading}
            >
              <Ionicons name="image-outline" size={20} color="#007AFF" />
              <Text style={styles.mediaPickerText}>
                {media?.type === 'image' ? 'Change' : 'Photo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mediaPickerButton}
              onPress={pickVideo}
              disabled={loading}
            >
              <Ionicons name="videocam-outline" size={20} color="#007AFF" />
              <Text style={styles.mediaPickerText}>
                {media?.type === 'video' ? 'Change' : 'Video'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mediaPickerButton}
              onPress={pickAudio}
              disabled={loading}
            >
              <Ionicons name="musical-notes-outline" size={20} color="#007AFF" />
              <Text style={styles.mediaPickerText}>
                {media?.type === 'audio' ? 'Change' : 'Audio'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toggles */}
          <View style={styles.option}>
            <View>
              <Text style={styles.optionLabel}>Mark as Help Request</Text>
              <Text style={styles.optionDescription}>Post this in the Help section</Text>
            </View>
            <Switch value={isHelpSection} onValueChange={setIsHelpSection} disabled={loading} />
          </View>

          <View style={styles.option}>
            <View>
              <Text style={styles.optionLabel}>Show in Home Page</Text>
              <Text style={styles.optionDescription}>Display this post on the home feed</Text>
            </View>
            <Switch value={showInHome} onValueChange={setShowInHome} disabled={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  cancelButton: { fontSize: 16, color: '#666' },
  postButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  postButtonDisabled: { opacity: 0.5 },
  content: { flex: 1 },
  textArea: {
    backgroundColor: '#fff',
    padding: 16,
    fontSize: 16,
    minHeight: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mediaContainer: {
    position: 'relative',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mediaPreview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#cce0ff',
  },
  audioPreviewText: { flex: 1 },
  audioFileName: { fontSize: 15, fontWeight: '500', color: '#333' },
  audioHint: { fontSize: 12, color: '#007AFF', marginTop: 2 },
  removeMediaButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },
  mediaButtonRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fff',
    padding: 12,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 8,
  },
  mediaPickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 5,
  },
  mediaPickerText: { fontSize: 13, color: '#007AFF', fontWeight: '500' },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  optionLabel: { fontSize: 16, fontWeight: '500', color: '#333' },
  optionDescription: { fontSize: 13, color: '#666', marginTop: 2 },
});
