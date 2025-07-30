import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { SocketService } from '../services/socketService';
import { RoomService } from '../services/roomService';
import { AuthService } from '../services/authService';

const router = express.Router();

/**
 * @swagger
 * /api/socket/user-rooms:
 *   get:
 *     summary: Get all rooms user is currently subscribed to
 *     tags: [Socket]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's subscribed rooms
 */
router.get('/user-rooms', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!._id;
    const subscribedRooms = SocketService.getUserRooms(userId);
    
    // Get detailed room information
    const roomDetails = await Promise.all(
      subscribedRooms.map(async (roomName) => {
        const room = await RoomService.getRoomByName(roomName);
        const stats = SocketService.getRoomStats(roomName);
        return {
          name: roomName,
          ...room,
          ...stats
        };
      })
    );

    res.json({
      subscribedRooms,
      roomDetails,
      total: subscribedRooms.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to get user rooms' 
    });
  }
});

/**
 * @swagger
 * /api/socket/active-rooms:
 *   get:
 *     summary: Get all active rooms with user counts
 *     tags: [Socket]
 *     responses:
 *       200:
 *         description: All active rooms
 */
router.get('/active-rooms', async (req, res) => {
  try {
    const activeRooms = SocketService.getAllActiveRooms();
    res.json({
      rooms: activeRooms,
      total: activeRooms.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to get active rooms' 
    });
  }
});

/**
 * @swagger
 * /api/socket/join-room:
 *   post:
 *     summary: Join a room via API (will also join via socket)
 *     tags: [Socket]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomName
 *             properties:
 *               roomName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully joined room
 */
router.post('/join-room', authenticateToken, async (req, res) => {
  try {
    const { roomName } = req.body;
    const userId = req.user!._id;

    // Join room in database
    await RoomService.joinRoom(roomName, req.user!);
    
    // Add to socket service tracking
    SocketService.addUserToRoom(userId, roomName);
    
    // Update auth service
    await AuthService.updateUserRoom(userId, roomName);

    // Send real-time notification to user
    SocketService.sendToUser(userId, 'room_joined_api', {
      room: roomName,
      message: `Joined room ${roomName} via API`,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: `Successfully joined room: ${roomName}`,
      room: roomName
    });
  } catch (error) {
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'Failed to join room' 
    });
  }
});

/**
 * @swagger
 * /api/socket/leave-room:
 *   post:
 *     summary: Leave a room via API
 *     tags: [Socket]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomName
 *             properties:
 *               roomName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully left room
 */
router.post('/leave-room', authenticateToken, async (req, res) => {
  try {
    const { roomName } = req.body;
    const userId = req.user!._id;

    // Leave room in database
    await RoomService.leaveRoom(roomName, userId);
    
    // Remove from socket service tracking
    SocketService.removeUserFromRoom(userId, roomName);

    // Send real-time notification to user
    SocketService.sendToUser(userId, 'room_left_api', {
      room: roomName,
      message: `Left room ${roomName} via API`,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: `Successfully left room: ${roomName}`,
      room: roomName
    });
  } catch (error) {
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'Failed to leave room' 
    });
  }
});

/**
 * @swagger
 * /api/socket/send-notification:
 *   post:
 *     summary: Send notification to all user's rooms
 *     tags: [Socket]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - type
 *             properties:
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [message, user_action, system]
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Notification sent successfully
 */
router.post('/send-notification', authenticateToken, async (req, res) => {
  try {
    const { content, type, metadata } = req.body;
    const userId = req.user!._id;

    SocketService.sendNotificationToUserRooms(userId, {
      type,
      content,
      metadata
    });

    res.json({
      message: 'Notification sent to all user rooms',
      sentTo: SocketService.getUserRooms(userId)
    });
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to send notification' 
    });
  }
});

/**
 * @swagger
 * /api/socket/room-stats/{roomName}:
 *   get:
 *     summary: Get real-time statistics for a specific room
 *     tags: [Socket]
 *     parameters:
 *       - in: path
 *         name: roomName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room statistics
 */
router.get('/room-stats/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    const stats = SocketService.getRoomStats(roomName);
    const dbStats = await RoomService.getRoomStats(roomName);
    
    res.json({
      realTime: stats,
      database: dbStats,
      roomName
    });
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to get room stats' 
    });
  }
});

export default router;
