import { describe, it, expect, beforeEach } from 'vitest';
import PlayerManagerServer from '../PlayerManagerServer.js';
import GroupManagerServer from '../GroupManagerServer.js';
import RoomManagerServer from '../RoomManagerServer.js';
import EncounterManagerServer from '../EncounterManagerServer.js';
import * as SpellManagerServer from '../SpellManagerServer.js';
import * as BagManagerServer from '../BagManagerServer.js';
import * as ShelfManagerServer from '../ShelfManagerServer.js';
import * as TreasureManagerServer from '../TreasureManagerServer.js';
import * as PuzzleManagerServer from '../PuzzleManagerServer.js';
import { EVENTS } from '../../src/shared/events.js';

// Helper to reset all managers (where possible)
function resetManagers() {
  PlayerManagerServer.players.clear();
  GroupManagerServer.groups.clear();
  RoomManagerServer.rooms.clear();
  EncounterManagerServer.encounters.clear();
  // BagManagerServer, ShelfManagerServer, TreasureManagerServer, PuzzleManagerServer use module-level state
  // For now, assume a fresh process for each test run
}

describe('Manager Integration', () => {
  beforeEach(() => {
    resetManagers();
  });

  it('should add a player, create a group, and assign to a room', () => {
    const playerId = 'p1';
    const statBlock = { vit: 10, str: 5, int: 3, dex: 2, mnd: 1, spd: 4 };
    PlayerManagerServer.addPlayer(playerId, statBlock, { location: { roomId: 'r1' } });
    expect(PlayerManagerServer.getPlayer(playerId)).toBeTruthy();
    RoomManagerServer.addRoom({ id: 'r1', players: new Set() });
    RoomManagerServer.addPlayerToRoom('r1', playerId);
    expect(RoomManagerServer.getPlayersInRoom('r1')).toContain(playerId);
    GroupManagerServer.createGroup('g1', playerId, []);
    expect(GroupManagerServer.getGroup('g1')).toBeTruthy();
    GroupManagerServer.addMember('g1', playerId);
    expect(GroupManagerServer.getMembers('g1')).toContain(playerId);
  });

  it('should create an encounter and resolve a physical attack', () => {
    const p1 = 'p1', p2 = 'p2';
    PlayerManagerServer.addPlayer(p1, { vit: 10, str: 5, int: 3, dex: 2, mnd: 1, spd: 4 });
    PlayerManagerServer.addPlayer(p2, { vit: 8, str: 4, int: 2, dex: 3, mnd: 2, spd: 5 });
    const encounter = EncounterManagerServer.createEncounter({ participantIds: [p1, p2], starterId: p1 });
    expect(encounter).toBeTruthy();
    const result = PlayerManagerServer.resolvePhysicalAttack(p1, p2);
    expect(result).toHaveProperty('attackerId', p1);
    expect(result).toHaveProperty('defenderId', p2);
    expect(result).toHaveProperty('damageDealt');
    // Defender health should decrease
    const defender = PlayerManagerServer.getPlayer(p2);
    expect(defender.playerStats._currentHealth).toBeLessThan(defender.playerStats._maxHealth);
  });

  it('should cast a spell and apply effects', () => {
    const p1 = 'p1', p2 = 'p2';
    PlayerManagerServer.addPlayer(p1, { vit: 10, str: 5, int: 10, dex: 2, mnd: 1, spd: 4 });
    PlayerManagerServer.addPlayer(p2, { vit: 8, str: 4, int: 2, dex: 3, mnd: 2, spd: 5 });
    // Give caster required gem
    PlayerManagerServer.getPlayer(p1).playerStats.inventory = ['Raw Ruby'];
    const spell = SpellManagerServer.getSpellData('Firestorm');
    expect(spell).toBeTruthy();
    const result = SpellManagerServer.resolveSpellCast(p1, p2, 'Firestorm');
    expect(result).toHaveProperty('casterId', p1);
    expect(result).toHaveProperty('targetId', p2);
    expect(result).toHaveProperty('damageDealt');
    // Target health should decrease
    const defender = PlayerManagerServer.getPlayer(p2);
    expect(defender.playerStats._currentHealth).toBeLessThan(defender.playerStats._maxHealth);
  });

  it('should not cast a spell if missing required gems', () => {
    const p1 = 'p1', p2 = 'p2';
    PlayerManagerServer.addPlayer(p1, { vit: 10, str: 5, int: 10, dex: 2, mnd: 1, spd: 4 });
    PlayerManagerServer.addPlayer(p2, { vit: 8, str: 4, int: 2, dex: 3, mnd: 2, spd: 5 });
    PlayerManagerServer.getPlayer(p1).playerStats.inventory = [];
    const result = SpellManagerServer.resolveSpellCast(p1, p2, 'Firestorm');
    expect(result).toHaveProperty('error');
    expect(result.error).toMatch(/Missing required gems/);
  });

  it('should handle loot bag creation and pickup', () => {
    const playerId = 'p1';
    PlayerManagerServer.addPlayer(playerId, { vit: 10, str: 5, int: 3, dex: 2, mnd: 1, spd: 4 });
    const bag = BagManagerServer.createLootBag({ ownerId: playerId, roomId: 'r1', facingDirection: 'N', items: [{ id: 'item1', name: 'Sword' }] });
    expect(bag).toBeTruthy();
    const visibleBags = BagManagerServer.getVisibleLootBagsForRoom('r1');
    expect(visibleBags.map(b => b.bagId)).toContain(bag.bagId);
    const item = BagManagerServer.lootItem({ bagId: bag.bagId, itemId: 'item1' });
    expect(item).toBeTruthy();
    // Bag should be empty after pickup
    expect(bag.contents.length).toBe(0);
  });

  it('should handle shelf and treasure pickup', () => {
    ShelfManagerServer.createShelf('r1', 'N', [{ id: 'gem1', name: 'Blue Apatite' }]);
    const shelf = ShelfManagerServer.getShelf('r1', 'N');
    expect(shelf).toBeTruthy();
    expect(shelf.items.length).toBe(1);
    ShelfManagerServer.removeItemFromShelf('r1', 'N', 'gem1');
    expect(shelf.items.length).toBe(0);
    TreasureManagerServer.createTreasure('r1', 'E', [{ id: 'gold1', name: 'Gold Coin' }]);
    // getTreasure is not exported, so we skip that assertion
    // If you want to test treasure contents, export getTreasure from TreasureManagerServer
  });

  it('should handle puzzle creation and solving', () => {
    PuzzleManagerServer.createPuzzle('puz1', 'answer');
    expect(PuzzleManagerServer.isPuzzleSolved('puz1')).toBe(false);
    // Simulate socket with emit
    let solved = false;
    const fakeSocket = { emit: (event, data) => { if (event === EVENTS.PUZZLE_SOLVED) solved = true; } };
    PuzzleManagerServer.handlePuzzleAttempt(fakeSocket, { puzzleId: 'puz1', answer: 'answer' });
    expect(solved).toBe(true);
    expect(PuzzleManagerServer.isPuzzleSolved('puz1')).toBe(true);
  });

  it('should not allow invalid player actions', () => {
    const result = PlayerManagerServer.resolvePhysicalAttack('bad', 'worse');
    expect(result).toHaveProperty('error');
    const spellResult = SpellManagerServer.resolveSpellCast('bad', 'worse', 'Firestorm');
    expect(spellResult).toHaveProperty('error');
  });
}); 