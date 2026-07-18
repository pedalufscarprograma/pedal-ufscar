import { io } from 'socket.io-client';

const socketUrl =
  import.meta.env.VITE_API_URL ||
  'https://pedal-ufscar-backend-diug.onrender.com';

export const socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket'],
});