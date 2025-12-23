'use client';

import { useState } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { GAMIFICATION_CONFIG } from '@/config/constants';
import { PointsPanel } from './PointsPanel';
import './Gamification.css';

export function PointsCounter() {
  const [showPanel, setShowPanel] = useState(false);
  const totalPoints = useGamificationStore((state) => state.totalPoints);

  // Don't render if gamification is disabled
  if (!GAMIFICATION_CONFIG.enabled) return null;

  return (
    <div className="points-header-container">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="points-header-button"
        aria-label={`Your points: ${totalPoints}`}
      >
        {/* Star Icon */}
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="points-header-icon">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>

        {/* Count Badge */}
        <span className="points-header-badge">{totalPoints}</span>
      </button>

      {showPanel && (
        <>
          {/* Backdrop */}
          <div
            className="points-backdrop"
            onClick={() => setShowPanel(false)}
          />

          {/* Panel */}
          <div className="points-panel-wrapper">
            <PointsPanel onClose={() => setShowPanel(false)} />
          </div>
        </>
      )}
    </div>
  );
}
