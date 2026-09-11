const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { User } = require('../models');
const { hasAccessToday } = require('../utils/attendance');

// A single shared "channel" walkie-talkie for the whole team - there's only one business
// using this deployment, so no per-property/per-org scoping is needed here (unlike the
// REST API's ownerId-scoped resources).
//
// Half-duplex like a real radio: only one person can hold the channel at a time. Audio is
// relayed live, never stored - this is a transient broadcast, not a recorded message log.
const MAX_TRANSMISSION_MS = 30_000; // safety unlock if a client dies mid-transmission

const attachRadio = (httpServer) => {
  const io = new Server(httpServer, {
    path: '/radio',
    cors: { origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*' },
    maxHttpBufferSize: 5 * 1024 * 1024, // a held-key clip is small, but leave headroom
  });

  const online = new Map(); // socket.id -> { id, name, role, avatarUrl }
  let currentSpeaker = null; // { socketId, userId, name }
  let releaseTimer = null;

  const broadcastPresence = () => {
    io.emit('presence', Array.from(online.values()));
  };

  const clearSpeaker = () => {
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = null;
    currentSpeaker = null;
  };

  const forceRelease = () => {
    if (!currentSpeaker) return;
    io.emit('talk:end', { userId: currentSpeaker.userId });
    clearSpeaker();
  };

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(payload.id);
      if (!user || user.status !== 'active') return next(new Error('unauthorized'));
      if (!(await hasAccessToday(user))) return next(new Error('not_checked_in'));
      socket.user = { id: user.id, name: user.name, role: user.role, avatarUrl: user.avatarUrl };
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    online.set(socket.id, socket.user);
    broadcastPresence();
    if (currentSpeaker) {
      socket.emit('talk:start', { userId: currentSpeaker.userId, name: currentSpeaker.name });
    }

    socket.on('talk:request', () => {
      if (currentSpeaker && currentSpeaker.socketId !== socket.id) {
        socket.emit('talk:busy', { name: currentSpeaker.name });
        return;
      }
      currentSpeaker = { socketId: socket.id, userId: socket.user.id, name: socket.user.name };
      if (releaseTimer) clearTimeout(releaseTimer);
      releaseTimer = setTimeout(forceRelease, MAX_TRANSMISSION_MS);
      socket.emit('talk:granted');
      io.emit('talk:start', { userId: socket.user.id, name: socket.user.name });
    });

    socket.on('talk:audio', (payload) => {
      if (!currentSpeaker || currentSpeaker.socketId !== socket.id) return;
      socket.broadcast.emit('talk:audio', {
        userId: socket.user.id,
        name: socket.user.name,
        avatarUrl: socket.user.avatarUrl,
        data: payload?.data,
        mimeType: payload?.mimeType,
      });
    });

    socket.on('talk:end', () => {
      if (!currentSpeaker || currentSpeaker.socketId !== socket.id) return;
      clearSpeaker();
      io.emit('talk:end', { userId: socket.user.id });
    });

    socket.on('disconnect', () => {
      online.delete(socket.id);
      broadcastPresence();
      if (currentSpeaker && currentSpeaker.socketId === socket.id) {
        forceRelease();
      }
    });
  });

  return io;
};

module.exports = attachRadio;
