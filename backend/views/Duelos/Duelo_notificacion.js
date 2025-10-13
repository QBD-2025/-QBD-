import React from "react";
import "./duel.css";

export default function DuelNotification({ pendingCount }) {
  return (
    <div className="duel-notification">
      <span className="bell">🔔</span>
      {pendingCount > 0 && (
        <span className="badge">{pendingCount}</span>
      )}
    </div>
  );
}
