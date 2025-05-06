// Socket.io client connection for multiplayer
// Uses CDN import for socket.io-client for browser compatibility
// Usage: import { connectSocket, socket } from './socket.js';

// Ensure socket.io-client is loaded via CDN in index.html or dynamically
// <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>

let socket = null;

export function connectSocket(token) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  // Connect to the live server with JWT auth
  socket = window.io('https://lairs-below-server.onrender.com', {
    auth: { token }
  });
  return socket;
}

export { socket }; 