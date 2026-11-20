import { createGame, applyAction, legalActions, GameError } from '../src/engine/game.js';
import { makeRng } from '../src/engine/rng.js';
import { viewFor as gameView } from '../src/engine/view.js';
import { chooseAction } from './bot.js';

// 자리(2 또는 3), 토큰, 라운드, 누적 점수. 빈 자리는 컴퓨터가 채울 수 있다.
export class Room {
  constructor({ seed } = {}) {
    this.rng = makeRng(seed ?? Date.now());
    this.options = { bonus: false, players: 2 };
    this.reset();
  }

  reset() {
    this.seats = Array(this.options.players).fill(null);
    this.game = null;
    this.totals = Array(this.options.players).fill(0);
    this.round = 0;
    this.carry = 0;
    this.starter = null;
    this.counted = false;
  }

  get mode() {
    return this.seats.some((s) => s?.bot) ? 'solo' : 'duo';
  }

  validSeat(seat) {
    return Number.isInteger(seat) && seat >= 0 && seat < this.seats.length;
  }

  join(token) {
    const known = this.seats.findIndex((s) => s && !s.bot && token && s.token === token);
    if (known >= 0) return { ok: true, seat: known, token };
    const free = this.seats.indexOf(null);
    if (free < 0) return { ok: false, code: 'FULL' };
    const fresh = globalThis.crypto.randomUUID(); // im Browser und in Node vorhanden
    this.seats[free] = { token: fresh };
    if (this.seats.every(Boolean) && !this.game) this.startRound(this.randomSeat());
    return { ok: true, seat: free, token: fresh };
  }

  // 게임 시작 전에 나간 자리는 비운다. 게임 중에는 재접속을 위해 남겨 둔다.
  leave(seat) {
    if (!this.game && this.validSeat(seat) && !this.seats[seat]?.bot) this.seats[seat] = null;
  }

  randomSeat() {
    return Math.floor(this.rng() * this.seats.length);
  }

  startRound(starter) {
    this.round += 1;
    this.starter = starter;
    this.counted = false;
    this.game = createGame({
      seed: Math.floor(this.rng() * 2 ** 32),
      starter,
      carry: this.carry,
      bonus: this.options.bonus,
      players: this.seats.length,
    });
    this.countResult(); // 대통령이면 나누자마자 끝난다
  }

  countResult() {
    const r = this.game?.result;
    if (!r || this.counted) return;
    this.counted = true;
    if (r.kind === 'win') {
      this.totals[r.winner] += r.settlement.final;
      this.carry = 0;
    } else {
      this.carry += 1;
    }
  }

  // 보너스는 다음 판부터. 인원(2/3)은 게임 시작 전에만 바꿀 수 있다.
  setOptions(opts = {}) {
    if (opts.bonus !== undefined) this.options.bonus = Boolean(opts.bonus);
    const players = Number(opts.players);
    if ((players === 2 || players === 3) && !this.game && players !== this.seats.length) {
      // 자리 번호는 바꾸지 않는다: 줄일 때는 없어질 자리가 비어 있어야 한다
      if (this.seats.slice(players).every((x) => x === null)) {
        this.options.players = players;
        this.seats = Array.from({ length: players }, (_, i) => this.seats[i] ?? null);
        this.totals = Array(players).fill(0);
        if (this.seats.every(Boolean)) this.startRound(this.randomSeat());
      }
    }
  }

  // 빈 자리를 컴퓨터로 채우고 시작한다
  fillWithBots(seat) {
    if (this.game || !this.validSeat(seat) || !this.seats[seat]) throw new GameError('ILLEGAL');
    if (!this.seats.includes(null)) throw new GameError('ILLEGAL');
    this.seats = this.seats.map((s) => s ?? { token: null, bot: true });
    this.startRound(this.randomSeat());
  }

  startSolo(seat) {
    this.fillWithBots(seat);
  }

  // 지금 둬야 하는 컴퓨터 자리 (없으면 -1)
  botToAct() {
    if (!this.game || this.game.result) return -1;
    return this.seats.findIndex((s, i) => s?.bot && legalActions(this.game, i).length > 0);
  }

  botNeedsToAct() {
    return this.botToAct() >= 0;
  }

  botStep() {
    const b = this.botToAct();
    if (b < 0) return null;
    return this.act(b, chooseAction(this.game, b));
  }

  act(seat, action) {
    if (!this.game || !this.validSeat(seat)) throw new GameError('ILLEGAL');
    const events = applyAction(this.game, seat, action);
    this.countResult();
    return events;
  }

  nextRound(seat) {
    if (!this.game?.result || !this.validSeat(seat)) throw new GameError('ILLEGAL');
    const r = this.game.result;
    this.startRound(r.kind === 'win' ? r.winner : this.starter);
  }

  // Speichern/Wiederherstellen (Gastgeber-Tablet lädt die Seite neu)
  toJSON() {
    const { seats, options, game, totals, round, carry, starter, counted } = this;
    return { v: 1, seats, options, game, totals, round, carry, starter, counted };
  }

  static fromJSON(data) {
    const room = new Room();
    Object.assign(room, {
      seats: data.seats,
      options: data.options,
      game: data.game,
      totals: data.totals,
      round: data.round,
      carry: data.carry,
      starter: data.starter,
      counted: data.counted,
    });
    return room;
  }

  viewFor(seat) {
    return {
      phase: this.game ? 'playing' : 'waiting',
      seat,
      players: this.seats.length,
      seats: this.seats.map((s) => (s ? (s.bot ? 'bot' : 'human') : 'empty')),
      game: this.game ? gameView(this.game, seat) : null,
      totals: [...this.totals],
      round: this.round,
      mode: this.mode,
      options: { ...this.options },
    };
  }
}
