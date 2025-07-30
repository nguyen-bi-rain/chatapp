// ChatContainer.tsx
import React, { useState } from 'react';
import ListRoom from './ListRoom';
import Room from './Room';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

const ChatContainer: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeRoom, setActiveRoom] = useState<string>('general');

  const handleRoomSelect = (roomName: string) => {
    setActiveRoom(roomName);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Welcome to Chat App
          </h2>
          <p className="text-gray-600">
            Please log in to access the chat rooms
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar with room list */}
      <div className='w-32'>
        <Navbar/>
      </div>
      <div className="w-80 bg-white shadow-lg">
        <ListRoom 
          onRoomSelect={handleRoomSelect}
          activeRoom={activeRoom}
        />
      </div>
      
      {/* Main chat area */}
      <div className="flex-1">
        <Room roomName={activeRoom} />
      </div>
    </div>
  );
};

export default ChatContainer;
