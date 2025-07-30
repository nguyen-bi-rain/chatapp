import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { RoomService } from '../services/roomService';

const router = express.Router();

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               roomType:
 *                 type: string
 *                 enum: [public, private, direct]
 *               maxParticipants:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Room created successfully
 *       400:
 *         description: Room name already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, roomType, maxParticipants } = req.body;
    
    const room = await RoomService.createRoom({
      name,
      description,
      roomType,
      maxParticipants,
      creator: req.user!
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'Failed to create room' 
    });
  }
});

/**
 * @swagger
 * /api/rooms/public:
 *   get:
 *     summary: Get all public rooms
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Public rooms retrieved successfully
 */
router.get('/public', async (req, res) => {
  try {
    const rooms = await RoomService.getPublicRooms();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to get rooms' 
    });
  }
});

/**
 * @swagger
 * /api/rooms/my:
 *   get:
 *     summary: Get user's rooms
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User rooms retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const rooms = await RoomService.getUserRooms(req.user!._id);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to get user rooms' 
    });
  }
});

/**
 * @swagger
 * /api/rooms/{roomName}:
 *   get:
 *     summary: Get room details
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room details retrieved successfully
 *       404:
 *         description: Room not found
 */
router.get('/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    const room = await RoomService.getRoomByName(roomName);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to get room' 
    });
  }
});

/**
 * @swagger
 * /api/rooms/{roomName}/participants:
 *   get:
 *     summary: Get room participants
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room participants retrieved successfully
 *       404:
 *         description: Room not found
 */
router.get('/:roomName/participants', async (req, res) => {
  try {
    const { roomName } = req.params;
    const participants = await RoomService.getRoomParticipants(roomName);
    
    if (!participants) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(participants);
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to get participants' 
    });
  }
});
/**
 * @swagger
 * /api/rooms/{roomName}/join:
 *   post:
 *     summary: Join a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully joined the room
 *       404:
 *         description: Room not found
 */
router.post('/:roomName/join', authenticateToken, async (req, res) => {
  try {
    const { roomName } = req.params;
    const user = req.user!;

    const result = await RoomService.joinRoom(roomName as string, user);

    if (!result) {
      return res.status(404).json({ message: 'Room not found or already joined' });
    }

    res.json({ message: 'Successfully joined the room', room: result });
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to join room' 
    });
  }
});

export default router;