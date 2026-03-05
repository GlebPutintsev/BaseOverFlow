import api from './client'

export const uploadsApi = {
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<{ url: string }>('/upload/image', formData, {
      headers: { 'Content-Type': undefined },   // let browser set multipart boundary
    })
    return response.data.url
  },
}
