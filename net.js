// Verbindungen zwischen Bildschirm und Spielraum.
//  - wsTransport: zum PC-Server (WebSocket)
//  - HostSession: dieses Tablet ist Gastgeber; der Raum läuft hier, andere Tablets verbinden sich per PeerJS
//  - guestTransport: zu einem Gastgeber-Tablet mit 4-stelligem Code
// Jede Verbindung: open({ onopen, onmessage, onclose }), send(obj), isOpen(), close()
const PREFIX = 'hwatu-matgo-v1-';

// PeerJS-Signalserver: Standard ist der öffentliche Dienst; zum Testen per URL überschreibbar
function peerOptions() {
  const q = new URLSearchParams(location.search);
  if (!q.get('peerhost')) return { debug: 0 };
  return { host: q.get('peerhost'), port: Number(q.get('peerport') || 9000), path: q.get('peerpath') || '/', secure: q.get('peersecure') === '1', debug: 0 };
}

export const peerAvailable = () => typeof window.Peer === 'function';

export function wsTransport() {
  let ws = null;
  return {
    open(h) {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}`);
      ws.onopen = () => h.onopen();
      ws.onmessage = (e) => h.onmessage(JSON.parse(e.data));
      ws.onclose = () => h.onclose();
    },
    send: (m) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m)),
    isOpen: () => ws?.readyState === WebSocket.OPEN,
    isConnecting: () => ws?.readyState === WebSocket.CONNECTING,
    close: () => ws?.close(),
  };
}

export const newCode = () => String(Math.floor(1000 + Math.random() * 9000));

// Gastgeber: Raum + Hub laufen in diesem Tablet
export class HostSession {
  static async create({ code, saved, onPeerStatus = () => {}, onSave = () => {} }) {
    const { Hub } = await import('./server/hub.js');
    const { Room } = await import('./server/room.js');
    const room = saved ? Room.fromJSON(saved) : new Room();
    const s = new HostSession();
    s.code = code;
    s.hub = new Hub({ room });
    s.hub.onChange = () => onSave(room.toJSON());
    s.onPeerStatus = onPeerStatus;
    s.startPeer();
    return s;
  }

  startPeer() {
    if (!peerAvailable()) return this.onPeerStatus('offline');
    const peer = new window.Peer(PREFIX + this.code, peerOptions());
    this.peer = peer;
    peer.on('open', () => this.onPeerStatus('online'));
    peer.on('disconnected', () => {
      this.onPeerStatus('offline');
      if (!this.closed) setTimeout(() => !this.closed && !peer.destroyed && peer.reconnect(), 2000);
    });
    peer.on('error', (e) => {
      if (e.type === 'unavailable-id') this.onPeerStatus('taken');
      else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) this.onPeerStatus('offline');
    });
    peer.on('connection', (dc) => {
      dc.on('open', () => {
        const conn = { send: (m) => dc.open && dc.send(m), close: () => dc.close() };
        const h = this.hub.attach(conn);
        dc.on('data', (d) => h.message(d));
        dc.on('close', () => h.close());
        dc.on('error', () => h.close());
      });
    });
  }

  // die Verbindung für den eigenen Bildschirm (ohne Netzwerk)
  localTransport() {
    let h = null;
    let open = false;
    return {
      open: (handlers) => {
        const conn = { send: (m) => queueMicrotask(() => handlers.onmessage(structuredClone(m))), close: () => {} };
        h = this.hub.attach(conn);
        open = true;
        queueMicrotask(() => handlers.onopen());
      },
      send: (m) => h?.message(structuredClone(m)),
      isOpen: () => open,
      isConnecting: () => false,
      close: () => {},
    };
  }

  close() {
    this.closed = true;
    this.hub.dispose();
    this.hub.reset();
    this.peer?.destroy();
  }
}

// Gast: mit dem Gastgeber-Tablet über den Code verbinden
export function guestTransport(code, onError = () => {}) {
  let peer = null;
  let dc = null;
  let open = false;
  let connecting = false;
  return {
    open(h) {
      if (!peerAvailable()) {
        onError('offline');
        return h.onclose();
      }
      connecting = true;
      peer = new window.Peer(undefined, peerOptions());
      let ended = false;
      const fail = (why) => {
        connecting = false;
        if (ended) return; // nur einmal melden
        ended = true;
        open = false;
        if (why) onError(why);
        peer?.destroy();
        h.onclose();
      };
      peer.on('open', () => {
        dc = peer.connect(PREFIX + code, { serialization: 'json', reliable: true });
        dc.on('open', () => {
          open = true;
          connecting = false;
          h.onopen();
        });
        dc.on('data', (d) => h.onmessage(d));
        dc.on('close', () => fail());
        dc.on('error', () => fail('lost'));
      });
      peer.on('error', (e) => fail(e.type === 'peer-unavailable' ? 'noHost' : 'offline'));
    },
    send: (m) => open && dc?.send(m),
    isOpen: () => open,
    isConnecting: () => connecting,
    close: () => {
      open = false;
      connecting = false;
      peer?.destroy();
    },
  };
}
