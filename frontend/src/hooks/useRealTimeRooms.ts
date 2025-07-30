// useRealTimeRooms.ts
import { useEffect, useState } from 'react';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  room: string;
  sender: {
    id: string;
    username: string;
    email: string;
  };
}

export const useRealTimeRooms = () => {
  const { user, isAuthenticated } = useAuth();
  const [subscribedRooms, setSubscribedRooms] = useState<string[]>([]);
  const [roomMessages, setRoomMessages] = useState<Map<string, Message[]>>(new Map());
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string[]>>(new Map());

  // Subscribe to user's rooms on authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchUserRooms = async () => {
        try {
          const response = await fetch('/api/socket/user-rooms', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const data = await response.json();
          setSubscribedRooms(data.subscribedRooms);
        } catch (error) {
          console.error('Failed to fetch user rooms:', error);
        }
      };

      fetchUserRooms();
    }
  }, [isAuthenticated, user]);

  // Setup real-time message listeners for all subscribed rooms
  useEffect(() => {
    if (!socketService.getSocket()) return;

    const handleMessage = (messageData: Message) => {
      setRoomMessages(prev => {
        const newMap = new Map(prev);
        const roomMessages = newMap.get(messageData.room) || [];
        newMap.set(messageData.room, [...roomMessages, messageData]);
        return newMap;
      });
    };

    const handleUserJoined = (data: any) => {
      // Update online users for the room
      if (data.room) {
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          const roomUsers = newMap.get(data.room) || [];
          if (!roomUsers.includes(data.username)) {
            newMap.set(data.room, [...roomUsers, data.username]);
          }
          return newMap;
        });
      }
    };

    const handleUserLeft = (data: any) => {
      // Remove user from online users for the room
      if (data.room) {
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          const roomUsers = newMap.get(data.room) || [];
          newMap.set(data.room, roomUsers.filter(username => username !== data.username));
          return newMap;
        });
      }
    };

    const handleRoomJoinedApi = (data: any) => {
      if (!subscribedRooms.includes(data.room)) {
        setSubscribedRooms(prev => [...prev, data.room]);
      }
    };

    const handleRoomLeftApi = (data: any) => {
      setSubscribedRooms(prev => prev.filter(room => room !== data.room));
      setRoomMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.room);
        return newMap;
      });
    };

    // Listen to events
    socketService.onMessage(handleMessage);
    socketService.onUserJoined(handleUserJoined);
    socketService.onUserLeft(handleUserLeft);

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('room_joined_api', handleRoomJoinedApi);
      socket.on('room_left_api', handleRoomLeftApi);
      socket.on('notification', (notification) => {
        console.log('Received notification:', notification);
        // Handle notifications as needed
      });
    }

    return () => {
      if (socket) {
        socket.off('room_joined_api', handleRoomJoinedApi);
        socket.off('room_left_api', handleRoomLeftApi);
        socket.off('notification');
      }
    };
  }, [subscribedRooms]);

  // Join a room
  const joinRoom = async (roomName: string) => {
    try {
      // Join via API
      await fetch('/api/socket/join-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ roomName })
      });

      // Join via socket
      socketService.joinRoom(roomName);
      setActiveRoom(roomName);

      // Load room history
      const response = await fetch(`/api/messages/room/${roomName}?limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      setRoomMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(roomName, data.messages || []);
        return newMap;
      });

    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  // Leave a room
  const leaveRoom = async (roomName: string) => {
    try {
      // Leave via API
      await fetch('/api/socket/leave-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ roomName })
      });

      // Leave via socket
      socketService.leaveRoom();
      
      if (activeRoom === roomName) {
        setActiveRoom(null);
      }

    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  };

  // Send message to current active room
  const sendMessage = (message: string) => {
    if (activeRoom) {
      socketService.sendMessage(message, activeRoom);
    }
  };

  // Send message to specific room
  const sendMessageToRoom = (message: string, roomName: string) => {
    socketService.sendMessage(message, roomName);
  };

  // Get messages for a specific room
  const getRoomMessages = (roomName: string): Message[] => {
    return roomMessages.get(roomName) || [];
  };

  // Get online users for a specific room
  const getRoomOnlineUsers = (roomName: string): string[] => {
    return onlineUsers.get(roomName) || [];
  };

  // Get all messages across all rooms (for global view)
  const getAllMessages = (): Message[] => {
    const allMessages: Message[] = [];
    roomMessages.forEach(messages => {
      allMessages.push(...messages);
    });
    return allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  return {
    subscribedRooms,
    activeRoom,
    setActiveRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendMessageToRoom,
    getRoomMessages,
    getRoomOnlineUsers,
    getAllMessages,
    roomMessages: roomMessages.get(activeRoom || '') || [],
    onlineUsers: onlineUsers.get(activeRoom || '') || []
  };
};
