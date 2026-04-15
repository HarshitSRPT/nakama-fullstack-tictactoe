import React, { useState, useEffect, useRef } from 'react';
import '../../styles/timer.css';

const TURN_DURATION = 15; // must match server TURN_TIMEOUT_SECONDS

const TimerCountdown = ({ isMyTurn, turnKey, gameOver }) => {
  const [remaining, setRemaining] = useState(TURN_DURATION);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    // Reset timer when turnKey changes (new turn)
    setRemaining(TURN_DURATION);
    startTimeRef.current = Date.now();

    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (gameOver) return;

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const left = Math.max(0, TURN_DURATION - elapsed);
      setRemaining(left);

      if (left <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [turnKey, gameOver]);

  const seconds = Math.ceil(remaining);
  const fraction = remaining / TURN_DURATION;
  
  // Color transitions: green → yellow → red
  let colorClass = 'timer-green';
  if (remaining <= 5) colorClass = 'timer-red';
  else if (remaining <= 10) colorClass = 'timer-yellow';

  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference * (1 - fraction);

  return (
    <div className={`timer-countdown ${colorClass} ${remaining <= 5 && !gameOver ? 'timer-pulse' : ''}`} id="timer-countdown">
      <svg className="timer-ring" width="120" height="120" viewBox="0 0 120 120">
        <circle
          className="timer-ring-bg"
          cx="60" cy="60" r="52"
          fill="none"
          strokeWidth="6"
        />
        <circle
          className="timer-ring-progress"
          cx="60" cy="60" r="52"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="timer-text">
        <span className="timer-seconds">{gameOver ? '—' : seconds}</span>
        <span className="timer-label">{isMyTurn ? 'YOUR TURN' : "OPP'S TURN"}</span>
      </div>
    </div>
  );
};

export default TimerCountdown;
