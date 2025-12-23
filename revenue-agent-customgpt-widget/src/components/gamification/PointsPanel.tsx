'use client';

import { useGamificationStore } from '@/stores/gamificationStore';
import './Gamification.css';

interface PointsPanelProps {
  onClose: () => void;
}

export function PointsPanel({ onClose }: PointsPanelProps) {
  const {
    totalPoints,
    currentStreak,
    lastActiveDate,
    today,
  } = useGamificationStore();

  const getStreakIcon = (streak: number) => {
    let count = 0;
    if (streak >= 14) count = 4;
    else if (streak >= 7) count = 3;
    else if (streak >= 3) count = 2;
    else if (streak >= 1) count = 1;

    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <svg key={i} viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ display: 'inline-block' }}>
            <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
          </svg>
        ))}
      </>
    );
  };

  const formatLastActive = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return 'Today';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

    return new Date(dateStr).toLocaleDateString();
  };

  // Calculate today's total points
  const todayTotal = today.questionPoints + today.productSavePoints +
                     today.voiceSessionPoints + today.ttsSessionPoints +
                     today.streakBonusPoints;

  const hasActivity = today.questionCount > 0 || today.productSaveCount > 0 ||
                      today.voiceSessionCount > 0 || today.ttsSessionCount > 0;

  return (
    <div className="points-panel">
      {/* Compact Header */}
      <div className="points-panel-header">
        <div className="points-header-stats">
          <span className="points-total-inline">{totalPoints} pts</span>
          {currentStreak > 0 && (
            <span className="points-streak-inline">
              {getStreakIcon(currentStreak)} {currentStreak}d
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="points-panel-close"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Compact Content */}
      <div className="points-panel-content">
        {/* Today's Summary - Compact Grid */}
        <div className="points-today-grid">
          {today.questionCount > 0 && (
            <div className="points-stat-item">
              <span className="points-stat-label">Questions</span>
              <span className="points-stat-value">{today.questionCount} (+{today.questionPoints})</span>
            </div>
          )}
          {today.productSaveCount > 0 && (
            <div className="points-stat-item">
              <span className="points-stat-label">Saved</span>
              <span className="points-stat-value">{today.productSaveCount} (+{today.productSavePoints})</span>
            </div>
          )}
          {today.voiceSessionCount > 0 && (
            <div className="points-stat-item">
              <span className="points-stat-label">Voice</span>
              <span className="points-stat-value">{today.voiceSessionCount}x (+{today.voiceSessionPoints})</span>
            </div>
          )}
          {today.ttsSessionCount > 0 && (
            <div className="points-stat-item">
              <span className="points-stat-label">TTS</span>
              <span className="points-stat-value">{today.ttsSessionCount}x (+{today.ttsSessionPoints})</span>
            </div>
          )}
          {today.streakBonusAwarded && today.streakBonusPoints > 0 && (
            <div className="points-stat-item">
              <span className="points-stat-label">Streak</span>
              <span className="points-stat-value">+{today.streakBonusPoints}</span>
            </div>
          )}
        </div>

        {/* Today's Total or No Activity */}
        {hasActivity ? (
          <div className="points-today-total">
            Today: +{todayTotal} pts
          </div>
        ) : (
          <div className="points-no-activity">No activity yet today</div>
        )}
      </div>
    </div>
  );
}
