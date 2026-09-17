import net from 'net';
import type { WebSocket } from 'ws';
import { ConnectMessage, ServerMessage } from './types.js';

export function handleTelnetConnection(ws: WebSocket, params: ConnectMessage) {
  const socket = new net.Socket();
  let isClosed = false;

  const sendMessage = (msg: ServerMessage) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const port = params.port || 23;
  sendMessage({
    type: 'status',
    state: 'connecting',
    message: `Connecting to ${params.host}:${port} via Telnet...`,
  });

  socket.setTimeout(25000);

  socket.on('connect', () => {
    sendMessage({
      type: 'status',
      state: 'connected',
      message: `Connected to ${params.host}:${port} (Telnet)`,
    });
  });

  // Handle incoming data from Telnet server, with basic IAC filtering/negotiation
  socket.on('data', (chunk: Buffer) => {
    const cleanOutput: number[] = [];
    let i = 0;

    while (i < chunk.length) {
      if (chunk[i] === 255) {
        // IAC
        if (i + 1 >= chunk.length) break;
        const cmd = chunk[i + 1];

        if (cmd === 255) {
          // Escaped 255
          cleanOutput.push(255);
          i += 2;
        } else if (cmd === 251 || cmd === 252 || cmd === 253 || cmd === 254) {
          // WILL, WONT, DO, DONT
          if (i + 2 >= chunk.length) break;
          const opt = chunk[i + 2];
          // Respond appropriately
          if (cmd === 253) {
            // Server asks "DO option"
            if (opt === 31) {
              // NAWS: Negotiate About Window Size
              socket.write(Buffer.from([255, 251, 31])); // IAC WILL NAWS
              sendWindowSize(params.cols || 80, params.rows || 24);
            } else if (opt === 24) {
              // Terminal Type
              socket.write(Buffer.from([255, 251, 24])); // IAC WILL TTYPE
            } else {
              socket.write(Buffer.from([255, 252, opt])); // IAC WONT
            }
          } else if (cmd === 251) {
            // Server says "WILL option"
            if (opt === 1 || opt === 3) {
              // ECHO or Suppress Go Ahead
              socket.write(Buffer.from([255, 253, opt])); // IAC DO
            } else {
              socket.write(Buffer.from([255, 254, opt])); // IAC DONT
            }
          }
          i += 3;
        } else if (cmd === 250) {
          // Subnegotiation (SB ... SE)
          let end = i + 2;
          while (end < chunk.length - 1 && !(chunk[end] === 255 && chunk[end + 1] === 240)) {
            end++;
          }
          i = end + 2;
        } else {
          i += 2;
        }
      } else {
        cleanOutput.push(chunk[i]);
        i++;
      }
    }

    if (cleanOutput.length > 0) {
      const buf = Buffer.from(cleanOutput);
      sendMessage({
        type: 'output',
        data: buf.toString('base64'),
      });
    }
  });

  const sendWindowSize = (cols: number, rows: number) => {
    if (socket.writable && !isClosed) {
      const c = Math.min(cols, 65535);
      const r = Math.min(rows, 65535);
      // IAC SB NAWS <c1> <c2> <r1> <r2> IAC SE
      const naws = Buffer.from([
        255, 250, 31,
        (c >> 8) & 0xff, c & 0xff,
        (r >> 8) & 0xff, r & 0xff,
        255, 240
      ]);
      try {
        socket.write(naws);
      } catch (e) {
        // ignore
      }
    }
  };

  socket.on('error', (err) => {
    sendMessage({
      type: 'error',
      message: `Telnet error: ${err.message}`,
    });
  });

  socket.on('timeout', () => {
    sendMessage({
      type: 'error',
      message: 'Connection timed out.',
    });
    socket.destroy();
  });

  socket.on('close', () => {
    if (!isClosed) {
      isClosed = true;
      sendMessage({
        type: 'status',
        state: 'disconnected',
        message: 'Telnet connection closed.',
      });
    }
  });

  socket.connect(port, params.host);

  return {
    sendInput: (base64Data: string) => {
      if (socket.writable && !isClosed) {
        try {
          const buf = Buffer.from(base64Data, 'base64');
          socket.write(buf);
        } catch (e) {
          console.error('Error writing to Telnet socket:', e);
        }
      }
    },
    resize: (cols: number, rows: number) => {
      sendWindowSize(cols, rows);
    },
    close: () => {
      if (!isClosed) {
        isClosed = true;
        socket.destroy();
      }
    },
  };
}
