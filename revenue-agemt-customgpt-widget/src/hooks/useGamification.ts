'use client';

import { useEffect, useCallback } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { GAMIFICATION_CONFIG } from '@/config/constants';

// No-op functions for when gamification is disabled
const noOp = () => {};
const noOpWithArg = (_productUrl?: string) => {};

export function useGamification() {
  const awardPoints = useGamificationStore((state) => state.awardPoints);
  const checkDailyReset = useGamificationStore((state) => state.checkDailyReset);
  const isEnabled = GAMIFICATION_CONFIG.enabled;

  // Check for daily reset on mount and every minute (only if enabled)
  useEffect(() => {
    if (!isEnabled) return;

    checkDailyReset();
    const interval = setInterval(checkDailyReset, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkDailyReset, isEnabled]);

  // Return no-op functions if gamification is disabled
  if (!isEnabled) {
    return {
      awardPointsForQuestion: noOp,
      awardPointsForProductSave: noOpWithArg,
      awardPointsForVoiceSession: noOp,
      awardPointsForTTSSession: noOp,
      isGamificationEnabled: false,
    };
  }

  return {
    awardPointsForQuestion: () => awardPoints('question'),
    awardPointsForProductSave: (productUrl?: string) => awardPoints('product_save', productUrl),
    awardPointsForVoiceSession: () => awardPoints('voice_session'),
    awardPointsForTTSSession: () => awardPoints('tts_session'),
    isGamificationEnabled: true,
  };
}
