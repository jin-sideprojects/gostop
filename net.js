// Verbindungen zwischen Bildschirm und Spielraum.
//  - wsTransport: zum PC-Server (WebSocket)
//  - HostSession: dieses Tablet ist Gastgeber; der Raum läuft hier, andere Tablets verbinden sich per PeerJS
//  - guestTransport: zu einem Gastgeber-Tablet mit 4-stelligem Code
// Jede Verbindung: open({ onopen, onmessage, onclose }), send(obj), isOpen(), close()
const PREFIX = 'hwatu-matgo-v1-';
const MAX_CODE_RETRIES = 5;

/**
 * WebRTC NAT 통과용 STUN/TURN 서버 목록 (Google STUN + Metered Global TURN).
 */
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  {
    urls: 'turn:global.relay.metered.ca:80',
    username: '3a8e84bee5621e63c3b0b2c2',
    credential: 'tsJ7Ks18gaNBlo16',
  },
  {
    urls: 'turn:global.relay.metered.ca:80?transport=tcp',
    username: '3a8e84bee5621e63c3b0b2c2',
    credential: 'tsJ7Ks18gaNBlo16',
  },
  {
    urls: 'turn:global.relay.metered.ca:443',
    username: '3a8e84bee5621e63c3b0b2c2',
    credential: 'tsJ7Ks18gaNBlo16',
  },
  {
    urls: 'turns:global.relay.metered.ca:443?transport=tcp',
    username: '3a8e84bee5621e63c3b0b2c2',
    credential: 'tsJ7Ks18gaNBlo16',
  },
];

/**
 * PeerJS 연결 옵션을 생성한다.
 * @returns {object} PeerJS 생성자 옵션
 */
function peerOptions() {
  const q = new URLSearchParams(location.search);
  const config = { iceServers: ICE_SERVERS };
  if (!q.get('peerhost')) return { debug: 0, config };
  return { host: q.get('peerhost'), port: Number(q.get('peerport') || 9000), path: q.get('peerpath') || '/', secure: q.get('peersecure') === '1', debug: 0, config };
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
  /**
   * 호스트 세션을 생성하고 PeerJS 시그널링을 시작한다.
   * @param {object} opts
   * @returns {Promise<HostSession>}
   */
  static async create({ code, saved, onPeerStatus = () => {}, onCodeChange = () => {}, onSave = () => {} }) {
    const { Hub } = await import('./server/hub.js');
    const { Room } = await import('./server/room.js');
    const room = saved ? Room.fromJSON(saved) : new Room();
    const s = new HostSession();
    Object.assign(s, { code, hub: new Hub({ room }), onPeerStatus, onCodeChange });
    s.hub.onChange = () => onSave(room.toJSON());
    s.startPeer();
    return s;
  }

  /**
   * PeerJS 호스트 연결을 시작한다. 코드 충돌 시 최대 5회 자동 재발급한다.
   * @param {number} attempt
   */
  startPeer(attempt = 0) {
    if (!peerAvailable()) return this.onPeerStatus('offline');
    try {
      const peer = new window.Peer(PREFIX + this.code, peerOptions());
      this.peer = peer;
      peer.on('open', () => this.onPeerStatus('online'));
      peer.on('disconnected', () => this.handleDisconnect(peer));
      peer.on('error', (e) => this.handlePeerError(e, peer, attempt));
      peer.on('connection', (dc) => this.attachDataChannel(dc));
    } catch {
      this.onPeerStatus('offline');
    }
  }

  /**
   * 시그널링 서버 연결 끊김 시 재연결을 시도한다.
   * @param {object} peer
   */
  handleDisconnect(peer) {
    this.onPeerStatus('offline');
    if (!this.closed) setTimeout(() => !this.closed && !peer.destroyed && peer.reconnect(), 2000);
  }

  /**
   * PeerJS 에러 처리. 방 코드 충돌(unavailable-id) 시 새 코드를 발급한다.
   * @param {object} e
   * @param {object} peer
   * @param {number} attempt
   */
  handlePeerError(e, peer, attempt) {
    if (e.type === 'unavailable-id') {
      if (attempt >= MAX_CODE_RETRIES) return this.onPeerStatus('taken');
      this.code = newCode();
      this.onCodeChange(this.code);
      peer.destroy();
      this.startPeer(attempt + 1);
      return;
    }
    if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) this.onPeerStatus('offline');
  }

  /**
   * 게스트 DataChannel을 Hub에 연결한다.
   * @param {object} dc
   */
  attachDataChannel(dc) {
    dc.on('open', () => {
      const conn = { send: (m) => dc.open && dc.send(m), close: () => dc.close() };
      const h = this.hub.attach(conn);
      dc.on('data', (d) => h.message(d));
      dc.on('close', () => h.close());
      dc.on('error', () => h.close());
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
