const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

// Simple static file server to serve index.html and client script
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(__dirname, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    const contentType = ext === '.js' ? 'application/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

// rooms: Map<roomId, Set<WebSocket>>
const rooms = new Map();

function safeSend(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch (e) {
    // ignore
  }
}

function broadcastToRoom(roomId, payload, exceptWs = null) {
  const set = rooms.get(roomId);
  if (!set) return;
  for (const client of set) {
    if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
      safeSend(client, payload);
    }
  }
}

wss.on('connection', (ws) => {
  ws._meta = { room: null, name: 'Anonymous' };

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      return safeSend(ws, { type: 'error', message: 'Invalid JSON' });
    }

    if (msg.type === 'join') {
      const roomId = String(msg.room || 'default');
      const name = msg.name ? String(msg.name).slice(0, 32) : 'Anonymous';

      // leave existing room if any
      if (ws._meta.room) {
        const old = rooms.get(ws._meta.room);
        if (old) old.delete(ws);
        broadcastToRoom(ws._meta.room, { type: 'info', message: `${ws._meta.name} left` }, ws);
      }

      ws._meta.room = roomId;
      ws._meta.name = name;

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(ws);

      safeSend(ws, { type: 'joined', room: roomId });
      broadcastToRoom(roomId, { type: 'info', message: `${name} joined the room` }, ws);
    } else if (msg.type === 'message') {
      const text = String(msg.text || '').slice(0, 1000);
      const roomId = ws._meta.room;
      if (!roomId) return safeSend(ws, { type: 'error', message: 'Join a room first' });

      const payload = {
        type: 'message',
        room: roomId,
        name: ws._meta.name,
        text,
        time: Date.now(),
      };
      broadcastToRoom(roomId, payload);
    } else if (msg.type === 'ping') {
      safeSend(ws, { type: 'pong' });
    } else {
      safeSend(ws, { type: 'error', message: 'Unknown message type' });
    }
  });

  ws.on('close', () => {
    const roomId = ws._meta.room;
    if (roomId && rooms.has(roomId)) {
      const set = rooms.get(roomId);
      set.delete(ws);
      if (set.size === 0) rooms.delete(roomId);
      else broadcastToRoom(roomId, { type: 'info', message: `${ws._meta.name} disconnected` }, ws);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
