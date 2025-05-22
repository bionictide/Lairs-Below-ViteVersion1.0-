import React, { useState } from "react";
import socket from "./socket";
import { EVENTS } from "./shared/events";

const CLASS_DISPLAY_STATS = {
  Dwarf: {
    STR: 6,
    DEX: 4,
    VIT: 15,
    INT: 0,
    MND: 3,
    SPD: 7,
    derived: {
      HP: 15 * 50,
      Attack: 6 * 10,
      Defense: 15 * 0.5
    }
  },
  Elvaan: {
    STR: 8,
    DEX: 5,
    VIT: 10,
    INT: 0,
    MND: 2,
    SPD: 10,
    derived: {
      HP: 10 * 50,
      Attack: 8 * 10,
      Defense: 10 * 0.5
    }
  },
  Gnome: {
    STR: 4,
    DEX: 10,
    VIT: 8,
    INT: 0,
    MND: 3,
    SPD: 10,
    derived: {
      HP: 8 * 50,
      Attack: 4 * 10,
      Defense: 8 * 0.5
    }
  }
};

function App() {
  const [selectedClass, setSelectedClass] = useState("Dwarf");

  const stats = CLASS_DISPLAY_STATS[selectedClass];
  const handleClassSelect = (e) => {
    setSelectedClass(e.target.value);
  };

  const handleJoin = () => {
    socket.emit(EVENTS.PLAYER_JOIN, { class: selectedClass });
  };

  return (
    <div>
      <h1>Choose Your Class</h1>
      <select onChange={handleClassSelect} value={selectedClass}>
        {Object.keys(CLASS_DISPLAY_STATS).map((charClass) => (
          <option key={charClass} value={charClass}>
            {charClass}
          </option>
        ))}
      </select>

      <h2>Stats</h2>
      <ul>
        <li>STR: {stats.STR}</li>
        <li>DEX: {stats.DEX}</li>
        <li>VIT: {stats.VIT}</li>
        <li>INT: {stats.INT}</li>
        <li>MND: {stats.MND}</li>
        <li>SPD: {stats.SPD}</li>
      </ul>

      <h2>Derived</h2>
      <ul>
        <li>HP: {stats.derived.HP}</li>
        <li>Attack: {stats.derived.Attack}</li>
        <li>Defense: {stats.derived.Defense}</li>
      </ul>

      <button onClick={handleJoin}>Enter Dungeon</button>
    </div>
  );
}

export default App;
