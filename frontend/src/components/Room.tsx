import React, { useEffect, useState, useRef } from "react";
import { messageService } from "../services/messageService";
import { useAuth } from "../context/AuthContext";
import { socketService } from "../services/socketService";

interface RoomProps {
  roomName?: string;
}

interface Message {
  _id: string;
  content: string;
  sender: {
    id: string;
    username: string;
  };
  createdAt: string;
}

const Room: React.FC<RoomProps> = ({ roomName = "test" }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number>(0);

  const dateFormat = (date: string) => {
    const today = new Date().toDateString();
    const messageDate = new Date(date);
    const messageDateString = messageDate.toDateString();

    if (today === messageDateString) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      return messageDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    }
  };

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        console.log('📥 Loading initial messages for room:', roomName);
        const res = await messageService.getRoomMessages(roomName);
        console.log('📥 Loaded messages:', res.messages?.length || 0);
        setMessages(res.messages || []);
      } catch (error) {
        console.error("❌ Error fetching messages:", error);
      }
    };
    fetchMessages();
  }, [roomName]);

  // Connect to socket when component mounts
  useEffect(() => {
    const connectSocket = async () => {
      const token = localStorage.getItem('token');
      if (token && user) {
        try {
          console.log('🔌 Connecting to socket...');
          await socketService.connect(token);
          setIsConnected(true);
          
          // Join the room after connection
          socketService.joinRoom(roomName);
          console.log(`🏠 Joined room: ${roomName}`);
          
        } catch (error) {
          console.error('❌ Failed to connect to socket:', error);
          setIsConnected(false);
        }
      }
    };

    connectSocket();

    return () => {
      // Clean up when component unmounts or room changes
      socketService.removeAllListeners('receive_message');
      socketService.removeAllListeners('user_joined');
      socketService.removeAllListeners('user_left');
      socketService.removeAllListeners('room_joined');
      socketService.removeAllListeners('user_typing');
    };
  }, [user, roomName]);

  // Set up real-time message listeners
  useEffect(() => {
    if (!isConnected) {
      return;
    }


    // Handle incoming messages
    const handleMessage = (messageData: any) => {
      
      // Only add message if it's for the current room
      if (messageData.room === roomName || !messageData.room) {
        const newMsg: Message = {
          _id: messageData.id || Date.now().toString(),
          content: messageData.message || messageData.content,
          sender: {
            id: messageData.sender?.id || messageData.userId || 'unknown',
            username: messageData.sender?.username || messageData.username || 'Unknown'
          },
          createdAt: messageData.timestamp || new Date().toISOString()
        };
        
        // Add message to state
        setMessages((prev) => {
          // Prevent duplicate messages
          const exists = prev.some(msg => msg._id === newMsg._id);
          if (exists) return prev;
          
          return [...prev, newMsg];
        });
      }
    };

    // Handle user joined
    const handleUserJoined = (data: any) => {
      if (data.room === roomName && data.username !== user?.username) {
        setOnlineUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      }
    };

    // Handle user left
    const handleUserLeft = (data: any) => {
      if (data.room === roomName) {
        setOnlineUsers(prev => prev.filter(username => username !== data.username));
      }
    };

    // Handle room joined confirmation
    const handleRoomJoined = (data: any) => {
      if (data.recentMessages) {
        setMessages(data.recentMessages);
      }
    };

    // Handle typing indicators
    const handleTyping = (data: any) => {
      if (data.username !== user?.username) {
        if (data.isTyping) {
          setTypingUsers(prev => {
            if (!prev.includes(data.username)) {
              return [...prev, data.username];
            }
            return prev;
          });
        } else {
          setTypingUsers(prev => prev.filter(u => u !== data.username));
        }
      }
    };

    // Register event listeners
    socketService.onMessage(handleMessage);
    socketService.onUserJoined(handleUserJoined);
    socketService.onUserLeft(handleUserLeft);
    socketService.onRoomJoined(handleRoomJoined);
    socketService.onTyping(handleTyping);

    return () => {
      socketService.removeAllListeners('receive_message');
      socketService.removeAllListeners('user_joined');
      socketService.removeAllListeners('user_left');
      socketService.removeAllListeners('room_joined');
      socketService.removeAllListeners('user_typing');
    };
  }, [isConnected, roomName, user?.username]);

  // Handle message sending
  const handleSendMessage = async () => {
    try {
      if (!newMessage.trim() || newMessage.length >= 200) return;
      
      
      // Stop typing indicator
      if (isTyping) {
        socketService.sendTyping(roomName, false);
        setIsTyping(false);
      }
      
      if (isConnected) {
        // Send via socket for real-time delivery
        socketService.sendMessage(newMessage, roomName);
        setNewMessage("");
        
      } else {
        const response = await messageService.sendMessage(roomName, newMessage, "text", '', []);
        setMessages((prevMessages) => [...prevMessages, response]);
        setNewMessage("");
      }
    }
    catch (error) {
      console.error("❌ Error sending message:", error);
    }
  };

  // Handle typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (!isTyping && e.target.value.length > 0 && isConnected) {
      setIsTyping(true);
      socketService.sendTyping(roomName, true);
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && isConnected) {
        setIsTyping(false);
        socketService.sendTyping(roomName, false);
      }
    }, 1000);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div>
      <div className="flex flex-col h-screen ml-2">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 shadow-md">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">#{roomName}</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm">
                {onlineUsers.length} online
              </span>
              <div className={`text-xs px-2 py-1 rounded ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
            </div>
          </div>
          
          {/* Online users list */}
          {onlineUsers.length > 0 && (
            <div className="text-xs mt-2 opacity-75">
              Online: {onlineUsers.join(', ')}
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message: Message) => (
            <div
              key={message._id}
              className={`flex ${
                message.sender.id === user?.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 rounded-lg max-w-xs ${
                  message.sender.id === user?.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <span
                  className={`text-xs mt-1 block ${
                    message.sender.id === user?.id
                      ? "text-blue-200"
                      : "text-gray-500"
                  }`}
                >
                  {message.sender.id === user?.id ? "You" : message.sender.username} •{" "}
                  {dateFormat(message.createdAt)}
                </span>
              </div>
            </div>
          ))}
          
          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-600 p-2 rounded-lg text-sm italic">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-gray-100 p-4 border-t">
          <div className="flex space-x-2">
            <input
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              type="text"
              placeholder={`Type your message to #${roomName}...`}
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              className={`px-4 py-2 rounded-lg transition-colors ${
                newMessage.trim() 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              Send
            </button>
          </div>
          
          {/* Connection status */}
          {!isConnected && (
            <div className="text-xs text-red-500 mt-1">
              ⚠️ Not connected to real-time chat. Messages will be sent via API.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room;