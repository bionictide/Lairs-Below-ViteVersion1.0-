// socket.js
// Robust Socket.io client connection for multiplayer with JWT auth

// Usage: import { connectSocket, joinPlayer, socket } from './socket.js';

let socket = null;

export function connectSocket(token, onError) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  console.log('[DEBUG] connectSocket called with token:', token);
  // Connect to the live server with JWT auth (use remote server address, not window.location.origin)
  socket = window.io('http://64.227.97.242:3001', {
    auth: { token }
  });
  // Add connect_error handler
  socket.on('connect_error', (err) => {
    console.error('[SOCKET] connect_error:', err);
    if (onError) onError(err);
  });
  return socket;
}

// Emit PLAYER_JOIN with playerId and user_id, and handle join result
export function joinPlayer({ playerId, user_id }, onSuccess, onError) {
  if (!socket) throw new Error('Socket not connected');
  console.log('[DEBUG] joinPlayer called with:', { playerId, user_id });
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

export { socket };
