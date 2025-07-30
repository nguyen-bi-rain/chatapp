import { Router, Request, Response } from "express";
import { AuthService } from "../services/authService";
import { authenticateToken } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Unique username for the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User's password (minimum 6 characters)
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           description: User's password
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/UserWithoutPassword'
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         message:
 *           type: string
 *           description: Success message
 *     UserWithoutPassword:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the user
 *         username:
 *           type: string
 *           description: Username for the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         room:
 *           type: string
 *           description: Current room the user is in
 *           nullable: true
 *         isOnline:
 *           type: boolean
 *           description: Whether the user is currently online
 *         lastSeen:
 *           type: string
 *           format: date-time
 *           description: Last time the user was seen
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the user account was created
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with username, email, and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflict - user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      res.status(400).json({
        error: "Missing required fields",
        message: "Username, email, and password are required",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        error: "Invalid password",
        message: "Password must be at least 6 characters long",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: "Invalid email",
        message: "Please provide a valid email address",
      });
      return;
    }

    const result = await AuthService.register(username, email, password);

    res.status(201).json({
      user: result.user,
      token: result.token,
      message: "User registered successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      res.status(409).json({
        error: "User already exists",
        message: error.message,
      });
    } else {
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during registration",
      });
    }
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      res.status(400).json({
        error: "Missing required fields",
        message: "Email and password are required",
      });
      return;
    }

    const result = await AuthService.login(email, password);

    res.status(200).json({
      user: result.user,
      token: result.token,
      message: "Login successful",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid")) {
      res.status(401).json({
        error: "Invalid credentials",
        message: error.message,
      });
    } else {
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during login",
      });
    }
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Get the profile of the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserWithoutPassword'
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/me", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        message: "User not authenticated",
      });
      return;
    }

    const user = await AuthService.getUserById(req.user._id);
    if (!user) {
      res.status(404).json({
        error: "User not found",
        message: "User profile not found",
      });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: "An error occurred while retrieving user profile",
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout the currently authenticated user (updates online status)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       401:
 *         description: Unauthorized - token required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/logout",
  authenticateToken,
  (req: Request, res: Response): void => {
    try {
      if (req.user) {
        AuthService.updateUserStatus(req.user._id, false);
      }

      res.status(200).json({
        message: "Logout successful",
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during logout",
      });
    }
  }
);

export default router;
