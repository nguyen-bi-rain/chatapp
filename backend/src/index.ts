import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSwagger } from './utils/swagger';
import authRoutes from './routes/auth';
import messageRoutes from './routes/messages';
import roomRoutes from './routes/rooms';
import socketRoutes from './routes/socket';
import { setupSocketHandlers,SocketRoomManager } from './handler/socketHandler'; 
import connectMongoDB from './config/mongodb';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Configure CORS
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"], // Frontend URLs
  credentials: true
}));

app.use(express.json());

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Setup Swagger documentation
setupSwagger(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/socket', socketRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome endpoint
 *     description: Returns a welcome message to confirm the server is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WelcomeResponse'
 */
app.get('/', (req, res) => {
  res.json({ message: 'Chat App Server is running!' });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the server
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server health status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Get server statistics
 *     description: Returns current server statistics including connected users and rooms
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connectedUsers:
 *                   type: number
 *                 activeRooms:
 *                   type: number
 *                 uptime:
 *                   type: number
 */
app.get('/api/stats', (req, res) => {

  
  res.json({
    connectedUsers: SocketRoomManager.getUserCount(),
    activeRooms: SocketRoomManager.getRoomCount(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectMongoDB();

server.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
});
export default app;
export { io };