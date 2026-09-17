import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import type { WebSocket } from 'ws';
import { ConnectMessage, ServerMessage } from './types.js';

export function handleLocalShell(ws: WebSocket, params: ConnectMessage) {
  let child: ChildProcessWithoutNullStreams | null = null;
  let isClosed = false;

  const sendMessage = (msg: ServerMessage) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  sendMessage({
    type: 'status',
    state: 'connecting',
    message: 'Starting interactive container shell...',
  });

  const shellBin = process.platform === 'win32' ? 'cmd.exe' : (process.env.SHELL || '/bin/bash');
  const shellArgs = process.platform === 'win32' ? [] : ['-i'];

  try {
    child = spawn(shellBin, shellArgs, {
      env: {
        ...process.env,
        TERM: params.term || 'xterm-256color',
        COLUMNS: String(params.cols || 80),
        LINES: String(params.rows || 24),
        PS1: '\\[\\033[01;32m\\]sshwifty@cloud-run\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ ',
      },
    });
  } catch (e: any) {
    try {
      // Fallback to /bin/sh
      child = spawn('/bin/sh', ['-i'], {
        env: {
          ...process.env,
          TERM: params.term || 'xterm-256color',
        },
      });
    } catch (err: any) {
      sendMessage({
        type: 'error',
        message: `Failed to spawn shell: ${err.message}`,
      });
      return {
        sendInput: () => {},
        resize: () => {},
        close: () => {},
      };
    }
  }

  sendMessage({
    type: 'status',
    state: 'connected',
    message: 'Connected to Cloud Run container shell.',
  });

  // Send a welcome message
  const welcome = `\r\n\x1b[36m   ____ ____  _   ___          _  __ _         \x1b[0m\r\n` +
    `\x1b[36m  / ___/ ___|| | | \\ \\        / /(_)/ _| |_ _   \x1b[0m\r\n` +
    `\x1b[36m  \\___ \\___ \\| |_| |\\ \\  /\\  / / | | |_| __| | | |\x1b[0m\r\n` +
    `\x1b[36m   ___) |__) |  _  | \\ \\/  \\/ /  | |  _| |_| |_| |\x1b[0m\r\n` +
    `\x1b[36m  |____/____/|_| |_|  \\__/\\__/   |_|_|  \\__|\\__, |\x1b[0m\r\n` +
    `\x1b[36m                                            |___/ \x1b[0m\r\n` +
    `\x1b[90m  Web SSH & Telnet Client Connector for Google Cloud Run\x1b[0m\r\n` +
    `\x1b[32m  ✓ Local Container Environment Active\x1b[0m\r\n` +
    `\x1b[90m  Type commands below, or open Connector (+) for remote SSH/Telnet servers.\x1b[0m\r\n\r\n`;

  sendMessage({
    type: 'output',
    data: Buffer.from(welcome).toString('base64'),
  });

  child.stdout.on('data', (chunk: Buffer) => {
    sendMessage({
      type: 'output',
      data: chunk.toString('base64'),
    });
  });

  child.stderr.on('data', (chunk: Buffer) => {
    sendMessage({
      type: 'output',
      data: chunk.toString('base64'),
    });
  });

  child.on('error', (err) => {
    sendMessage({
      type: 'error',
      message: `Shell process error: ${err.message}`,
    });
  });

  child.on('exit', (code) => {
    if (!isClosed) {
      isClosed = true;
      sendMessage({
        type: 'status',
        state: 'disconnected',
        message: `Shell exited with code ${code}`,
      });
    }
  });

  return {
    sendInput: (base64Data: string) => {
      if (child && child.stdin && !child.stdin.destroyed && !isClosed) {
        try {
          const buf = Buffer.from(base64Data, 'base64');
          child.stdin.write(buf);
        } catch (e) {
          console.error('Error writing to shell stdin:', e);
        }
      }
    },
    resize: (_cols: number, _rows: number) => {
      // In non-pty child_process, columns/lines are set via env or stty if available
    },
    close: () => {
      if (!isClosed) {
        isClosed = true;
        if (child) {
          try {
            child.kill('SIGTERM');
          } catch (e) {
            // ignore
          }
        }
      }
    },
  };
}
