// Nachrichten zwischen Spielgeräten und dem Raum, unabhängig von der Verbindungsart.
// Wird vom PC-Server (WebSocket) und vom Tablet als Gastgeber (lokal + Peer-Verbindungen) benutzt.
// Eine Verbindung ist ein Objekt mit send(obj) und close().
import { Room } from './room.js';
import { GameError } from '../src/engine/game.js';

export class Hub {
  constructor({ room = new Room(), botDelayMs = null, log = console } = {}) {
    this.room = room;
    this.botDelayMs = botDelayMs;
    this.log = log;
    this.conns = [null, null, null, null]; // 최대 4인 자리 → 연결
    this.botTimer = null;
  }

  send(conn, msg) {
    try {
      conn?.send(msg);
    } catch {
      /* Verbindung schon weg */
    }
  }

  broadcast(events = []) {
    for (let seat = 0; seat < this.room.seats.length; seat++) {
      this.send(this.conns[seat], { t: 'state', view: this.room.viewFor(seat), events });
    }
    this.scheduleBot(events);
    this.onChange?.();
  }

  // Computer zieht, wenn die Szene auf den Geräten ungefähr fertig ist
  scheduleBot(events) {
    clearTimeout(this.botTimer);
    if (!this.room.botNeedsToAct()) return;
    const bigMove = events.some((e) => e.type === 'played' || e.type === 'flipped');
    const delay = this.botDelayMs ?? (bigMove ? 3400 : 1300);
    this.botTimer = setTimeout(() => {
      try {
        const ev = this.room.botStep();
        if (ev) this.broadcast(ev);
      } catch (e) {
        this.log.error('  [컴퓨터 오류]', e);
      }
    }, delay);
  }

  // neue Verbindung: gibt { message(msg), close() } zurück
  attach(conn) {
    let seat = null;
    const message = (msg) => {
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
      if (msg.t === 'hello') {
        const r = this.room.join(typeof msg.token === 'string' ? msg.token : null);
        if (!r.ok) {
          this.send(conn, { t: 'full' });
          conn.close();
          return;
        }
        seat = r.seat;
        const old = this.conns[seat];
        if (old && old !== conn) {
          this.send(old, { t: 'replaced' });
          old.close();
        }
        this.conns[seat] = conn;
        this.send(conn, { t: 'welcome', seat, token: r.token });
        this.broadcast();
        return;
      }
      if (seat === null || this.conns[seat] !== conn) return this.send(conn, { t: 'error', code: 'NO_SEAT' });
      try {
        if (msg.t === 'action') this.broadcast(this.room.act(seat, msg.action));
        else if (msg.t === 'solo') {
          this.room.fillWithBots(seat);
          this.broadcast([{ type: 'newRound', round: this.room.round }]);
        } else if (msg.t === 'options') {
          this.room.setOptions({ bonus: msg.bonus, players: msg.players, biGodori: msg.biGodori });
          this.broadcast();
        } else if (msg.t === 'nextRound') {
          this.room.nextRound(seat);
          this.broadcast([{ type: 'newRound', round: this.room.round }]);
        }
      } catch (e) {
        if (!(e instanceof GameError)) this.log.error('  [오류]', e);
        this.send(conn, { t: 'error', code: e instanceof GameError ? e.code : 'ILLEGAL' });
      }
    };
    const close = () => {
      if (seat !== null && this.conns[seat] === conn) {
        this.conns[seat] = null;
        this.room.leave(seat); // vor Spielbeginn wird der Platz frei
        this.broadcast();
      }
    };
    return { message, close };
  }

  reset() {
    clearTimeout(this.botTimer);
    this.room.reset();
    for (let seat = 0; seat < this.conns.length; seat++) {
      this.send(this.conns[seat], { t: 'reset' });
      this.conns[seat]?.close();
      this.conns[seat] = null;
    }
  }

  dispose() {
    clearTimeout(this.botTimer);
  }
}
