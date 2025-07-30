import { axiosInstance } from "../config/axiosConfig"

export const messageService = {
    async getRoomMessages(roomId: string) {
        try {
            const response = await axiosInstance.get(`/messages/room/${roomId}`, {
                params:{
                    limit: 50,
                    skip: 0
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching room messages:", error);
            throw error;
        }

    },
    async sendMessage(roomName : string, content: string, messageType: string, replyTo: string, mentions: string[]) {
        try {
            const response = await axiosInstance.post('/messages', {
                roomName: roomName,
                content : content,
                messageType : messageType || 'text',
                replyTo : replyTo || null,
                mentions : mentions
            });
            return response.data;
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
        
    }
}