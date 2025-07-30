import React, { createContext, useContext, useState, useEffect, type ReactNode, useMemo } from 'react';
import { axiosInstance } from '../config/axiosConfig';

interface User {
    id: string;
    username: string;
    email: string;
    room: string | null;
    isOnline: boolean;
    lastSeen: string;
    createdAt: string;
}


interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
        if (token) {
            // Verify token and get user data
            // This should be replaced with actual API call
            try {
                const res = await axiosInstance.get('/auth/me', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });
                setUser(res.data);
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
        }
        fetchUser();
    }, []);


    const value: AuthContextType = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated: !!user,
    }), [user, isLoading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};