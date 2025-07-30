import express from "express";
import { authenticateToken } from "../middleware/auth";
import { MessageService } from "../services/messageService";
import { SocketService } from "../services/socketService";
const router = express.Router();

/**
 * @swagger
 * /api/messages/room/{roomName}:
 *   get:
 *     summary: Get messages from a specific room
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Room messages retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Room not found
 */
router.get("/room/:roomName", authenticateToken, async (req, res) => {
  try {
    const { roomName } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const result = await MessageService.getRoomMessages(
      roomName as string,
      limit,
      skip
    );

    if (!result.room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to get messages",
    });
  }
});

/**
 * @swagger
 * /api/messages/stats:
 *   get:
 *     summary: Get message statistics
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: room
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message statistics retrieved successfully
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const room = req.query.room as string;
    const stats = await MessageService.getMessageStats(room);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to get stats",
    });
  }
});
/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Create a new message
 *     tags: [Messages]
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
 *               - content
 *             properties:
 *               roomName:
 *                 type: string
 *               content:
 *                 type: string
 *               messageType:
 *                 type: string
 *               replyTo:
 *                 type: string
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Message created successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { roomName, content, messageType, replyTo, mentions } = req.body;
    if (!roomName || !content) {
      return res
        .status(400)
        .json({ message: "Room name and content are required" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Extract mentions from content if not provided
    let finalMentions = mentions;
    if (!finalMentions && content.includes("@")) {
      const mentionRegex = /@(\w+)/g;
      const extractedMentions = [];
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        extractedMentions.push(match[1]);
      }
      finalMentions = extractedMentions;
    }

    const messageData = {
      content,
      sender: req.user,
      room: roomName,
      messageType: messageType || "text",
      replyTo: replyTo || null,
      mentions: finalMentions,
    };

    const message = await MessageService.createMessage(messageData);

    // If there are mentions in a group chat, notify mentioned users
    if (finalMentions && finalMentions.length > 0) {
      for (const mention of finalMentions) {
        SocketService.sendToUser(mention, "mention", {
          messageId: message.id,
          room: roomName,
          content,
          sender: req.user.username,
        });
      }
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to create message",
    });
  }
});
/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found or unauthorized
 */

router.delete("/:messageId", authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await MessageService.deleteMessage(messageId, userId);
    if (result) {
      res.json({ message: "Message deleted successfully" });
    } else {
      res.status(404).json({ message: "Message not found or unauthorized" });
    }
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to delete message",
    });
  }
});

export default router;
