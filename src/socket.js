// socket.js
// Establishes socket.io connection for client to emit and receive events

import { io } from "socket.io-client";

const socket = io(); // Connects to server at current origin

export default socket;
