// EncounterManagerServer.js
// Server-authoritative encounter and combat management.

export class EncounterManager {
  constructor() {
    this.encounters = new Map(); // encounterId -> encounter object
  }

  createEncounter(encounter) {
    if (!encounter.id) throw new Error('Encounter must have an id');
    this.encounters.set(encounter.id, encounter);
  }

  getEncounter(encounterId) {
    return this.encounters.get(encounterId) || null;
  }

  getAllEncounters() {
    return Array.from(this.encounters.values());
  }

  removeEncounter(encounterId) {
    this.encounters.delete(encounterId);
  }

  addParticipant(encounterId, playerId) {
    const encounter = this.getEncounter(encounterId);
    if (!encounter) throw new Error(`Encounter ${encounterId} not found`);
    if (!encounter.participants) encounter.participants = new Set();
    encounter.participants.add(playerId);
  }

  removeParticipant(encounterId, playerId) {
    const encounter = this.getEncounter(encounterId);
    if (encounter && encounter.participants) {
      encounter.participants.delete(playerId);
    }
  }

  getParticipants(encounterId) {
    const encounter = this.getEncounter(encounterId);
    return encounter && encounter.participants ? Array.from(encounter.participants) : [];
  }

  setEncounterState(encounterId, state) {
    const encounter = this.getEncounter(encounterId);
    if (encounter) {
      encounter.state = state;
    }
  }

  getEncounterState(encounterId) {
    const encounter = this.getEncounter(encounterId);
    return encounter ? encounter.state : null;
  }

  // Utility: Find encounter by property
  findEncounterBy(prop, value) {
    for (const encounter of this.encounters.values()) {
      if (encounter[prop] === value) return encounter;
    }
    return null;
  }
}

export default new EncounterManager();
