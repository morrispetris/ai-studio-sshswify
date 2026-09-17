import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { handleSSHConnection } from './server/ssh.js';
import { handleTelnetConnection } from './server/telnet.js';
import { handleLocalShell } from './server/local.js';
import { isSharedKeyRequired, verifySharedKey, getServerPresets } from './server/config.js';
import { ClientMessage, ServerMessage } from './server/types.js';

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // API endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'sshwifty', uptime: process.uptime() });
  });

  app.get('/api/config', (_req, res) => {
    res.json({
      sharedKeyRequired: isSharedKeyRequired(),
      presets: getServerPresets(),
      version: '0.3.5-rebuilt',
      features: {
        ssh: true,
        telnet: true,
        localShell: true,
      },
    });
  });

  app.post('/api/verify-key', (req, res) => {
    const { key } = req.body || {};
    const isValid = verifySharedKey(key);
    res.json({ valid: isValid });
  });

  // WebSocket Server setup
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/api/ws' || url.pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    let activeSession: {
      sendInput: (data: string) => void;
      resize: (cols: number, rows: number) => void;
      close: () => void;
    } | null = null;

    const sendJson = (msg: ServerMessage) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    ws.on('message', (raw: Buffer | string) => {
      try {
        const msg: ClientMessage = JSON.parse(raw.toString());

        if (msg.action === 'ping') {
          sendJson({ type: 'pong', timestamp: Date.now() });
          return;
        }

        if (msg.action === 'connect') {
          // Check shared key if required
          if (!verifySharedKey(msg.sharedKey)) {
            sendJson({
              type: 'error',
              message: 'Authentication failed: Invalid Sshwifty Shared Key.',
            });
            sendJson({
              type: 'status',
              state: 'error',
              message: 'Access denied: Invalid Shared Key',
            });
            return;
          }

          // Close previous session if any
          if (activeSession) {
            activeSession.close();
            activeSession = null;
          }

          if (msg.protocol === 'ssh') {
            activeSession = handleSSHConnection(ws, msg);
          } else if (msg.protocol === 'telnet') {
            activeSession = handleTelnetConnection(ws, msg);
          } else if (msg.protocol === 'local') {
            activeSession = handleLocalShell(ws, msg);
          } else {
            sendJson({
              type: 'error',
              message: `Unsupported protocol: ${msg.protocol}`,
            });
          }
        } else if (msg.action === 'input') {
          if (activeSession) {
            activeSession.sendInput(msg.data);
          }
        } else if (msg.action === 'resize') {
          if (activeSession) {
            activeSession.resize(msg.cols, msg.rows);
          }
        } else if (msg.action === 'disconnect') {
          if (activeSession) {
            activeSession.close();
            activeSession = null;
          }
          sendJson({
            type: 'status',
            state: 'disconnected',
            message: 'Session closed by user.',
          });
        }
      } catch (err: any) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      if (activeSession) {
        activeSession.close();
        activeSession = null;
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      if (activeSession) {
        activeSession.close();
        activeSession = null;
      }
    });
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`Sshwifty Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
