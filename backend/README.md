# Chat App Backend

A real-time chat application backend built with Node.js, TypeScript, Express, and Socket.IO.

## Features

- Real-time messaging using Socket.IO
- Room-based chat functionality
- User join/leave notifications
- Typing indicators
- CORS enabled for frontend integration
- TypeScript for type safety
- Express.js REST API endpoints

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. For production build:
```bash
npm run build
npm start
```

## API Endpoints

- `GET /` - Health check endpoint
- `GET /health` - Server health status

## Socket Events

### Client to Server Events

- `join` - Join the chat with username and optional room
- `send_message` - Send a message to current room or global chat
- `join_room` - Join a specific chat room
- `leave_room` - Leave current chat room
- `typing` - Send typing indicator

### Server to Client Events

- `receive_message` - Receive a new message
- `user_joined` - User joined notification
- `user_left` - User left notification
- `user_typing` - Typing indicator from other users
- `joined` - Confirmation of successful join
- `room_joined` - Confirmation of room join
- `room_left` - Confirmation of room leave

## Project Structure

```
src/
├── index.ts          # Main server file
└── types/
    └── socket.ts     # TypeScript type definitions
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clean` - Clean build directory

## Environment Variables

- `PORT` - Server port (default: 3001)

## Frontend Integration

The server is configured to accept connections from `http://localhost:3000` by default. Update the CORS configuration in `src/index.ts` to match your frontend URL.

## License

ISC
