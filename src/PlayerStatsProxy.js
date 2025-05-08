// PlayerStatsProxy.js
// Secure proxy for player stats: fetches all values from server, never stores sensitive data locally.
// Usage: const stats = new PlayerStatsProxy(socket, playerId);

class EventEmitter {
  constructor() { this.events = {}; }
  on(event, fn) { (this.events[event] = this.events[event] || []).push(fn); }
  emit(event, ...args) { (this.events[event] || []).forEach(fn => fn(...args)); }
}

export class PlayerStatsProxy {
  constructor(socket, playerId) {
    this.socket = socket;
    this.playerId = playerId;
    this.events = new EventEmitter();
    this._cache = {};

    // Listen for stat updates from server
    this.socket.on('player_stat_update', (payload) => {
      if (payload.playerId === this.playerId) {
        this._cache = { ...this._cache, ...payload.stats };
        this.events.emit('statsChanged', this._cache);
        if ('health' in payload.stats) {
          this.events.emit('healthChanged', payload.stats.health);
        }
      }
    });
  }

  // Request a stat from the server
  getStat(statName) {
    this.socket.emit('request_player_stat', { playerId: this.playerId, stat: statName });
    return this._cache[statName]; // May be undefined until server responds
  }

  // Example: getHealth for HealthBar
  getHealth() {
    return this.getStat('health');
  }

  // Add more getters as needed (attack, defense, etc.)
  getAttack() { return this.getStat('attack'); }
  getDefense() { return this.getStat('defense'); }
  // ...
} 