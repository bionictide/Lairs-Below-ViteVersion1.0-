// Socket.io client connection for multiplayer
// Uses CDN import for socket.io-client for browser compatibility
// Usage: import { connectSocket, socket } from './socket.js';

// Ensure socket.io-client is loaded via CDN in index.html or dynamically
// <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>

console.log('[DEBUG][MODULE] socket.js loaded');

let socket = null;

export function connectSocket(token) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  // Connect to the live server with JWT auth
  socket = window.io('http://64.227.97.242:3001', {
    auth: { token }
  });
  return socket;
}

// Emit PLAYER_JOIN with playerId and user_id, and handle join result
export function joinPlayer({ playerId, user_id }, onSuccess, onError) {
  if (!socket) throw new Error('Socket not connected');
  socket.emit('player_join', { playerId, user_id });
  const handleJoin = (payload) => {
    if (payload.action === 'player_join') {
      if (payload.success) {
        onSuccess && onSuccess(payload.data);
      } else {
        onError && onError(payload.message || 'Join failed');
      }
      socket.off('action_result', handleJoin);
      socket.off('error', handleError);
    }
  };
  const handleError = (err) => {
    onError && onError(err.message || 'Join error');
    socket.off('action_result', handleJoin);
    socket.off('error', handleError);
  };
  socket.on('action_result', handleJoin);
  socket.on('error', handleError);
}

// Emit ROOM_ENTER for late join/reconnect
export function enterRoom({ playerId, roomId }) {
  if (!socket) throw new Error('Socket not connected');
  socket.emit('room_enter', { playerId, roomId });
}

export { socket }; 