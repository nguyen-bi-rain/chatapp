import { axiosInstance } from "../config/axiosConfig";

export const authService = {
    async login(email: string, password: string) {
        try {
            const response = await axiosInstance.post('/auth/login', { email, password });
            return response.data;
        } catch (error) {
            console.error("Error during login:", error);
            throw error;
        }
    },
    async register(username : string, password: string, email: string) {
        try {
            const response = await axiosInstance.post('/auth/register', { username, password, email });
            return response.data;
        } catch (error) {
            console.error("Error during registration:", error);
            throw error;
        }
    },
    async logout() {
        try {
            await axiosInstance.post('/auth/logout');
            window.localStorage.removeItem('token');
        } catch (error) {
            console.error("Error during logout:", error);
            throw error;
        }
    },
}