// RoomManager for server authority
// Migrated from src/RoomManager.js
// All logic/state is server-side; visuals/Phaser code is client-side only

class RoomManager {
    constructor() {
        this.directionMappings = {
            north: { left: 'west', forward: 'north', right: 'east' },
            east: { left: 'north', forward: 'east', right: 'south' },
            south: { left: 'east', forward: 'south', right: 'west' },
            west: { left: 'south', forward: 'west', right: 'north' }
        };
        this.inverseDirectionMappings = {
            north: { west: 'left', north: 'forward', east: 'right' },
            east: { north: 'left', east: 'forward', south: 'right' },
            south: { east: 'left', south: 'forward', west: 'right' },
            west: { south: 'left', west: 'forward', north: 'right' }
        };
    }
    getVisibleDoors(room, facing, dungeonService) {
        const cardinalDirections = new Set();
        const connectedRooms = room.doors.map(id => dungeonService.getRoomById(id));
        connectedRooms.forEach(target => {
            if (!target) return;
            const cardinalDir = this.getCardinalDirection(room, target);
            if (cardinalDir) cardinalDirections.add(cardinalDir);
        });
        const visualDoors = [];
        cardinalDirections.forEach(cardinalDir => {
            const visualDir = this.inverseDirectionMappings[facing]?.[cardinalDir];
            if (visualDir) visualDoors.push(visualDir);
        });
        const doorOrder = ['left', 'forward', 'right'];
        visualDoors.sort((a, b) => doorOrder.indexOf(a) - doorOrder.indexOf(b));
        return visualDoors;
    }
    getCardinalDirection(room, target) {
        const dx = target.x - room.x;
        const dy = target.y - room.y;
        if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'east' : 'west';
        else if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? 'south' : 'north';
        return null;
    }
    ensureConsistentDoors(dungeon) {
        dungeon.rooms.forEach(room => {
            room.doors = room.doors.filter(id => {
                const target = dungeon.rooms.find(r => r.id === id);
                return target && target.doors.includes(room.id);
            });
        });
        return dungeon;
    }
    getMovementDelta(facing, direction, room, dungeonService) {
        const cardinalDir = this.directionMappings[facing][direction];
        const connectedRooms = room.doors.map(id => dungeonService.getRoomById(id));
        const target = connectedRooms.find(r => r && this.getCardinalDirection(room, r) === cardinalDir);
        if (!target) return { dx: 0, dy: 0, newFacing: facing, targetId: null };
        const dx = target.x - room.x;
        const dy = target.y - room.y;
        return { dx, dy, newFacing: cardinalDir, targetId: target.id };
    }
    isValidMove(room, facing, direction, dungeonService) {
        const cardinalDir = this.directionMappings[facing][direction];
        return room.doors.some(id => {
            const target = dungeonService.getRoomById(id);
            return target && this.getCardinalDirection(room, target) === cardinalDir;
        });
    }
    rotateFacing(facing, rotation) {
        const directions = ['north', 'east', 'south', 'west'];
        let index = directions.indexOf(facing);
        if (rotation === 'left') index = (index - 1 + 4) % 4;
        else if (rotation === 'right') index = (index + 1) % 4;
        else if (rotation === 'around') index = (index + 2) % 4;
        return directions[index];
    }
    hasMiddleDoor(room) {
        return room.doors.length > 2;
    }
}

export { RoomManager }; 