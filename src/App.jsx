import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { EVENTS } from "./shared/events.js";
import socket from "./socket.js";

const supabase = createClient("https://YOUR_PROJECT.supabase.co", "YOUR_PUBLIC_ANON_KEY");

// HARD-CODED CLASS PREVIEW STATS — DO NOT REMOVE
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    return () => socket.off("connect");
  }, []);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      console.error("Login error:", error.message);
    } else {
      setUser(data.user);
    }
  };

  const handleJoin = () => {
    if (!user) return;
    socket.emit(EVENTS.PLAYER_JOIN, { class: selectedClass, userId: user.id });
  };

  const preview = CLASS_PREVIEW[selectedClass];
  const derived = getDerivedStats(preview);

  return (
    <div className="app-container">
      <h1>Enter the Dungeon</h1>
      {!user ? (
        <div>
          <input
            type="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin}>Login</button>
        </div>
      ) : (
        <>
          <div>
            <label>Class:</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              {Object.keys(CLASS_PREVIEW).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <h2>{selectedClass} Stats</h2>
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
          <button onClick={handleJoin}>Enter</button>
        </>
      )}
    </div>
  );
}
