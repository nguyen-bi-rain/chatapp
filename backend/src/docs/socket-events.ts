/**
 * @swagger
 * components:
 *   schemas:
 *     SocketEvent:
 *       type: object
 *       description: Socket.IO event documentation (these are not REST endpoints)
 * 
 * /socket-events:
 *   get:
 *     summary: Socket.IO Events Documentation
 *     description: |
 *       This endpoint doesn't exist - this is documentation for Socket.IO events.
 *       
 *       ## Client to Server Events:
 *       
 *       ### join
 *       Join the chat with username and optional room
 *       ```javascript
 *       socket.emit('join', { username: 'john', room: 'general' });
 *       ```
 *       
 *       ### send_message
 *       Send a message to current room or global chat
 *       ```javascript
 *       socket.emit('send_message', { message: 'Hello!', room: 'general' });
 *       ```
 *       
 *       ### join_room
 *       Join a specific chat room
 *       ```javascript
 *       socket.emit('join_room', 'room-name');
 *       ```
 *       
 *       ### leave_room
 *       Leave current chat room
 *       ```javascript
 *       socket.emit('leave_room');
 *       ```
 *       
 *       ### typing
 *       Send typing indicator
 *       ```javascript
 *       socket.emit('typing', { room: 'general', isTyping: true });
 *       ```
 *       
 *       ## Server to Client Events:
 *       
 *       ### receive_message
 *       Receive a new message
 *       ```javascript
 *       socket.on('receive_message', (data) => {
 *         // data: { id, username, message, timestamp, room }
 *       });
 *       ```
 *       
 *       ### user_joined
 *       User joined notification
 *       ```javascript
 *       socket.on('user_joined', (data) => {
 *         // data: { username, message, timestamp }
 *       });
 *       ```
 *       
 *       ### user_left
 *       User left notification
 *       ```javascript
 *       socket.on('user_left', (data) => {
 *         // data: { username, message, timestamp }
 *       });
 *       ```
 *       
 *       ### user_typing
 *       Typing indicator from other users
 *       ```javascript
 *       socket.on('user_typing', (data) => {
 *         // data: { username, isTyping }
 *       });
 *       ```
 *       
 *       ### joined
 *       Confirmation of successful join
 *       ```javascript
 *       socket.on('joined', (data) => {
 *         // data: { id, username, room, message }
 *       });
 *       ```
 *       
 *       ### room_joined
 *       Confirmation of room join
 *       ```javascript
 *       socket.on('room_joined', (data) => {
 *         // data: { room, message }
 *       });
 *       ```
 *       
 *       ### room_left
 *       Confirmation of room leave
 *       ```javascript
 *       socket.on('room_left', (data) => {
 *         // data: { room, message }
 *       });
 *       ```
 *     tags: [Socket.IO Events]
 *     responses:
 *       404:
 *         description: This endpoint doesn't exist - see description for Socket.IO events
 */
export {};
