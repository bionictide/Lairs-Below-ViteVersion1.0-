import { getCharacterDisplayData } from './CharacterTypes.js'; // Import the client-safe helper
import { EVENTS } from './shared/events.js';

function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
}
function _array_without_holes(arr) {
    if (Array.isArray(arr)) return _array_like_to_array(arr);
}
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _iterable_to_array(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _iterable_to_array_limit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _s, _e;
    try {
        for(_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true){
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
        }
    } catch (err) {
        _d = true;
        _e = err;
    } finally{
        try {
            if (!_n && _i["return"] != null) _i["return"]();
        } finally{
            if (_d) throw _e;
        }
    }
    return _arr;
}
function _non_iterable_rest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _non_iterable_spread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
}
function _to_consumable_array(arr) {
    return _array_without_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_spread();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
import Phaser from 'https://esm.sh/phaser@3.60.0';
import { itemData } from './BagManager.js'; // Import itemData directly
// Helper function for weighted random selection
function weightedRandom(items) {
    var totalWeight = items.reduce(function(sum, item) {
        return sum + item.weight;
    }, 0);
    var random = Math.random() * totalWeight;
    var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
    try {
        for(var _iterator = items[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
            var item = _step.value;
            if (random < item.weight) {
                return item.type;
            }
            random -= item.weight;
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally{
        try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
                _iterator.return();
            }
        } finally{
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
    // Fallback (shouldn't happen if totalWeight > 0)
    return items.length > 0 ? items[0].type : null;
}
export var EncounterManager = /*#__PURE__*/ function() {
    "use strict";
    function EncounterManager(scene, playerStats, playerId, combatVisuals) {
        _class_call_check(this, EncounterManager);
        this.scene = scene;
        this.playerStats = playerStats;
        this.playerId = playerId;
        this.combatVisuals = combatVisuals;
        this.participants = [];
        this.turnQueue = [];
        this.currentTurn = null;
        this.socket = scene.socket;
        // Listen for server-driven encounter events
        this.socket.on(EVENTS.ENCOUNTER_START, (data) => {
            console.log('[CLIENT] Received ENCOUNTER_START:', data);
            if (!data || !Array.isArray(data.participants)) {
                console.error('[CLIENT] ENCOUNTER_START missing participants array:', data);
                return;
            }
            this.participants = data.participants;
            this.turnQueue = data.turnQueue || [];
            this.currentTurn = data.currentTurn || null;
            // Defensive logging for missing participant data
            this.participants.forEach(p => {
                if (!p.id || !p.type) {
                    console.warn('[CLIENT] Participant missing id/type:', p);
                }
            });
            // Render encounter UI (implement as needed)
            this.scene.events.emit('encounterStarted', this.participants, this.turnQueue, this.currentTurn);
        });
        this.socket.on(EVENTS.ENCOUNTER_END, (data) => {
            console.log('[CLIENT] Received ENCOUNTER_END:', data);
            this.participants = [];
            this.turnQueue = [];
            this.currentTurn = null;
            this.scene.events.emit('endEncounter');
        });
        // Other event handlers (attack_result, spell_result, etc.) remain unchanged
        // ... existing code ...
    }
    _create_class(EncounterManager, [
        // REMOVE: initializeEncounter, calculateInitialLoot, handleAIAction, and all local entity/team creation logic
        // REMOVE: all local AI/NPC action logic
        // All UI/turn logic should use only server-sent participant/team data
        // ... existing code ...
    ]);
    return EncounterManager;
}();
