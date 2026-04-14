import React, { useState } from 'react';
import { MatchProvider } from './context/MatchContext.jsx';
import GameScreen from './screens/GameScreen.jsx';
import './styles/board.css';

function App() {
  const [layout, setLayout] = useState("modern"); // layout = "minimal" | "classic" | "modern"

  return (
    <MatchProvider>
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <select value={layout} onChange={(e) => setLayout(e.target.value)} style={{ padding: "5px", borderRadius: "5px", background: "#334155", color: "white", border: "none" }}>
          <option value="minimal">Minimal Layout</option>
          <option value="classic">Classic Layout</option>
          <option value="modern">Modern Layout</option>
        </select>
      </div>
      <GameScreen layoutType={layout} />
    </MatchProvider>
  );
}

export default App;
