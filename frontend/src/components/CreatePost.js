import React, { useState, useEffect } from 'react';
import { postService } from '../services/postService';
import { mediaService } from '../services/mediaService';
import './CreatePost.css';

const CreatePost = ({ onPostCreated, onCancel, isHelpSection }) => {
  const [content, setContent] = useState('');
  const [isHelp, setIsHelp] = useState(isHelpSection || false);
  const [showInHome, setShowInHome] = useState(true);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreview, setMediaPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const handleMediaChange = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length > 4) {
      setError('You can upload maximum 4 files');
      return;
    }

    setError('');
    
    const previews = [];
    const selectedFiles = [];
    
    try {
      for (const file of files) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) {
          setError(`File ${file.name} is not a valid image or video`);
          return;
        }
        const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          setError(`File ${file.name} is too large. Max size is ${isVideo ? '50MB' : '10MB'}`);
          return;
        }

        const previewUrl = URL.createObjectURL(file);
        selectedFiles.push(file);
        previews.push({
          type: isImage ? 'image' : 'video',
          url: previewUrl,
          name: file.name
        });
      }
      
      setMediaFiles(selectedFiles);
      setMediaPreview(previews);
    } catch (err) {
      setError('Failed to process media files. Please try again.');
      console.error('Media processing error:', err);
    }
  };

  const handleRemoveMedia = (index) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreview(mediaPreview.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => {
      mediaPreview.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [mediaPreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Post content cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let mediaUrls = [];
      if (mediaFiles.length > 0) {
        setUploadingMedia(true);
        const uploads = await mediaService.uploadMediaFiles(mediaFiles, 'posts');
        mediaUrls = uploads.map((upload) => upload.url);
      }

      await postService.createPost(content, isHelp, mediaUrls, showInHome);
      setContent('');
      setMediaFiles([]);
      setMediaPreview([]);
      onPostCreated();
    } catch (err) {
      setError(err.response?.data || 'Failed to create post. Please try again.');
    } finally {
      setUploadingMedia(false);
      setLoading(false);
    }
  };

  return (
    <div className="create-post-card">
      <h3>Create a Post</h3>
      
      {error && <div className="error-message">{error}</div>}
      {uploadingMedia && <div className="info-message">Uploading media files...</div>}
      
      <form onSubmit={handleSubmit}>
        <textarea
          className="post-textarea"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows="4"
          disabled={loading}
          required
        />
        
        {mediaPreview.length > 0 && (
          <div className="media-preview-container">
            {mediaPreview.map((media, index) => (
              <div key={index} className="media-preview-item">
                {media.type === 'image' ? (
                  <img src={media.url} alt={media.name} className="media-preview-img" />
                ) : (
                  <video src={media.url} className="media-preview-video" controls />
                )}
                <button
                  type="button"
                  className="media-remove-btn"
                  onClick={() => handleRemoveMedia(index)}
                  disabled={loading || uploadingMedia}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="create-post-footer">
          <div className="create-post-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isHelp}
                onChange={(e) => setIsHelp(e.target.checked)}
                disabled={loading}
              />
              Mark as Help Request
            </label>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showInHome}
                onChange={(e) => setShowInHome(e.target.checked)}
                disabled={loading}
              />
              Show in Home Page
            </label>
            
            <label className="file-upload-label">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaChange}
                disabled={loading || uploadingMedia}
                style={{ display: 'none' }}
              />
              <span className="upload-btn">
                {uploadingMedia ? '⏳ Uploading...' : '📎 Add Photo/Video'}
              </span>
            </label>
          </div>
          
          <div className="create-post-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || uploadingMedia}
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
