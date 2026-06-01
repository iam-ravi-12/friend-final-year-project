import api from './api';

export const mediaService = {
  uploadMediaFiles: async (files, folder = 'uploads') => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await api.post(`/media/upload/batch?folder=${encodeURIComponent(folder)}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadMediaFile: async (file, folder = 'uploads') => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/media/upload?folder=${encodeURIComponent(folder)}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
