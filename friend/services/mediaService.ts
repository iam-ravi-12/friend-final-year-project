import api from './api';

export type MediaCategory = 'image' | 'video' | 'audio';

export interface MediaUploadResult {
  url: string;
  mediaType: MediaCategory;
}

export interface UploadableFile {
  uri: string;
  mimeType: string;
  name: string;
}

const mediaService = {
  uploadMedia: async (file: UploadableFile, folder: string): Promise<MediaUploadResult> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.mimeType,
      name: file.name,
    } as any);

    const response = await api.post<MediaUploadResult>(
      `/api/media/upload?folder=${encodeURIComponent(folder)}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};

export default mediaService;
