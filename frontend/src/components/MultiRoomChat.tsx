// MultiRoomChat.tsx
import React, { useEffect, useState } from 'react';
import { useRealTimeRooms } from '../hooks/useRealTimeRooms';
import { socketService } from '../services/socketService';

interface Room {
  _id: string;
  name: string;
  description?: string;
  participants: any[];
  messageCount: number;
  lastActivity: string;
}

const MultiRoomChat: React.FC = () => {
  const {
    subscribedRooms,
    activeRoom,
    setActiveRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendMessageToRoom,
    getRoomMessages,
    getRoomOnlineUsers,
    getAllMessages
  } = useRealTimeRooms();

  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // Connect to socket when component mounts
  useEffect(() => {
    const connectSocket = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await socketService.connect(token);
          setIsConnected(true);
        } catch (error) {
          console.error('Failed to connect to socket:', error);
        }
      }
    };

    connectSocket();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/rooms', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setAvailableRooms(data.rooms || []);
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      }
    };

    if (isConnected) {
      fetchRooms();
    }
  }, [isConnected]);

  const handleSendMessage = () => {
    if (newMessage.trim() && activeRoom) {
      sendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleCreateRoom = async () => {
    if (newRoomName.trim()) {
      try {
        const response = await fetch('/api/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ name: newRoomName })
        });
        
        if (response.ok) {
          const data = await response.json();
          setAvailableRooms(prev => [...prev, data.room]);
          setNewRoomName('');
          // Auto-join the newly created room
          await joinRoom(data.room.name);
        }
      } catch (error) {
        console.error('Failed to create room:', error);
      }
    }
  };

  const handleJoinRoom = async (roomName: string) => {
    await joinRoom(roomName);
  };

  const handleLeaveRoom = async (roomName: string) => {
    await leaveRoom(roomName);
  };

  const activeRoomMessages = activeRoom ? getRoomMessages(activeRoom) : [];
  const activeRoomOnlineUsers = activeRoom ? getRoomOnlineUsers(activeRoom) : [];

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* Sidebar - Room List */}
      <div style={{ width: '300px', borderRight: '1px solid #ccc', padding: '20px' }}>
        <h2>Chat Rooms</h2>
        
        {/* Connection Status */}
        <div style={{ 
          padding: '8px', 
          borderRadius: '4px', 
          marginBottom: '16px',
          backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
          color: isConnected ? '#155724' : '#721c24'
        }}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>

        {/* Create New Room */}
        <div style={{ marginBottom: '20px' }}>
          <h4>Create Room</h4>
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name"
            style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
          />
          <button 
            onClick={handleCreateRoom}
            style={{ width: '100%', padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Create Room
          </button>
        </div>

        {/* Available Rooms */}
        <div>
          <h4>Available Rooms</h4>
          {availableRooms.map((room) => (
            <div 
              key={room._id} 
              style={{ 
                padding: '12px', 
                marginBottom: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                backgroundColor: activeRoom === room.name ? '#e3f2fd' : 'white',
                cursor: 'pointer'
              }}
              onClick={() => setActiveRoom(room.name)}
            >
              <div style={{ fontWeight: 'bold' }}>{room.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {room.participants?.length || 0} participants
              </div>
              <div style={{ marginTop: '8px' }}>
                {subscribedRooms.includes(room.name) ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeaveRoom(room.name);
                    }}
                    style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px' }}
                  >
                    Leave
                  </button>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinRoom(room.name);
                    }}
                    style={{ padding: '4px 8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px' }}
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Subscribed Rooms */}
        <div style={{ marginTop: '20px' }}>
          <h4>Joined Rooms ({subscribedRooms.length})</h4>
          {subscribedRooms.map((roomName) => (
            <div 
              key={roomName}
              style={{ 
                padding: '8px', 
                marginBottom: '4px', 
                backgroundColor: activeRoom === roomName ? '#fff3cd' : '#f8f9fa',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => setActiveRoom(roomName)}
            >
              {roomName} {getRoomMessages(roomName).length > 0 && `(${getRoomMessages(roomName).length})`}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid #ccc', 
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0 }}>#{activeRoom}</h3>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Online: {activeRoomOnlineUsers.length} users
                {activeRoomOnlineUsers.length > 0 && (
                  <span style={{ marginLeft: '8px' }}>
                    ({activeRoomOnlineUsers.join(', ')})
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '16px',
              backgroundColor: '#fff'
            }}>
              {activeRoomMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                activeRoomMessages.map((message, index) => (
                  <div 
                    key={message.id || index} 
                    style={{ 
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '4px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>{message.sender?.username || message.username}</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>{message.message}</div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div style={{ 
              padding: '16px', 
              borderTop: '1px solid #ccc',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Send a message to #${activeRoom}`}
                  style={{ 
                    flex: 1, 
                    padding: '12px', 
                    borderRadius: '20px',
                    border: '1px solid #ddd',
                    outline: 'none'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  style={{ 
                    padding: '12px 24px', 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '20px',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                    opacity: newMessage.trim() ? 1 : 0.6
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#666',
            fontSize: '18px'
          }}>
            Select a room to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiRoomChat;
