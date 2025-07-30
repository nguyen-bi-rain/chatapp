// RealTimeChat.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socketService';

interface Message {
  id: string;
  content: string;
  username: string;
  timestamp: string;
  room: string;
  sender: {
    id: string;
    username: string;
    email: string;
  };
}

interface Room {
  _id: string;
  name: string;
  description?: string;
  participants: any[];
  messageCount: number;
  lastActivity: string;
}

const RealTimeChat: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string>('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to socket when user is authenticated
  useEffect(() => {
    const connectSocket = async () => {
      if (isAuthenticated && user) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            await socketService.connect(token);
            setIsConnected(true);
            
            // Join default room
            socketService.joinRoom(activeRoom);
            setJoinedRooms([activeRoom]);
            
            // Load initial messages
            await loadRoomMessages(activeRoom);
            
          } catch (error) {
            console.error('Failed to connect to socket:', error);
            setIsConnected(false);
          }
        }
      }
    };

    connectSocket();

    return () => {
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  // Set up real-time message listeners
  useEffect(() => {
    if (!isConnected) return;

    const handleMessage = (messageData: any) => {
      console.log('Received message:', messageData);
      
      // Add message to the appropriate room
      if (messageData.room === activeRoom) {
        setMessages(prev => [...prev, {
          id: messageData.id || Date.now().toString(),
          content: messageData.message || messageData.content,
          username: messageData.sender?.username || messageData.username,
          timestamp: messageData.timestamp,
          room: messageData.room,
          sender: messageData.sender || {
            id: messageData.userId,
            username: messageData.username,
            email: ''
          }
        }]);
      }
    };

    const handleUserJoined = (data: any) => {
      console.log('User joined:', data);
      if (data.room === activeRoom && !onlineUsers.includes(data.username)) {
        setOnlineUsers(prev => [...prev, data.username]);
      }
    };

    const handleUserLeft = (data: any) => {
      console.log('User left:', data);
      if (data.room === activeRoom) {
        setOnlineUsers(prev => prev.filter(username => username !== data.username));
      }
    };

    const handleUserStatusChange = (data: any) => {
      console.log('User status change:', data);
      // Update online users based on status
      if (data.status === 'online' && !onlineUsers.includes(data.username)) {
        setOnlineUsers(prev => [...prev, data.username]);
      } else if (data.status === 'offline') {
        setOnlineUsers(prev => prev.filter(username => username !== data.username));
      }
    };

    const handleNotification = (notification: any) => {
      console.log('Received notification:', notification);
      // You can show toast notifications here
    };

    // Register event listeners
    socketService.onMessage(handleMessage);
    socketService.onUserJoined(handleUserJoined);
    socketService.onUserLeft(handleUserLeft);
    socketService.on('user_status_change', handleUserStatusChange);
    socketService.onNotification(handleNotification);

    return () => {
      // Clean up listeners
      socketService.removeAllListeners('message');
      socketService.removeAllListeners('user_joined');
      socketService.removeAllListeners('user_left');
      socketService.removeAllListeners('user_status_change');
      socketService.removeAllListeners('notification');
    };
  }, [isConnected, activeRoom, onlineUsers]);

  // Load room messages
  const loadRoomMessages = async (roomName: string) => {
    try {
      const response = await fetch(`/api/messages/room/${roomName}?limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load room messages:', error);
    }
  };

  // Load available rooms
  useEffect(() => {
    const loadRooms = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await fetch('/api/rooms', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setRooms(data.rooms || []);
        }
      } catch (error) {
        console.error('Failed to load rooms:', error);
      }
    };

    loadRooms();
  }, [isAuthenticated]);

  // Join a room
  const joinRoom = async (roomName: string) => {
    if (!isConnected) return;
    
    try {
      // Join via socket
      socketService.joinRoom(roomName);
      
      // Update state
      setActiveRoom(roomName);
      if (!joinedRooms.includes(roomName)) {
        setJoinedRooms(prev => [...prev, roomName]);
      }
      
      // Load room messages
      await loadRoomMessages(roomName);
      
      // Clear online users for new room
      setOnlineUsers([]);
      
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  // Send message
  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;
    
    socketService.sendMessage(newMessage, activeRoom);
    setNewMessage('');
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Please log in to access the chat
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Sidebar */}
      <div style={{ 
        width: '280px', 
        backgroundColor: '#2c3e50', 
        color: 'white',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid #34495e',
          backgroundColor: '#1a252f'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Chat Rooms</h2>
          <div style={{ 
            marginTop: '8px',
            fontSize: '12px',
            color: isConnected ? '#2ecc71' : '#e74c3c'
          }}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>

        {/* User Info */}
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid #34495e',
          backgroundColor: '#243342'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {user?.username || 'User'}
          </div>
          <div style={{ fontSize: '12px', color: '#bdc3c7' }}>
            {user?.email || ''}
          </div>
        </div>

        {/* Rooms List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px 0' }}>
            <div style={{ 
              padding: '0 20px 12px', 
              fontSize: '12px', 
              color: '#95a5a6',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}>
              Available Rooms
            </div>
            
            {rooms.map((room) => (
              <div
                key={room._id}
                onClick={() => joinRoom(room.name)}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  backgroundColor: activeRoom === room.name ? '#3498db' : 'transparent',
                  borderLeft: activeRoom === room.name ? '4px solid #2980b9' : '4px solid transparent',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (activeRoom !== room.name) {
                    e.currentTarget.style.backgroundColor = '#34495e';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeRoom !== room.name) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  #{room.name}
                </div>
                <div style={{ fontSize: '12px', color: '#bdc3c7', marginTop: '2px' }}>
                  {room.participants?.length || 0} members
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div style={{ 
          borderTop: '1px solid #34495e',
          padding: '16px',
          backgroundColor: '#243342'
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#95a5a6',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '8px'
          }}>
            Online in #{activeRoom} ({onlineUsers.length})
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {onlineUsers.map((username, index) => (
              <div key={index} style={{ 
                fontSize: '13px', 
                padding: '2px 0',
                color: '#ecf0f1'
              }}>
                🟢 {username}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: 'white'
      }}>
        {/* Chat Header */}
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid #ecf0f1',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: 0, color: '#2c3e50' }}>
            #{activeRoom}
          </h3>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginTop: '4px' }}>
            {messages.length} messages • {onlineUsers.length} online
          </div>
        </div>

        {/* Messages */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px',
          backgroundColor: '#fafafa'
        }}>
          {messages.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#95a5a6', 
              marginTop: '100px',
              fontSize: '16px'
            }}>
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={message.id || index} 
                style={{ 
                  marginBottom: '16px',
                  padding: '12px 16px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '1px solid #ecf0f1'
                }}
              >
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: '#2c3e50',
                    fontSize: '14px'
                  }}>
                    {message.username}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#95a5a6'
                  }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ 
                  color: '#34495e',
                  lineHeight: '1.4',
                  fontSize: '14px'
                }}>
                  {message.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div style={{ 
          padding: '20px', 
          borderTop: '1px solid #ecf0f1',
          backgroundColor: 'white'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Send a message to #${activeRoom}`}
              disabled={!isConnected}
              style={{ 
                flex: 1, 
                padding: '12px 16px', 
                borderRadius: '24px',
                border: '2px solid #ecf0f1',
                outline: 'none',
                fontSize: '14px',
                backgroundColor: !isConnected ? '#f8f9fa' : 'white'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3498db';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#ecf0f1';
              }}
            />
            <button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || !isConnected}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: !newMessage.trim() || !isConnected ? '#bdc3c7' : '#3498db', 
                color: 'white', 
                border: 'none', 
                borderRadius: '24px',
                cursor: !newMessage.trim() || !isConnected ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (newMessage.trim() && isConnected) {
                  e.currentTarget.style.backgroundColor = '#2980b9';
                }
              }}
              onMouseLeave={(e) => {
                if (newMessage.trim() && isConnected) {
                  e.currentTarget.style.backgroundColor = '#3498db';
                }
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeChat;
