import { Client, ConnectConfig } from 'ssh2';
import type { WebSocket } from 'ws';
import { ConnectMessage, ServerMessage } from './types.js';

export function handleSSHConnection(ws: WebSocket, params: ConnectMessage) {
  const conn = new Client();
  let streamRef: any = null;
  let isClosed = false;

  const sendMessage = (msg: ServerMessage) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  sendMessage({
    type: 'status',
    state: 'connecting',
    message: `Connecting to ${params.host}:${params.port || 22} via SSH...`,
  });

  const config: ConnectConfig = {
    host: params.host,
    port: params.port || 22,
    username: params.username || 'root',
    readyTimeout: 30000,
    keepaliveInterval: 15000,
    keepaliveCountMax: 3,
    tryKeyboard: true, // support keyboard-interactive prompts
  };

  if (params.authType === 'key' && params.privateKey) {
    config.privateKey = params.privateKey;
    if (params.passphrase) {
      config.passphrase = params.passphrase;
    }
  } else if (params.password) {
    config.password = params.password;
  }

  conn.on('banner', (message) => {
    sendMessage({
      type: 'status',
      state: 'connecting',
      banner: message,
    });
  });

  conn.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => {
    // If prompt is password-related, provide password
    if (params.password && prompts.length > 0) {
      finish([params.password]);
    } else {
      finish([]);
    }
  });

  conn.on('ready', () => {
    sendMessage({
      type: 'status',
      state: 'connected',
      message: `Connected to ${params.host}:${params.port || 22}`,
    });

    const termType = params.term || 'xterm-256color';
    const cols = params.cols || 80;
    const rows = params.rows || 24;

    conn.shell(
      {
        term: termType,
        cols,
        rows,
      },
      (err, stream) => {
        if (err) {
          sendMessage({
            type: 'error',
            message: `Failed to open shell: ${err.message}`,
          });
          conn.end();
          return;
        }

        streamRef = stream;

        stream.on('data', (data: Buffer) => {
          sendMessage({
            type: 'output',
            data: data.toString('base64'),
          });
        });

        stream.on('close', () => {
          if (!isClosed) {
            isClosed = true;
            sendMessage({
              type: 'status',
              state: 'disconnected',
              message: 'SSH remote session closed.',
            });
            conn.end();
          }
        });

        stream.stderr?.on('data', (data: Buffer) => {
          sendMessage({
            type: 'output',
            data: data.toString('base64'),
          });
        });
      }
    );
  });

  conn.on('error', (err: Error) => {
    sendMessage({
      type: 'error',
      message: `SSH Error: ${err.message}`,
    });
    if (!isClosed) {
      isClosed = true;
      sendMessage({
        type: 'status',
        state: 'error',
        message: err.message,
      });
    }
  });

  conn.on('close', () => {
    if (!isClosed) {
      isClosed = true;
      sendMessage({
        type: 'status',
        state: 'disconnected',
        message: 'Connection closed.',
      });
    }
  });

  try {
    conn.connect(config);
  } catch (err: any) {
    sendMessage({
      type: 'error',
      message: `Failed to initiate SSH connection: ${err?.message || err}`,
    });
  }

  return {
    sendInput: (base64Data: string) => {
      if (streamRef && !isClosed) {
        try {
          const buf = Buffer.from(base64Data, 'base64');
          streamRef.write(buf);
        } catch (e) {
          console.error('Error writing to SSH stream:', e);
        }
      }
    },
    resize: (cols: number, rows: number) => {
      if (streamRef && !isClosed) {
        try {
          streamRef.setWindow(rows, cols, 0, 0);
        } catch (e) {
          console.error('Error resizing SSH stream:', e);
        }
      }
    },
    close: () => {
      if (!isClosed) {
        isClosed = true;
        try {
          if (streamRef) streamRef.end();
          conn.end();
        } catch (e) {
          // ignore
        }
      }
    },
  };
}
