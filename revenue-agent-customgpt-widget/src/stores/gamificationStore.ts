import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GamificationData {
  totalPoints: number;
  currentStreak: number;
  lastActiveDate: string;
  savedProductUrls: string[]; // Track products that have been awarded points
  today: {
    date: string;
    questionCount: number;
    questionPoints: number;
    productSaveCount: number;
    productSavePoints: number;
    voiceSessionCount: number;
    voiceSessionPoints: number;
    ttsSessionCount: number;
    ttsSessionPoints: number;
    streakBonusAwarded: boolean;
    streakBonusPoints: number;
  };
  history: Array<{
    date: string;
    action: 'question' | 'product_save' | 'voice_session' | 'tts_session' | 'streak_bonus';
    points: number;
    timestamp: string;
  }>;
}

interface GamificationStore extends GamificationData {
  // Actions
  awardPoints: (action: 'question' | 'product_save' | 'voice_session' | 'tts_session', productUrl?: string) => void;
  checkDailyReset: () => void;
  resetData: () => void; // For testing

  // UI state
  showToast: boolean;
  toastMessage: string;
  toastPoints: number;
  dismissToast: () => void;
}

const DAILY_LIMITS = {
  question: 20,
  product_save: 5,
  voice_session: 3,
  tts_session: 3,
};

const POINT_VALUES = {
  question: 1,
  product_save: 2,
  voice_session: 5,
  tts_session: 5,
};

const getTodayDate = () => new Date().toISOString().split('T')[0];
const getNowTimestamp = () => new Date().toISOString();

const initialState: GamificationData = {
  totalPoints: 0,
  currentStreak: 0,
  lastActiveDate: '',
  savedProductUrls: [],
  today: {
    date: getTodayDate(),
    questionCount: 0,
    questionPoints: 0,
    productSaveCount: 0,
    productSavePoints: 0,
    voiceSessionCount: 0,
    voiceSessionPoints: 0,
    ttsSessionCount: 0,
    ttsSessionPoints: 0,
    streakBonusAwarded: false,
    streakBonusPoints: 0,
  },
  history: [],
};

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      showToast: false,
      toastMessage: '',
      toastPoints: 0,

      // Check if we need to reset daily counters
      checkDailyReset: () => {
        const state = get();
        const today = getTodayDate();

        if (state.today.date !== today) {
          // New day - reset daily counters
          set({
            today: {
              date: today,
              questionCount: 0,
              questionPoints: 0,
              productSaveCount: 0,
              productSavePoints: 0,
              voiceSessionCount: 0,
              voiceSessionPoints: 0,
              ttsSessionCount: 0,
              ttsSessionPoints: 0,
              streakBonusAwarded: false,
              streakBonusPoints: 0,
            },
          });
        }
      },

      // Award points for an action
      awardPoints: (action, productUrl) => {
        const state = get();
        state.checkDailyReset();

        // For product saves, check if this product has already been awarded points
        if (action === 'product_save' && productUrl) {
          if (state.savedProductUrls.includes(productUrl)) {
            // Already awarded points for this product - show message but don't award
            set({
              showToast: true,
              toastMessage: 'Already saved this product',
              toastPoints: 0,
            });
            setTimeout(() => get().dismissToast(), 2000);
            return;
          }
        }

        const today = getTodayDate();
        const countKey = `${action}Count` as keyof typeof state.today;
        const pointsKey = `${action}Points` as keyof typeof state.today;

        // Check daily limit
        const currentCount = state.today[countKey] as number;
        const limit = DAILY_LIMITS[action];

        if (currentCount >= limit) {
          // Daily limit reached - show message but don't award points
          set({
            showToast: true,
            toastMessage: 'Daily limit reached',
            toastPoints: 0,
          });
          setTimeout(() => get().dismissToast(), 2000);
          return;
        }

        // Calculate points
        let pointsToAward = POINT_VALUES[action];

        // Check if we need to award streak bonus (once per day on first action)
        let streakBonus = 0;
        let newStreak = state.currentStreak;

        if (!state.today.streakBonusAwarded) {
          // Calculate streak
          const lastActive = state.lastActiveDate;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayDate = yesterday.toISOString().split('T')[0];

          if (lastActive === yesterdayDate) {
            // Consecutive day - increment streak
            newStreak = state.currentStreak + 1;
          } else if (lastActive === today) {
            // Same day - keep streak
            newStreak = state.currentStreak;
          } else {
            // Streak broken - reset to 1
            newStreak = 1;
          }

          streakBonus = newStreak;
          pointsToAward += streakBonus;
        }

        // Update state
        const newTotalPoints = state.totalPoints + pointsToAward;

        // Add product URL to savedProductUrls if this is a product save
        const updatedProductUrls = action === 'product_save' && productUrl
          ? [...state.savedProductUrls, productUrl]
          : state.savedProductUrls;

        set({
          totalPoints: newTotalPoints,
          currentStreak: newStreak,
          lastActiveDate: today,
          savedProductUrls: updatedProductUrls,
          today: {
            ...state.today,
            [countKey]: (state.today[countKey] as number) + 1,
            [pointsKey]: (state.today[pointsKey] as number) + POINT_VALUES[action],
            streakBonusAwarded: state.today.streakBonusAwarded || streakBonus > 0,
            streakBonusPoints: state.today.streakBonusPoints + streakBonus,
          },
          history: [
            ...state.history,
            {
              date: today,
              action,
              points: pointsToAward,
              timestamp: getNowTimestamp(),
            },
          ].slice(-100), // Keep last 100 entries

          // Show toast
          showToast: true,
          toastMessage: getActionLabel(action),
          toastPoints: pointsToAward,
        });

        // Auto-dismiss toast after 2 seconds
        setTimeout(() => get().dismissToast(), 2000);

        // Check for streak milestones
        if (streakBonus > 0 && [3, 7, 14].includes(newStreak)) {
          setTimeout(() => {
            set({
              showToast: true,
              toastMessage: `${newStreak}-Day Streak!`,
              toastPoints: 0,
            });
            setTimeout(() => get().dismissToast(), 2000);
          }, 2500);
        }
      },

      dismissToast: () => {
        set({ showToast: false, toastMessage: '', toastPoints: 0 });
      },

      resetData: () => {
        set(initialState);
      },
    }),
    {
      name: 'customgpt_gamification',
      partialize: (state) => ({
        totalPoints: state.totalPoints,
        currentStreak: state.currentStreak,
        lastActiveDate: state.lastActiveDate,
        today: state.today,
        history: state.history,
      }),
    }
  )
);

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    question: 'Asked a question',
    product_save: 'Saved product',
    voice_session: 'Used voice mode',
    tts_session: 'Used TTS',
  };
  return labels[action] || 'Action completed';
}

// Expose store to window for non-React components (like speech-manager)
if (typeof window !== 'undefined') {
  (window as any).gamificationStore = useGamificationStore;
}
