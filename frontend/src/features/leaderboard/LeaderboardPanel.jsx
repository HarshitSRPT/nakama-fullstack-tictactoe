import React, { useState, useEffect, useCallback } from 'react';
import { getSession } from '../../api/nakamaClient.js';
import { Client } from '@heroiclabs/nakama-js';
import '../../styles/leaderboard.css';

const LeaderboardPanel = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const session = getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const host = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
      const port = import.meta.env.VITE_NAKAMA_PORT || "7350";
      const ssl = import.meta.env.VITE_NAKAMA_SSL === "true";
      const client = new Client("defaultkey", host, port, ssl);

      const result = await client.rpc(session, "get_global_leaderboard", JSON.stringify({ limit: 20 }));
      const data = typeof result.payload === "string" ? JSON.parse(result.payload) : result.payload;
      
      setRecords(data.records || []);
      setError(null);
    } catch (err) {
      console.error("Leaderboard fetch failed:", err);
      setError("Could not load leaderboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const currentUserId = getSession()?.user_id;

  return (
    <div className="leaderboard-panel">
      <div className="leaderboard-header">
        <h2 className="leaderboard-title">🏆 Global Leaderboard</h2>
        <button 
          id="leaderboard-refresh" 
          className="leaderboard-refresh-btn" 
          onClick={fetchLeaderboard}
          title="Refresh leaderboard"
        >
          ↻
        </button>
      </div>

      {loading && (
        <div className="leaderboard-loading">
          <span className="leaderboard-spinner"></span>
          Loading rankings...
        </div>
      )}

      {error && <div className="leaderboard-error">{error}</div>}

      {!loading && !error && records.length === 0 && (
        <div className="leaderboard-empty">
          <p>No rankings yet</p>
          <p className="leaderboard-empty-sub">Be the first to climb the ladder!</p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="leaderboard-table-wrapper">
          <div className="leaderboard-user-rank">
            Your Rank: {
              currentUserId && records.find(r => r.userId === currentUserId) 
                ? `#${records.find(r => r.userId === currentUserId).rank || (records.findIndex(r => r.userId === currentUserId) + 1)}`
                : "Rank outside top results"
            }
          </div>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>W</th>
                <th>L</th>
                <th>D</th>
                <th>Win%</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => {
                const isMe = record.userId === currentUserId;
                const rankBadge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${record.rank || index + 1}`;
                
                return (
                  <tr 
                    key={record.userId} 
                    className={`leaderboard-row ${isMe ? 'leaderboard-self-row' : ''}`}
                    id={`leaderboard-row-${index}`}
                  >
                    <td className="leaderboard-rank">{rankBadge}</td>
                    <td className="leaderboard-username">
                      {record.username}
                      {isMe && <span className="leaderboard-you-tag">YOU</span>}
                    </td>
                    <td className="leaderboard-stat stat-win">{record.wins}</td>
                    <td className="leaderboard-stat stat-loss">{record.losses}</td>
                    <td className="leaderboard-stat stat-draw">{record.draws}</td>
                    <td className="leaderboard-stat stat-winrate">{record.winRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPanel;
