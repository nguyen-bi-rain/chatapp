import { axiosInstance } from "../config/axiosConfig";

export const roomService = {
  async getRooms() {
    try {
        const response = await axiosInstance.get('/rooms/public');
        return response.data;
    }catch (error) {
        console.error("Error fetching rooms:", error);
        throw error;
    }
  },
  async createRoom(data: any) {
    try {
      const response = await axiosInstance.post('/rooms', data);
      return response.data;
    } catch (error) {
      console.error("Error creating room:", error);
      throw error;
    }
  }
};
