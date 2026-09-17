const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { User } = require('../models');
const { hasAccessToday } = require('../utils/attendance');
const { logActivity } = require('../utils/activityLog');

// A single shared "channel" walkie-talkie for the whole team - there's only one business
// using this deployment, so no per-property/per-org scoping is needed here (unlike the
// REST API's ownerId-scoped resources).
//
// Half-duplex like a real radio: only one transmission (broadcast, private call, or
// emergency) can hold the channel at a time. Audio is relayed live, never stored - this is
// a transient broadcast, not a recorded message log. Only emergency calls get written to
// the activity log (visible on the Staff page) - logging every ordinary chat would just
// flood that log with noise nobody wants to read.
const NORMAL_MAX_MS = 30_000; // safety unlock if a client dies mid-transmission
const EMERGENCY_MAX_MS = 60_000; // emergencies get more room to explain the situation
const EMERGENCY_COOLDOWN_MS = 15_000; // one person can't keep re-declaring emergency to hog the channel

const attachRadio = (httpServer) => {
  const io = new Server(httpServer, {
    path: '/radio',
    cors: { origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*' },
    maxHttpBufferSize: 5 * 1024 * 1024, // a held-key clip is small, but leave headroom
  });

  const online = new Map(); // socket.id -> { id, name, role, avatarUrl }
  // { socketId, user, mode: 'broadcast'|'private'|'emergency', targetUserId?, targetName? }
  let currentSpeaker = null;
  let releaseTimer = null;
  const lastEmergencyAt = new Map(); // userId -> timestamp of their last granted emergency

  const broadcastPresence = () => {
    io.emit('presence', Array.from(online.values()));
  };

  const socketIdsForUser = (userId) =>
    Array.from(online.entries())
      .filter(([, member]) => member.id === userId)
      .map(([socketId]) => socketId);

  const clearSpeaker = () => {
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = null;
    currentSpeaker = null;
  };

  const forceRelease = () => {
    if (!currentSpeaker) return;
    if (currentSpeaker.mode === 'emergency') {
      logActivity(currentSpeaker.user, 'radio_emergency', 'เรียกฉุกเฉินผ่านวิทยุสื่อสาร (หมดเวลาอัตโนมัติ)');
    }
    io.emit('talk:end', { userId: currentSpeaker.user.id });
    clearSpeaker();
  };

  const grantSpeaker = (socket, extra) => {
    currentSpeaker = { socketId: socket.id, user: socket.user, ...extra };
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = setTimeout(forceRelease, extra.mode === 'emergency' ? EMERGENCY_MAX_MS : NORMAL_MAX_MS);
    socket.emit('talk:granted');
    io.emit('talk:start', {
      userId: socket.user.id,
      name: socket.user.name,
      mode: extra.mode,
      targetUserId: extra.targetUserId,
      targetName: extra.targetName,
    });
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
      // A resync for whoever just (re)connected mid-transmission - reconnects happen
      // constantly in normal use (tab backgrounded then foregrounded, brief wifi drop,
      // laptop sleep/wake all make socket.io reconnect under the hood), so this must stay
      // a distinct event from 'talk:start': the client treats a real talk:start as a brand
      // new call for its missed-badge/notification/title-flash logic, and firing that on
      // every routine reconnect would double-count and re-alert for a call already in progress.
      socket.emit('talk:resync', {
        userId: currentSpeaker.user.id,
        name: currentSpeaker.user.name,
        mode: currentSpeaker.mode,
        targetUserId: currentSpeaker.targetUserId,
        targetName: currentSpeaker.targetName,
      });
    }

    socket.on('talk:request', (payload = {}) => {
      const { targetUserId, emergency } = payload || {};

      if (emergency) {
        // An emergency already in progress isn't preempted by another one - the channel is
        // already at maximum urgency, so a second caller just has to wait their turn like
        // a normal busy signal instead of bumping the first emergency mid-sentence.
        if (currentSpeaker && currentSpeaker.mode === 'emergency' && currentSpeaker.socketId !== socket.id) {
          socket.emit('talk:busy', { name: currentSpeaker.user.name });
          return;
        }
        // A per-user cooldown so one person mashing the emergency button can't keep
        // re-preempting the channel - this is the app's one safety override, so it needs
        // a floor against accidental or careless spam, not just against malice.
        const now = Date.now();
        const last = lastEmergencyAt.get(socket.user.id) || 0;
        if (now - last < EMERGENCY_COOLDOWN_MS) {
          socket.emit('talk:busy', { name: socket.user.name });
          return;
        }
        lastEmergencyAt.set(socket.user.id, now);

        // Otherwise emergency preempts whoever currently holds the channel - the bumped
        // speaker is told directly so their UI can stop cleanly instead of transmitting
        // into a lock they no longer hold.
        if (currentSpeaker && currentSpeaker.socketId !== socket.id) {
          io.to(currentSpeaker.socketId).emit('talk:preempted');
        }
        grantSpeaker(socket, { mode: 'emergency' });
        return;
      }

      if (currentSpeaker && currentSpeaker.socketId !== socket.id) {
        socket.emit('talk:busy', { name: currentSpeaker.user.name });
        return;
      }

      if (targetUserId) {
        if (targetUserId === socket.user.id) return; // the UI never offers calling yourself
        const targetMember = Array.from(online.values()).find((m) => m.id === targetUserId);
        if (!targetMember) {
          socket.emit('talk:target-offline');
          return;
        }
        grantSpeaker(socket, { mode: 'private', targetUserId, targetName: targetMember.name });
        return;
      }

      grantSpeaker(socket, { mode: 'broadcast' });
    });

    socket.on('talk:audio', (payload) => {
      if (!currentSpeaker || currentSpeaker.socketId !== socket.id) return;
      const outgoing = {
        userId: socket.user.id,
        name: socket.user.name,
        avatarUrl: socket.user.avatarUrl,
        data: payload?.data,
        mimeType: payload?.mimeType,
      };
      if (currentSpeaker.mode === 'private') {
        // Only the called person actually hears it - everyone else just sees the "X is
        // calling Y" status from talk:start so they understand why the channel is busy.
        socketIdsForUser(currentSpeaker.targetUserId).forEach((socketId) => io.to(socketId).emit('talk:audio', outgoing));
      } else {
        socket.broadcast.emit('talk:audio', outgoing);
      }
    });

    socket.on('talk:end', () => {
      if (!currentSpeaker || currentSpeaker.socketId !== socket.id) return;
      if (currentSpeaker.mode === 'emergency') {
        logActivity(socket.user, 'radio_emergency', 'เรียกฉุกเฉินผ่านวิทยุสื่อสาร');
      }
      clearSpeaker();
      io.emit('talk:end', { userId: socket.user.id });
    });

    socket.on('disconnect', () => {
      online.delete(socket.id);
      broadcastPresence();
      if (!currentSpeaker) return;
      if (currentSpeaker.socketId === socket.id) {
        forceRelease();
      } else if (currentSpeaker.mode === 'private' && currentSpeaker.targetUserId === socket.user.id) {
        // Only end the call once the callee has no other connected tab/device left - the
        // owner (or anyone) commonly has DoDee open on both phone and desktop, and closing
        // one shouldn't drop a call they're still listening to on the other.
        const stillReachable = socketIdsForUser(currentSpeaker.targetUserId).length > 0;
        if (!stillReachable) {
          const callerId = currentSpeaker.user.id;
          io.to(currentSpeaker.socketId).emit('talk:target-offline');
          clearSpeaker();
          io.emit('talk:end', { userId: callerId });
        }
      }
    });
  });

  return io;
};

module.exports = attachRadio;
