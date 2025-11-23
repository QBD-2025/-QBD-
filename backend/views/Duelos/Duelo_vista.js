import React from "react";
import DuelNotification from "./DuelNotification";
import DuelTimer from "./DuelTimer";
import "./duel.css";

export default function DuelView() {
  const retosPendientes = 3; // Esto vendría del backend (ejemplo)
  const dueloInicio = "2025-09-28T15:00:00"; // Fecha inicio (ejemplo)

  return (
    <div className="duel-view">
      <h2>⚔️ Duelos Asíncronos</h2>
      
      <DuelNotification pendingCount={retosPendientes} />

      <div className="duel-list">
        <h3>Reto activo</h3>
        <DuelTimer startTime={dueloInicio} />
      </div>
    </div>
  );
}
