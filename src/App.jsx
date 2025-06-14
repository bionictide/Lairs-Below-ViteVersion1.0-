import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { getCharacterDefinition } from './CharacterTypes.js';
import {
  getHealthFromVIT,
  getPhysicalAttackFromSTR,
  getDefenseFromVIT
} from './StatDefinitions.js';
import { connectSocket, joinPlayer, enterRoom } from './socket.js';
import { EVENTS } from './shared/events.js';
// No imports or exports! All code is in the global scope for in-browser Babel.

// Assume CharacterTypes.js is loaded globally and getPlayableCharacters is available

// Add global style for html/body
if (typeof document !== 'undefined' && !document.getElementById('global-game-style')) {
  const style = document.createElement('style');
  style.id = 'global-game-style';
  style.innerHTML = `
    html, body {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #000;
    }
  `;
  document.head.appendChild(style);
}

const supabase = createClient(
  'https://rcbqjftzzdtbghrrtxai.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjYnFqZnR6emR0YmdocnJ0eGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzNjU2MzksImV4cCI6MjA2MTk0MTYzOX0.htnnrcWi5OIOW6uKh5GDNg-GlMtziye6zXnkbGesYq4'
);

function ResponsiveGameContainer({ children }) {
  const [scale, setScale] = React.useState(1);
  const containerRef = React.useRef(null);
  React.useEffect(() => {
    function updateScale() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScale(Math.min(w / 1456, h / 816));
    }
    window.addEventListener('resize', updateScale);
    updateScale();
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Fullscreen logic
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  const isFullscreen = !!document.fullscreenElement;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        width: 1456,
        height: 816,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        background: '#000',
        overflow: 'hidden',
        zIndex: 9999,
        boxShadow: '0 0 32px #000a',
      }}
    >
      <button
        onClick={handleFullscreen}
        style={{
          position: 'absolute',
          right: 16,
          top: 16,
          zIndex: 10000,
          background: '#222',
          color: '#fff',
          border: '2px solid #fff',
          borderRadius: 8,
          padding: '6px 16px',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          opacity: 0.85,
        }}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
      {children}
    </div>
  );
}

// 1. Combat menu style object
const combatMenuStyle = {
  background: 'rgba(34,34,34,0.95)',
  border: '2px solid #fff',
  borderRadius: 16,
  boxShadow: 'none',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 20,
  fontWeight: 900,
  letterSpacing: 1,
};
const combatButtonStyle = {
  background: '#333',
  border: '2px solid #fff',
  borderRadius: 12,
  color: '#fff',
  fontSize: 20,
  fontWeight: 900,
  padding: '14px 32px',
  cursor: 'pointer',
  margin: '8px 0',
  boxShadow: 'none',
  letterSpacing: 1,
  transition: 'background 0.2s',
};
const combatButtonHover = { background: '#555' };
const combatButtonDisabled = { background: '#555', color: '#999', border: '2px solid #aaa', cursor: 'not-allowed' };

// 2. LoginScreen with combat menu styling and background
function LoginScreen({ onLogin }) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [hover, setHover] = React.useState(false);
  const [isSignup, setIsSignup] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        const { error: signupError } = await supabase.auth.signUp({
          email: username,
          password,
        });
        if (signupError) {
          setError(signupError.message);
        } else {
          setError('Signup successful! Please check your email to confirm your account.');
        }
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: username,
          password,
        });
        if (loginError) {
          setError(loginError.message);
        } else {
          // Connect to Socket.io server with JWT
          const token = data.session?.access_token;
          console.log('Supabase login data:', data);
          if (token) {
            // Pass the token and user info to the parent App
            onLogin({ token, playerId: data.user.id, user_id: data.user.id, user: data.user });
          } else {
            onLogin(data.user);
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred: ' + (err?.message || JSON.stringify(err)));
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveGameContainer>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1456, height: 816, backgroundImage: 'url(./Assets/Forward.png)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          alignItems: 'center',
          background: 'none',
          minWidth: 0,
          padding: 0,
          zIndex: 1,
        }}
      >
        <h2 style={{ color: '#fff', textAlign: 'center', letterSpacing: 2, fontSize: 28, fontWeight: 900, marginBottom: 32, marginTop: -32 }}>
          {isSignup ? 'Create Account' : 'Login'}
        </h2>
        <input
          type="text"
          placeholder="Email"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{ padding: 10, borderRadius: 2, border: '2px solid #fff', fontSize: 16, background: '#222', color: '#fff', width: 180, marginBottom: 4 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ padding: 10, borderRadius: 2, border: '2px solid #fff', fontSize: 16, background: '#222', color: '#fff', width: 180, marginBottom: 4 }}
        />
        {error && <div style={{ color: isSignup && error.startsWith('Signup successful') ? 'lightgreen' : 'salmon', textAlign: 'center', fontWeight: 700 }}>{error}</div>}
        <button
          type="submit"
          style={{ ...combatButtonStyle, ...(hover ? combatButtonHover : {}), borderRadius: 2, width: 120, height: 32, fontSize: 14, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, opacity: loading ? 0.7 : 1 }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          disabled={loading}
        >
          <span style={{ width: '100%', textAlign: 'center', lineHeight: '32px', display: 'block' }}>{isSignup ? 'Sign Up' : 'Login'}</span>
        </button>
        <button
          type="button"
          style={{ ...combatButtonStyle, background: 'transparent', color: '#fff', border: 'none', boxShadow: 'none', fontSize: 13, marginTop: 0, textDecoration: 'underline', width: 120, height: 24, padding: 0, cursor: 'pointer', marginBottom: -32 }}
          onClick={() => { setIsSignup(s => !s); setError(''); }}
          tabIndex={-1}
        >
          {isSignup ? 'Already have an account? Login' : 'Create an account'}
        </button>
      </form>
      <div style={{ position: 'fixed', bottom: 8, width: '100%', textAlign: 'center', fontSize: '0.9em', color: '#aaa', zIndex: 1000 }}>
        <a href="https://www.bionictide.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6cf', marginRight: 8, textDecoration: 'underline' }}>www.BionicTide.com</a>
        <span style={{ color: '#888', margin: '0 8px' }}>|</span>
        <a href="https://www.nerdninjastudios.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6cf', textDecoration: 'underline' }}>Discord</a>
      </div>
    </ResponsiveGameContainer>
  );
}

// 3. CharacterSelectScreen with exact stats, animation, and in-game menu styling
function CharacterSelectScreen({ onSelect, error }) {
  // Use CharacterTypes.js for stat blocks
  const characterTypes = ['dwarf', 'elvaan', 'gnome'];
  const characters = characterTypes.map(typeKey => {
    const def = getCharacterDefinition(typeKey);
    return {
      name: def.name,
      img: `./Assets/${def.assetPrefix}1.png`,
      stats: def.stats,
      abilities: def.abilities,
      type: def.type,
      comingSoon: false
    };
  });
  // Add placeholders for coming soon
  characters.push({ name: '?????', img: '', stats: {}, abilities: [], comingSoon: true });
  characters.push({ name: '?????', img: '', stats: {}, abilities: [], comingSoon: true });
  const [selected, setSelected] = React.useState(0); // which character is selected by click
  const [nameEntry, setNameEntry] = React.useState(false);
  const [lockedType, setLockedType] = React.useState(null); // which character is locked for name entry
  const [slideIn, setSlideIn] = React.useState(false);
  const [reveal, setReveal] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [name, setName] = React.useState('');
  const [localError, setLocalError] = React.useState('');
  const [spriteKey, setSpriteKey] = React.useState(0); // force re-render for animation
  const [statVisibilities, setStatVisibilities] = React.useState([false, false, false, false]);
  const bannedWords = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'nigger', 'fag', 'faggot', 'kike', 'spic', 'chink', 'gook', 'slut', 'whore', 'retard', 'nigga', 'coon', 'twat', 'wop', 'dyke', 'tranny', 'paki', 'gyp', 'kraut', 'wetback', 'cameltoe', 'jap', 'zipperhead', 'homo', 'queer', 'pussy', 'cock', 'penis', 'vagina', 'anus', 'arse', 'bollocks', 'bugger', 'crap', 'damn', 'douche', 'jackass', 'jerk', 'prick', 'shithead', 'wanker', 'motherfucker', 'suck', 'cum', 'tit', 'boob', 'boobs', 'nipple', 'rape', 'rapist', 'molest', 'molester', 'pedophile', 'pedo', 'anal', 'oral', 'ejaculate', 'masturbate', 'masturbation', 'orgasm', 'porn', 'porno', 'pornography', 'sex', 'sexy', 'sperm', 'testicle', 'testicles', 'vulva', 'clit', 'clitoris', 'fisting', 'rimjob', 'scrotum', 'sodomy', 'sodomize', 'sodomized', 'sodomizing', 'tits', 'titties', 'titfuck', 'twink', 'twinkie', 'vag', 'wank', 'whore', 'xxx', 'arsehole', 'bimbo', 'biatch', 'blowjob', 'boner', 'butt', 'clit', 'cock', 'cum', 'cunt', 'dildo', 'dyke', 'fag', 'faggot', 'felch', 'fellate', 'fellatio', 'felching', 'fuck', 'fucker', 'fucking', 'handjob', 'jizz', 'knob', 'labia', 'muff', 'nob', 'nookie', 'piss', 'pissed', 'pissing', 'poop', 'prick', 'pube', 'pubes', 'queef', 'rimjob', 'shit', 'shite', 'shitty', 'shlong', 'skeet', 'slut', 'spunk', 'twat', 'wank', 'whore', 'wiener', 'willy', 'arse', 'arsehole', 'bastard', 'bollocks', 'bugger', 'choad', 'crap', 'damn', 'dick', 'douche', 'fanny', 'git', 'knob', 'minger', 'munter', 'pillock', 'plonker', 'prat', 'scrubber', 'shag', 'slag', 'sodding', 'tosser', 'twat', 'wanker', 'wazzock', 'bellend', 'minge', 'nonce', 'ponce', 'punani', 'slag', 'slapper', 'spacker', 'spaz', 'tosser', 'trollop', 'turd', 'twat', 'wazzock', 'wuss', 'yob', 'yobbo'
  ];
  const isBannedWord = (name) => {
    const lowerOrig = name.toLowerCase();
    // Remove spaces and apostrophes
    const lowerNoSpace = lowerOrig.replace(/[\s']/g, '');
    // Collapse all repeated letters to a single letter (e.g., cuuunnnt -> cunt, ni g g g e r -> niger)
    const lowerCollapsed = lowerNoSpace.replace(/([a-z])\1+/g, '$1');
    // For each banned word, build a regex that matches the word with any number of spaces/apostrophes/double letters between each letter
    for (const word of bannedWords) {
      // Escape regex special chars in word
      const safeWord = word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Build regex: e.g. n+i+g+g+e+r+
      const pattern = safeWord.split('').map(l => `${l}+[\s']*`).join('');
      const regex = new RegExp(pattern, 'i');
      if (regex.test(lowerNoSpace)) return true;
      if (regex.test(lowerCollapsed)) return true;
      if (regex.test(lowerOrig)) return true;
      // Also check substring match for all three forms
      if (lowerOrig.includes(word)) return true;
      if (lowerNoSpace.includes(word)) return true;
      if (lowerCollapsed.includes(word)) return true;
    }
    return false;
  };
  React.useEffect(() => {
    setSlideIn(false);
    setReveal(false);
    setShowStats(false);
    setSpriteKey(k => k + 1); // force re-render for animation
    setStatVisibilities([false, false, false, false]);
    if (!characters[selected].comingSoon) {
      const slideTimeout = setTimeout(() => setSlideIn(true), 30);
      const revealTimeout = setTimeout(() => setReveal(true), 700);
      const statsTimeout = setTimeout(() => setShowStats(true), 1400);
      let statTimeouts = [];
      statTimeouts.push(setTimeout(() => setStatVisibilities(v => [true, false, false, false]), 1500));
      statTimeouts.push(setTimeout(() => setStatVisibilities(v => [true, true, false, false]), 1700));
      statTimeouts.push(setTimeout(() => setStatVisibilities(v => [true, true, true, false]), 1900));
      statTimeouts.push(setTimeout(() => setStatVisibilities(v => [true, true, true, true]), 2100));
      return () => {
        clearTimeout(slideTimeout);
        clearTimeout(revealTimeout);
        clearTimeout(statsTimeout);
        statTimeouts.forEach(clearTimeout);
      };
    } else {
      setSlideIn(false);
      setReveal(false);
      setShowStats(false);
      setStatVisibilities([false, false, false, false]);
    }
  }, [selected]);
  const char = characters[selected];
  const handleNameChange = (e) => {
    let value = e.target.value.replace(/[^a-zA-Z\s']/g, ''); // Only allow letters, spaces, apostrophes
    if (value.length > 15) value = value.slice(0, 15);
    // Capitalize first letter of each word
    value = value.replace(/\b\w/g, l => l.toUpperCase());
    setName(value);
    if (/\d/.test(e.target.value)) {
      setLocalError('No numbers allowed in name.');
    } else if (e.target.value.length > 15) {
      setLocalError('Name must be 15 characters or less.');
    } else if (/[^a-zA-Z\s']/.test(e.target.value)) {
      setLocalError('Only letters, spaces, and apostrophes allowed.');
    } else if (isBannedWord(value)) {
      setLocalError('Inappropriate name.');
    } else {
      setLocalError('');
    }
  };
  return (
    <ResponsiveGameContainer>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1456, height: 816, backgroundImage: 'url(./Assets/None.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      {/* Character Name List */}
      <div style={{ position: 'absolute', left: 64, top: 120, display: 'flex', flexDirection: 'column', gap: 0, zIndex: 2 }}>
        {characters.map((c, i) => (
          <div
            key={c.name + i}
            onClick={() => {
              setSelected(i);
              setNameEntry(false);
              setLockedType(null);
            }}
            tabIndex={0}
            style={{
              color: c.comingSoon ? '#888' : '#fff',
              fontWeight: selected === i ? 900 : 400,
              fontSize: 24,
              letterSpacing: 2,
              cursor: c.comingSoon ? 'not-allowed' : 'pointer',
              textShadow: selected === i ? '0 2px 16px #222' : 'none',
              opacity: c.comingSoon ? 0.5 : 1,
              transition: 'all 0.2s',
              outline: 'none',
              userSelect: 'none',
              background: selected === i ? '#333' : 'none',
              borderBottom: '1px solid #aaa',
              padding: '8px 0',
              width: 220,
              textAlign: 'center',
              marginBottom: 0,
              position: 'relative',
            }}
          >
            {c.comingSoon ? 'Coming Soon!' : c.name}
            {lockedType === i && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#fff', fontWeight: 900, fontSize: 24, pointerEvents: 'none' }}>&#10003;</span>}
          </div>
        ))}
      </div>
      {/* Sprite and Stats Area */}
      {!char.comingSoon && (
        <div
          key={spriteKey}
          style={{
            position: 'absolute',
            left: slideIn ? 728 : 1456,
            top: char.name === 'Gnome' ? 612 : 408,
            transform: char.name === 'Gnome' ? 'translate(-50%, -50%) scale(0.5)' : 'translate(-50%, -50%)',
            opacity: slideIn ? 1 : 0,
            transition: 'left 0.7s cubic-bezier(.77,0,.18,1), opacity 0.7s cubic-bezier(.77,0,.18,1)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <img
            src={char.img}
            alt={char.name}
            style={{
              filter: reveal ? 'brightness(1) contrast(1)' : 'brightness(0.05) contrast(2)',
              transition: 'filter 0.7s cubic-bezier(.77,0,.18,1)',
              display: 'block',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
            }}
          />
        </div>
      )}
      {/* Stats Slide-in (always in same place/size) */}
      {!char.comingSoon && showStats && (
        <div style={{
          position: 'absolute',
          left: 400,
          top: 540,
          color: '#fff',
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: 1,
          textShadow: '0 2px 12px #111, 0 0px 32px #4caf50cc',
          margin: 0,
          zIndex: 3,
          minWidth: 260,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          pointerEvents: 'none',
        }}>
          <div style={{
            marginBottom: 6,
            transform: statVisibilities[0] ? 'translateX(0)' : 'translateX(-600px)',
            opacity: statVisibilities[0] ? 1 : 0,
            transition: 'transform 0.5s cubic-bezier(.77,0,.18,1), opacity 0.5s',
          }}>Health: {getHealthFromVIT(char.stats?.vit || 0)}</div>
          <div style={{
            marginBottom: 6,
            transform: statVisibilities[1] ? 'translateX(0)' : 'translateX(-600px)',
            opacity: statVisibilities[1] ? 1 : 0,
            transition: 'transform 0.5s cubic-bezier(.77,0,.18,1), opacity 0.5s',
          }}>Attack: {getPhysicalAttackFromSTR(char.stats?.str || 0)}</div>
          <div style={{
            marginBottom: 6,
            transform: statVisibilities[2] ? 'translateX(0)' : 'translateX(-600px)',
            opacity: statVisibilities[2] ? 1 : 0,
            transition: 'transform 0.5s cubic-bezier(.77,0,.18,1), opacity 0.5s',
          }}>Defense: {getDefenseFromVIT(char.stats?.vit || 0)}</div>
          <div style={{
            marginTop: 8,
            transform: statVisibilities[3] ? 'translateX(0)' : 'translateX(-600px)',
            opacity: statVisibilities[3] ? 1 : 0,
            transition: 'transform 0.5s cubic-bezier(.77,0,.18,1), opacity 0.5s',
          }}>
            VIT: {char.stats?.vit || 0}, STR: {char.stats?.str || 0}, INT: {char.stats?.int || 0}, DEX: {char.stats?.dex || 0}, MND: {char.stats?.mnd || 0}, SPD: {char.stats?.spd || 0}
          </div>
        </div>
      )}
      {/* Select button and name entry, always in front */}
      {!char.comingSoon && !nameEntry && (
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 32, zIndex: 10 }}>
          <button
            onClick={() => { setNameEntry(true); setLockedType(selected); }}
            style={{
              ...combatButtonStyle,
              fontSize: 16,
              zIndex: 11,
              borderRadius: 2,
              width: 200,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              textAlign: 'center',
              background: '#333',
              color: '#fff',
              border: '2px solid #fff',
              cursor: 'pointer',
              opacity: 1,
            }}
          >
            <span style={{ width: '100%', textAlign: 'center', display: 'block' }}>Select</span>
          </button>
        </div>
      )}
      {nameEntry && lockedType !== null && (
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 32, zIndex: 10 }}>
          {/* Input field container (unchanged) */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', zIndex: 11 }}>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Enter name..."
              style={{ padding: 14, borderRadius: 2, border: '2px solid #fff', fontSize: 16, background: '#222', color: '#fff', width: 220 }}
              maxLength={15}
            />
          </div>
          {/* OK button + error container, identical to input container, to the right */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', zIndex: 11, marginLeft: 12 }}>
            <button
              type="submit"
              style={{
                ...combatButtonStyle,
                background: '#333',
                zIndex: 11,
                borderRadius: 2,
                width: 120,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                textAlign: 'center',
              }}
              onClick={e => {
                e.preventDefault();
                if (!name.trim()) {
                  setLocalError('Please enter a name.');
                  return;
                }
                if (/\d/.test(name)) {
                  setLocalError('No numbers allowed in name.');
                  return;
                }
                if (name.length > 15) {
                  setLocalError('Name must be 15 characters or less.');
                  return;
                }
                if (/[^a-zA-Z\s']/.test(name)) {
                  setLocalError('Only letters, spaces, and apostrophes allowed.');
                  return;
                }
                if (isBannedWord(name)) {
                  setLocalError('Inappropriate name.');
                  return;
                }
                setLocalError('');
                onSelect({ ...characters[lockedType], name: name.trim(), level: 1, type: characters[lockedType].name });
              }}
            >
              <span style={{ width: '100%', textAlign: 'center', display: 'block' }}>OK</span>
            </button>
            {localError && <div style={{ color: 'salmon', fontWeight: 700, marginLeft: 16 }}>{localError}</div>}
            {!localError && error && <div style={{ color: 'salmon', fontWeight: 700, marginLeft: 16 }}>{error}</div>}
          </div>
        </div>
      )}
    </ResponsiveGameContainer>
  );
}

// 4. CharacterServerSelectScreen with exact in-game UI layout and logic
function CharacterServerSelectScreen({ characters, onCreateCharacter, onSelectCharacter, selectedCharacter, servers, selectedServer, onSelectServer, lockedCharacter, setLockedCharacter, lockedServer, setLockedServer, deletePrompt, setDeletePrompt, onDeleteCharacter, connectionError, setConnectionError, onJoinServer }) {
  const [charBtnHover, setCharBtnHover] = React.useState(false);
  const [createBtnHover, setCreateBtnHover] = React.useState(false);
  const [joinBtnHover, setJoinBtnHover] = React.useState(false);
  const [hostBtnHover, setHostBtnHover] = React.useState(false);
  const [dungeon, setDungeon] = React.useState(null);
  // Button logic: Select Character locks in, Host starts game
  return (
    <ResponsiveGameContainer>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1456, height: 816, backgroundImage: 'url(./Assets/None.png)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
      <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        {/* Character Section */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 32 }}>
          <div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginBottom: 4, textAlign: 'left', letterSpacing: 1 }}>Select Your Character:</div>
            <div style={{ ...combatMenuStyle, minHeight: 180, minWidth: 340, maxWidth: 340, maxHeight: 340, overflowY: 'auto', marginBottom: 0, padding: 0, borderRadius: 2, background: 'rgba(34,34,34,0.95)', border: '2px solid #fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const c = characters[i];
                  const isSelected = selectedCharacter === i;
                  const isLocked = lockedCharacter === i;
                  return (
                    <div
                      key={i}
                      onClick={() => c && !c.comingSoon && onSelectCharacter(i)}
                      style={{
                        background: isSelected ? '#333' : 'none',
                        borderBottom: '1px solid #aaa',
                        color: c ? (c.comingSoon ? '#888' : '#fff') : '#888',
                        fontWeight: isSelected ? 900 : 400,
                        fontSize: 20,
                        cursor: c && !c.comingSoon ? 'pointer' : 'default',
                        opacity: c && !c.comingSoon ? 1 : 0.6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        height: 48,
                        userSelect: 'none',
                        position: 'relative',
                        padding: '0 16px',
                        textAlign: 'left',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c ? (
                        c.comingSoon ? (
                          <span style={{ color: '#888', fontStyle: 'italic' }}>Coming Soon!</span>
                        ) : (
                          <AutoShrinkText text={`${c.name ? `${c.name} the ${c.type || c.name}` : ''}, Level:${c.level || 1}`} maxWidth={260} minFontSize={16} maxFontSize={20} />
                        )
                      ) : (
                        <span style={{ color: '#888' }}>Create a character.</span>
                      )}
                      {isLocked && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#4caf50', fontWeight: 900, fontSize: 24, pointerEvents: 'none' }}>&#10003;</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginLeft: 16, justifyContent: 'center', height: '100%', position: 'relative' }}>
            <button
              disabled={lockedCharacter === selectedCharacter || selectedCharacter === null || !characters[selectedCharacter] || characters[selectedCharacter].comingSoon}
              style={{
                ...combatButtonStyle,
                ...(lockedCharacter === selectedCharacter || selectedCharacter === null || !characters[selectedCharacter] || characters[selectedCharacter].comingSoon ? combatButtonDisabled : { background: '#2196f3', color: '#fff', border: '2px solid #2196f3' }),
                borderRadius: 2, width: 260, height: 56, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', margin: 0
              }}
              onMouseEnter={() => setCharBtnHover(true)}
              onMouseLeave={() => setCharBtnHover(false)}
              onClick={() => setLockedCharacter(selectedCharacter)}
            >
              Select Character
            </button>
            <button
              onClick={onCreateCharacter}
              disabled={false}
              style={{
                ...combatButtonStyle,
                ...(createBtnHover ? { background: '#1976d2', color: '#fff', border: '2px solid #1976d2' } : { background: '#2196f3', color: '#fff', border: '2px solid #2196f3' }),
                borderRadius: 2, width: 260, height: 56, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', margin: 0
              }}
              onMouseEnter={() => setCreateBtnHover(true)}
              onMouseLeave={() => setCreateBtnHover(false)}
            >
              Create a Character
            </button>
            <button
              onClick={() => setDeletePrompt(true)}
              disabled={selectedCharacter === null || !characters[selectedCharacter] || characters[selectedCharacter].comingSoon}
              style={{
                ...combatButtonStyle,
                ...(selectedCharacter === null || !characters[selectedCharacter] || characters[selectedCharacter].comingSoon ? combatButtonDisabled : { background: '#d32f2f', color: '#fff', border: '2px solid #d32f2f' }),
                borderRadius: 2, width: 260, height: 56, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', margin: 0
              }}
            >
              Delete Character
            </button>
            {/* Absolutely positioned confirmation prompt */}
            {deletePrompt && (
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                margin: '0 auto',
                top: '100%',
                marginTop: 0,
                width: 260,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
              }}>
                <div style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Are you sure?</div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
                  <button
                    onClick={onDeleteCharacter}
                    style={{ ...combatButtonStyle, background: '#d32f2f', color: '#fff', border: '2px solid #d32f2f', borderRadius: 2, width: 80, height: 36, fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    <span style={{ width: '100%', textAlign: 'center', lineHeight: '36px', display: 'block' }}>Yes</span>
                  </button>
                  <button
                    onClick={() => setDeletePrompt(false)}
                    style={{ ...combatButtonStyle, background: '#333', color: '#fff', border: '2px solid #fff', borderRadius: 2, width: 80, height: 36, fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    <span style={{ width: '100%', textAlign: 'center', lineHeight: '36px', display: 'block' }}>No</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Server Section */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 32, marginTop: 16 }}>
          <div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginBottom: 4, textAlign: 'left', letterSpacing: 1 }}>Select a Server:</div>
            <div style={{ ...combatMenuStyle, minHeight: 120, minWidth: 340, maxWidth: 340, maxHeight: 340, overflowY: 'auto', marginBottom: 0, padding: 0, borderRadius: 2, background: 'rgba(34,34,34,0.95)', border: '2px solid #fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {servers.map((s, i) => {
                  const isSelected = selectedServer === i;
                  const isLocked = lockedServer === i;
                  return (
                    <div
                      key={i}
                      onClick={() => onSelectServer(i)}
                      style={{
                        background: isSelected ? '#333' : 'none',
                        borderBottom: '1px solid #aaa',
                        color: '#fff',
                        fontWeight: isSelected ? 900 : 400,
                        fontSize: 20,
                        cursor: 'pointer',
                        opacity: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        height: 48,
                        userSelect: 'none',
                        padding: '0 16px',
                        textAlign: 'left',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        position: 'relative',
                      }}
                    >
                      <span style={{ textAlign: 'left', width: '100%' }}>{s.name}</span>
                      {isLocked && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#4caf50', fontWeight: 900, fontSize: 24, pointerEvents: 'none' }}>&#10003;</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginLeft: 16, justifyContent: 'center', height: '100%' }}>
            <button
              disabled={lockedServer === selectedServer || selectedServer === null}
              style={{
                ...combatButtonStyle,
                ...(lockedServer === selectedServer || selectedServer === null ? combatButtonDisabled : { background: '#2196f3', color: '#fff', border: '2px solid #2196f3' }),
                borderRadius: 2, width: 260, height: 56, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', margin: 0
              }}
              onClick={() => setLockedServer(selectedServer)}
            >
              Select Server
            </button>
            <button
              disabled={lockedCharacter === null || lockedServer === null}
              style={{
                ...combatButtonStyle,
                ...(lockedCharacter === null || lockedServer === null ? combatButtonDisabled : { background: '#2196f3', color: '#fff', border: '2px solid #2196f3' }),
                borderRadius: 2, width: 260, height: 56, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', margin: 0
              }}
              onClick={onJoinServer}
            >
              Join Server
            </button>
          </div>
        </div>
      </div>
      {connectionError && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto',
        }}>
          <div style={{ background: '#222', border: '2px solid #fff', borderRadius: 4, padding: 32, minWidth: 320, textAlign: 'center', boxShadow: '0 4px 32px #000', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 24 }}>Unable to connect</div>
            <button
              style={{ background: '#2196f3', color: '#fff', border: '2px solid #2196f3', borderRadius: 2, width: 120, height: 40, fontSize: 16, fontWeight: 700, cursor: 'pointer', margin: '0 auto' }}
              onClick={() => setConnectionError(false)}
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </ResponsiveGameContainer>
  );
}

// 0. IntroVideoScreen always plays on app start and on refresh
function IntroVideoScreen({ onFinish }) {
  const [started, setStarted] = React.useState(false);
  const videoRef = React.useRef(null);
  // Fade in/out pulse animation (opacity only)
  const [pulse, setPulse] = React.useState(1);
  React.useEffect(() => {
    let running = true;
    function animate() {
      setPulse(0.5 + 0.5 * Math.sin(Date.now() / 400));
      if (running) requestAnimationFrame(animate);
    }
    animate();
    return () => { running = false; };
  }, []);

  React.useEffect(() => {
    const handleSkip = () => onFinish();
    if (started) {
      window.addEventListener('keydown', handleSkip);
      window.addEventListener('mousedown', handleSkip);
      return () => {
        window.removeEventListener('keydown', handleSkip);
        window.removeEventListener('mousedown', handleSkip);
      };
    }
  }, [onFinish, started]);

  React.useEffect(() => {
    if (started && videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  }, [started]);

  return (
    <div
      style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: !started ? 'pointer' : 'default' }}
      onClick={() => !started && setStarted(true)}
    >
      {!started && (
        <div
          style={{
            color: '#fff',
            fontSize: 48,
            fontWeight: 900,
            letterSpacing: 2,
            textAlign: 'center',
            textShadow: '0 2px 16px #222',
            opacity: pulse,
            transition: 'opacity 0.5s',
            userSelect: 'none',
            zIndex: 2,
          }}
        >
          Click to Play
        </div>
      )}
      {started && (
        <video
          ref={videoRef}
          src="./Assets/Diablo IV Intro 13500.webm"
          autoPlay
          onEnded={onFinish}
          style={{ width: '100vw', height: '100vh', objectFit: 'cover' }}
        />
      )}
      <div style={{ position: 'absolute', right: 40, bottom: 40, color: '#fff', fontSize: 16, background: 'rgba(0,0,0,0.5)', borderRadius: 2, padding: '4px 12px', pointerEvents: 'none' }}>Skip&gt;&gt;</div>
    </div>
  );
}

// 1. LoadingScreen component
function LoadingScreen({ onLoaded }) {
  const [tipIndex, setTipIndex] = React.useState(0);
  const [fade, setFade] = React.useState(true);
  const [logoSquish, setLogoSquish] = React.useState(1);
  const [startTime] = React.useState(Date.now());
  const [loaded, setLoaded] = React.useState(false);
  const tips = React.useMemo(() => [
    './Assets/Tips/Tips-FriendlyNPCs.png',
    './Assets/Tips/Tips-Loot2.png',
    './Assets/Tips/Tips-Loot1.png',
    './Assets/Tips/Tips-Equipping.png',
    './Assets/Tips/Tips-Potions.png',
    './Assets/Tips/Tips-TurnTimer.png',
  ], []);
  React.useEffect(() => {
    tips.forEach(src => { const img = new window.Image(); img.src = src; });
    const logo = new window.Image(); logo.src = './Assets/Logo%20140x140%20Trans.png';
  }, [tips]);
  // Tip rotation: 5s per tip
  React.useEffect(() => {
    if (!loaded) return;
    let timeout;
    if (fade) {
      timeout = setTimeout(() => setFade(false), 400);
    } else {
      timeout = setTimeout(() => {
        setTipIndex(i => (i + 1) % tips.length);
        setFade(true);
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [fade, loaded, tips.length]);
  React.useEffect(() => {
    let running = true;
    function animate() {
      setLogoSquish(1 + 0.08 * Math.sin(Date.now() / 350));
      if (running) requestAnimationFrame(animate);
    }
    animate();
    return () => { running = false; };
  }, []);
  React.useEffect(() => {
    // Simulate loading all game data/assets
    setTimeout(() => setLoaded(true), 1000);
  }, []);
  React.useEffect(() => {
    if (!loaded) return;
    const elapsed = Date.now() - startTime;
    const minTime = 5000; // 5 seconds
    if (elapsed >= minTime) {
      setTimeout(onLoaded, fade ? 400 : 0);
    } else {
      setTimeout(onLoaded, minTime - elapsed + (fade ? 400 : 0));
    }
  }, [loaded, startTime, fade, onLoaded]);
  return (
    <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#111', zIndex: 9999, overflow: 'hidden' }}>
      <img
        src={tips[tipIndex]}
        alt="Tip"
        style={{ position: 'absolute', left: 0, top: 0, width: '100vw', height: '100vh', objectFit: 'cover', opacity: fade ? 0 : 1, transition: 'opacity 0.4s' }}
      />
      <img
        src="./Assets/Logo%20140x140%20Trans.png"
        alt="Logo"
        style={{ position: 'absolute', right: 40, bottom: 40, width: 70, height: 70, transform: `scaleY(${logoSquish})`, transition: 'transform 0.2s' }}
      />
    </div>
  );
}

// 2. Update App to use the new sequence
function App() {
  const [screen, setScreen] = React.useState('intro'); // 'intro', 'login', 'loading', 'characterServerSelect', 'characterCreate', 'game'
  const [user, setUser] = React.useState(null);
  const [characters, setCharacters] = React.useState(Array(5).fill(null));
  const [selectedCharacter, setSelectedCharacter] = React.useState(null);
  const [servers] = React.useState([
    { name: 'Asura' },
    { name: 'Great Lakes' },
    { name: 'Lake Superior' },
    { name: 'San Francisco' },
    { name: 'Oceanic' },
  ]);
  const [selectedServer, setSelectedServer] = React.useState(null);
  const [lockedCharacter, setLockedCharacter] = React.useState(null);
  const [lockedServer, setLockedServer] = React.useState(null);
  const [fadeInLogin, setFadeInLogin] = React.useState(false);
  const [charCreateError, setCharCreateError] = React.useState('');
  const [deletePrompt, setDeletePrompt] = React.useState(false);
  const [notification, setNotification] = React.useState(null);
  const [connectionError, setConnectionError] = React.useState(false);
  const [dungeon, setDungeon] = React.useState(null);

  // Character creation flow
  const handleCreateCharacter = () => setScreen('characterCreate');
  const handleCharacterCreated = async (charData) => {
    setCharCreateError('');
    if (!user || !user.id) {
      setCharCreateError('User not logged in.');
      return;
    }
    // Get the stat block from CharacterTypes.js for the selected type
    const def = getCharacterDefinition(charData.type?.toLowerCase());
    const stats = def?.stats || { vit: 0, str: 0, int: 0, dex: 0, mnd: 0, spd: 0 };
    // Insert character into Supabase
    const { data, error } = await supabase
      .from('characters')
      .insert([
        {
          user_id: user.id,
          name: charData.name,
          type: charData.type,
          level: charData.level || 1,
          vit: stats.vit,
          str: stats.str,
          int: stats.int,
          dex: stats.dex,
          mnd: stats.mnd,
          spd: stats.spd,
          inventory: [] // Add inventory as empty array on creation
        }
      ])
      .select();
    if (error) {
      setCharCreateError('Failed to create character: ' + error.message);
      return;
    }
    const newChar = data && data[0] ? { ...charData, id: data[0].id, ...stats, inventory: [] } : { ...charData, ...stats, inventory: [] };
    const idx = characters.findIndex(c => !c);
    if (idx !== -1) {
      const newChars = [...characters];
      newChars[idx] = newChar;
      setCharacters(newChars);
      setSelectedCharacter(idx);
      // --- Expose supabase and current character ID for BagManager ---
      window.supabase = supabase;
      window.currentCharacterId = newChar.id;
      setScreen('characterServerSelect');
    }
  };
  const handleHostServer = () => setScreen('loading');

  // Load characters from Supabase after login
  React.useEffect(() => {
    async function fetchCharacters() {
      if (user && user.id) {
        const { data, error } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', user.id)
          .order('id', { ascending: true });
        if (!error && data) {
          // Fill up to 5 slots
          const chars = Array(5).fill(null);
          data.slice(0, 5).forEach((c, i) => { chars[i] = c; });
          setCharacters(chars);
        }
      }
    }
    fetchCharacters();
  }, [user]);

  // Character deletion logic
  const handleDeleteCharacter = async () => {
    if (selectedCharacter === null || !characters[selectedCharacter]) return;
    const charToDelete = characters[selectedCharacter];
    if (!charToDelete.id) return;
    // Delete from Supabase
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', charToDelete.id);
    if (!error) {
      const newChars = [...characters];
      newChars[selectedCharacter] = null;
      setCharacters(newChars);
      setSelectedCharacter(null);
      setLockedCharacter(null);
      setDeletePrompt(false);
    } else {
      // Optionally show error
      alert('Failed to delete character: ' + error.message);
    }
  };

  // Start Phaser only when entering the 'game' screen
  React.useEffect(() => {
    if (screen === 'game') {
      if (!dungeon) {
        console.error('[ERROR] Attempted to start game but dungeon is null or undefined:', dungeon);
        return;
      }
      if (!window._phaserGame) {
        console.log('[DEBUG] Starting Phaser with dungeon:', dungeon);
        import('./Game.js').then(({ initGame }) => {
          // Coerce stat fields to numbers before passing to PlayerStats
          const char = characters[lockedCharacter];
          const statBlock = {
            vit: Number(char.vit),
            str: Number(char.str),
            int: Number(char.int),
            dex: Number(char.dex),
            mnd: Number(char.mnd),
            spd: Number(char.spd)
          };
          initGame(
            document.getElementById('renderDiv'),
            dungeon, // Use the real dungeon object from state
            statBlock // Pass the stat block with numbers
          );
        });
      }
    }
  }, [screen, characters, lockedCharacter, dungeon]);

  // Add onJoinServer handler
  const handleJoinServer = async () => {
    if (
      lockedCharacter === null ||
      lockedServer === null ||
      !characters[lockedCharacter] ||
      !characters[lockedCharacter].id
    ) {
      setConnectionError(true);
      return;
    }
    try {
      // Always fetch the selected character from Supabase
      const { data: freshChar, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characters[lockedCharacter].id)
        .single();
      if (fetchError || !freshChar) {
        setConnectionError(true);
        return;
      }

      // Update the local characters array with the freshChar
      const idx = lockedCharacter;
      const newChars = [...characters];
      newChars[idx] = freshChar;
      setCharacters(newChars);

      // Get Supabase session (JWT)
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session || !data.session.access_token) {
        setConnectionError(true);
        return;
      }
      const token = data.session.access_token;
      window.socket = connectSocket(token);

      window.socket.on(EVENTS.PLAYER_JOIN_NOTIFICATION, ({ name }) => {
        setNotification(`${name} is now roaming the dungeon.`);
        setTimeout(() => setNotification(null), 4000);
      });
      window.socket.on(EVENTS.PLAYER_LEAVE_NOTIFICATION, ({ name }) => {
        setNotification(`${name} has left the dungeon.`);
        setTimeout(() => setNotification(null), 4000);
      });

      // Use the freshly fetched character for joinPlayer
      joinPlayer(
        { playerId: freshChar.id, user_id: freshChar.user_id },
        (data) => {
          window.currentCharacter = freshChar;
          setDungeon(data.dungeon);
          if (data.dungeon && data.dungeon.rooms) {
            console.log('Received dungeon from server:', data.dungeon.rooms.map(r => r.id).slice(0, 5));
          }
        },
        (errorMsg) => {
          setConnectionError(true);
        }
      );
    } catch (e) {
      setConnectionError(true);
    }
  };

  // Add a useEffect to transition to loading/game only after dungeon is set
  React.useEffect(() => {
    if (screen === 'characterServerSelect' && dungeon) {
      setScreen('loading');
    }
  }, [screen, dungeon]);

  if (screen === 'intro') {
    return <IntroVideoScreen onFinish={() => {
      setScreen('login');
      setFadeInLogin(true);
    }} />;
  }
  if (screen === 'login') {
    return <>
      <LoginScreen onLogin={loginData => {
        // loginData: { token, playerId, user_id, user }
        setUser(loginData.user);
        setScreen('characterServerSelect');
      }} />
      {fadeInLogin && <FadeInOverlay onDone={() => setFadeInLogin(false)} />}
    </>;
  }
  if (screen === 'loading') {
    return <LoadingScreen onLoaded={() => setScreen('game')} />;
  }
  if (screen === 'characterServerSelect') {
    // --- Expose supabase and current character ID for BagManager when character is selected ---
    if (selectedCharacter !== null && characters[selectedCharacter] && characters[selectedCharacter].id) {
      window.supabase = supabase;
      window.currentCharacterId = characters[selectedCharacter].id;
    }
    return <CharacterServerSelectScreen
      characters={characters}
      onCreateCharacter={handleCreateCharacter}
      onSelectCharacter={setSelectedCharacter}
      selectedCharacter={selectedCharacter}
      servers={servers}
      onHostServer={handleHostServer}
      selectedServer={selectedServer}
      onSelectServer={setSelectedServer}
      lockedCharacter={lockedCharacter}
      setLockedCharacter={setLockedCharacter}
      lockedServer={lockedServer}
      setLockedServer={setLockedServer}
      deletePrompt={deletePrompt}
      setDeletePrompt={setDeletePrompt}
      onDeleteCharacter={handleDeleteCharacter}
      connectionError={connectionError}
      setConnectionError={setConnectionError}
      onJoinServer={handleJoinServer}
    />;
  }
  if (screen === 'characterCreate') {
    return <CharacterSelectScreen onSelect={charData => {
      handleCharacterCreated({ ...charData });
    }} error={charCreateError} />;
  }
  if (screen === 'game') {
    return (
      <div id="renderDiv" style={{ width: '100vw', height: '100vh', position: 'fixed', left: 0, top: 0, background: '#000' }} />
    );
  }
  return (
    <>
      {notification && (
        <div style={{ position: 'fixed', top: 24, right: 24, background: 'rgba(34,34,34,0.95)', color: '#fff', padding: '16px 32px', borderRadius: 12, fontWeight: 900, fontSize: 20, zIndex: 20000, boxShadow: '0 2px 16px #000a' }}>
          {notification}
        </div>
      )}
    </>
  );
}

// FadeInOverlay: fades from black to transparent, then unmounts
function FadeInOverlay({ onDone }) {
  const [opacity, setOpacity] = React.useState(1);
  React.useEffect(() => {
    let raf;
    let start;
    function animate(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const duration = 700;
      const nextOpacity = Math.max(0, 1 - elapsed / duration);
      setOpacity(nextOpacity);
      if (elapsed < duration) {
        raf = requestAnimationFrame(animate);
      } else {
        setOpacity(0);
        if (onDone) onDone();
      }
    }
    raf = requestAnimationFrame(animate);
    return () => raf && cancelAnimationFrame(raf);
  }, [onDone]);
  return <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#000', opacity, pointerEvents: 'none', zIndex: 100000 }} />;
}

// Add this helper component at the top level (after style constants):
function AutoShrinkText({ text, maxWidth, minFontSize = 16, maxFontSize = 20 }) {
  const spanRef = React.useRef(null);
  const [fontSize, setFontSize] = React.useState(maxFontSize);
  React.useEffect(() => {
    if (!spanRef.current) return;
    let size = maxFontSize;
    spanRef.current.style.fontSize = size + 'px';
    while (spanRef.current.scrollWidth > maxWidth && size > minFontSize) {
      size -= 1;
      spanRef.current.style.fontSize = size + 'px';
    }
    setFontSize(size);
  }, [text, maxWidth, minFontSize, maxFontSize]);
  return (
    <span
      ref={spanRef}
      style={{ fontSize, color: '#fff', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'middle' }}
      title={text}
    >
      {text}
    </span>
  );
}

export default App;
