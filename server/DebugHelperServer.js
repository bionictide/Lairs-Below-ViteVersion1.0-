const DEV_DEBUG_PASSWORD = 'G0dm0d3';

// Map of socket.id to debug status
const debugSessions = new Map();

export function handleDevDebugAuth(socket, password) {
  if (password === DEV_DEBUG_PASSWORD) {
    debugSessions.set(socket.id, true);
    socket.emit('DEV_DEBUG_AUTH_RESULT', { success: true });
    console.log(`[DEBUG] Dev debug unlocked for socket ${socket.id}`);
  } else {
    socket.emit('DEV_DEBUG_AUTH_RESULT', { success: false });
    debugSessions.set(socket.id, false);
    console.log(`[DEBUG] Dev debug failed for socket ${socket.id}`);
  }
}

export function isDebugEnabled(socket) {
  return !!debugSessions.get(socket.id);
}

export function clearDebugSession(socket) {
  debugSessions.delete(socket.id);
} 