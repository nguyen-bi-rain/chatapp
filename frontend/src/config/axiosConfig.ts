import axios from "axios";

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Include credentials for cross-origin requests
    timeout: 10000, // Set a timeout for requests
})

axiosInstance.interceptors.request.use(
    config => {
        // Add token to headers if available
        const token = window.localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        // Handle request errors
        return Promise.reject(error);
    }
)

axiosInstance.interceptors.response.use(
    response => {
        // Handle successful responses
        if(response.status === 401) {
            // Handle unauthorized access, e.g., redirect to login
            window.localStorage.removeItem('token');
            // window.location.href = '/login';
        }
        return response;
    },
    error => {
        // Handle errors
        return Promise.reject(error);
    }
);

export { axiosInstance };

