// GroupManagerServer.js
// Authoritative group management for players and NPCs

class GroupManagerServer {
  constructor() {
    this.groups = new Map(); // groupId -> group object
  }

  /**
   * Create a new group.
   * @param {string} groupId
   * @param {string} leaderId
   * @param {Array<string>} memberIds
   * @param {object} options - { type: 'player'|'npc'|'mixed', encounterId, state }
   */
  createGroup(groupId, leaderId, memberIds = [], options = {}) {
    if (this.groups.has(groupId)) throw new Error(`Group ${groupId} already exists`);
    if (!leaderId) throw new Error('Group must have a leaderId');
    const group = {
      groupId,
      leaderId,
      memberIds: [leaderId, ...memberIds.filter(id => id !== leaderId)].slice(0, 3), // max 3, leader first
      type: options.type || 'player', // player, npc, or mixed
      encounterId: options.encounterId || null,
      state: options.state || 'idle', // idle, in_encounter, disbanded, etc.
      created: Date.now(),
      lastActive: Date.now(),
    };
    this.groups.set(groupId, group);
    return group;
  }

  /**
   * Destroy a group.
   * @param {string} groupId
   */
  destroyGroup(groupId) {
    this.groups.delete(groupId);
  }

  /**
   * Get group object by ID.
   * @param {string} groupId
   * @returns {object|null}
   */
  getGroup(groupId) {
    return this.groups.get(groupId) || null;
  }

  /**
   * Add a member to a group (max 3).
   * @param {string} groupId
   * @param {string} memberId
   */
  addMember(groupId, memberId) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error(`Group ${groupId} not found`);
    if (group.memberIds.length >= 3) throw new Error('Group is full');
    if (!group.memberIds.includes(memberId)) {
      group.memberIds.push(memberId);
      group.lastActive = Date.now();
    }
    return group;
  }

  /**
   * Remove a member from a group.
   * @param {string} groupId
   * @param {string} memberId
   */
  removeMember(groupId, memberId) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error(`Group ${groupId} not found`);
    group.memberIds = group.memberIds.filter(id => id !== memberId);
    if (group.leaderId === memberId) {
      // Promote next member to leader, or disband if empty
      group.leaderId = group.memberIds[0] || null;
      if (!group.leaderId) {
        this.destroyGroup(groupId);
        return null;
      }
    }
    group.lastActive = Date.now();
    return group;
  }

  /**
   * Set the group leader.
   * @param {string} groupId
   * @param {string} leaderId
   */
  setLeader(groupId, leaderId) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error(`Group ${groupId} not found`);
    if (!group.memberIds.includes(leaderId)) throw new Error('Leader must be a group member');
    group.leaderId = leaderId;
    group.lastActive = Date.now();
  }

  /**
   * Assign group to an encounter.
   * @param {string} groupId
   * @param {string|null} encounterId
   */
  setGroupEncounter(groupId, encounterId) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error(`Group ${groupId} not found`);
    group.encounterId = encounterId;
    group.state = encounterId ? 'in_encounter' : 'idle';
    group.lastActive = Date.now();
  }

  /**
   * Get all groups a member belongs to (should be at most one).
   * @param {string} memberId
   * @returns {Array}
   */
  getGroupsForMember(memberId) {
    return Array.from(this.groups.values()).filter(g => g.memberIds.includes(memberId));
  }

  /**
   * Get group for a member (returns first match or null).
   * @param {string} memberId
   * @returns {object|null}
   */
  getGroupForMember(memberId) {
    return this.getGroupsForMember(memberId)[0] || null;
  }

  /**
   * Get all groups in an encounter.
   * @param {string} encounterId
   * @returns {Array}
   */
  getGroupsInEncounter(encounterId) {
    return Array.from(this.groups.values()).filter(g => g.encounterId === encounterId);
  }

  /**
   * Get all members of a group.
   * @param {string} groupId
   * @returns {Array}
   */
  getMembers(groupId) {
    const group = this.getGroup(groupId);
    return group ? group.memberIds : [];
  }

  /**
   * Get group status (for ManagerManager).
   * @param {string} groupId
   * @returns {object|null}
   */
  getStatus(groupId) {
    const group = this.getGroup(groupId);
    if (!group) return null;
    return {
      groupId: group.groupId,
      leaderId: group.leaderId,
      memberIds: group.memberIds,
      type: group.type,
      encounterId: group.encounterId,
      state: group.state,
      created: group.created,
      lastActive: group.lastActive,
    };
  }
}

const instance = new GroupManagerServer();
export default instance; 