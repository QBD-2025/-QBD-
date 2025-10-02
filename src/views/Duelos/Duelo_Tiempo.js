import React, { useEffect, useState } from "react";
import "./duel.css";

export default function DuelTimer({ startTime }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const deadline = new Date(startTime).getTime() + 72 * 60 * 60 * 1000;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="duel-timer">
      ⏳ Tiempo restante: {timeLeft > 0 ? formatTime(timeLeft) : "Expirado"}
    </div>
  );
}
