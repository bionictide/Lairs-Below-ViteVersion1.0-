import React, { useState, useEffect } from "react";
import socket from "./socket";
import { EVENTS } from "./shared/events";

// Hardcoded stat previews only for visual display (real values come from Supabase)
const CLASS_PREVIEW = {
  Dwarf: { STR: 6, DEX: 4, VIT: 15, INT: 0, MND: 3, SPD: 7 },
  Elvaan: { STR: 8, DEX: 5, VIT: 10, INT: 0, MND: 2, SPD: 10 },
  Gnome: { STR: 4, DEX: 10, VIT: 8, INT: 0, MND: 3, SPD: 10 }
};

const getDerivedStats = ({ STR, VIT }) => ({
  HP: VIT * 50,
  Attack: STR * 10,
  Defense: VIT * 0.5
});

export default function App() {
  const [selectedClass, setSelectedClass] = useState("Dwarf");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    return () => socket.off("connect");
  }, []);

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
  };

  const handleEnter = () => {
    socket.emit(EVENTS.PLAYER_JOIN, { class: selectedClass });
    // Assume server handles room init, stat sync, etc.
  };

  const preview = CLASS_PREVIEW[selectedClass];
  const derived = getDerivedStats(preview);

  return (
    <div className="app-container">
      <h1>Enter the Dungeon</h1>

      {!connected ? (
        <p>Connecting...</p>
      ) : (
        <>
          <div>
            <label htmlFor="class-select">Choose Class:</label>
            <select id="class-select" onChange={handleClassChange} value={selectedClass}>
              {Object.keys(CLASS_PREVIEW).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="stat-preview">
            <h2>{selectedClass} Preview</h2>
            <ul>
              <li>STR: {preview.STR}</li>
              <li>DEX: {preview.DEX}</li>
              <li>VIT: {preview.VIT}</li>
              <li>INT: {preview.INT}</li>
              <li>MND: {preview.MND}</li>
              <li>SPD: {preview.SPD}</li>
              <li>HP: {derived.HP}</li>
              <li>Attack: {derived.Attack}</li>
              <li>Defense: {derived.Defense}</li>
            </ul>
          </div>

          <button onClick={handleEnter}>Enter Dungeon</button>
        </>
      )}
    </div>
  );
}
