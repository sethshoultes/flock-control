import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, set } from 'idb-keyval';
import type { Count } from '@shared/schema';
import { apiRequest } from './queryClient';

// Unified state interface
interface AppState {
  // Count related state
  counts: Count[];

  // Tutorial state
  showTutorial: boolean;
  tutorialLoading: boolean;

  // Actions
  addCount: (count: Count) => void;
  clearCounts: () => void;
  importCounts: (counts: Count[]) => void;
  updateCount: (id: string | number, updates: Partial<Count>) => void;
  deleteCounts: (ids: (string | number)[]) => void;

  // Tutorial actions
  completeTutorial: () => Promise<void>;
  resetTutorial: () => Promise<void>;
  initializeTutorial: () => Promise<void>;
}

const TUTORIAL_KEY = 'chicken-counter-tutorial-shown';
const STORAGE_KEY = 'chicken-counter-storage';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      counts: [],
      showTutorial: true,
      tutorialLoading: true,

      initializeTutorial: async () => {
        try {
          const hasSeenTutorial = await get(TUTORIAL_KEY);
          set({ 
            showTutorial: !hasSeenTutorial,
            tutorialLoading: false 
          });
        } catch (error) {
          console.error('Failed to initialize tutorial state:', error);
          set({ showTutorial: true, tutorialLoading: false });
        }
      },

      addCount: (count: Count) => {
        set((state) => ({
          counts: [count, ...state.counts]
        }));
      },

      clearCounts: () => {
        set({ counts: [] });
      },

      importCounts: (counts: Count[]) => {
        set({ counts });
      },

      updateCount: (id: string | number, updates: Partial<Count>) => {
        set((state) => ({
          counts: state.counts.map(count =>
            count.id.toString() === id.toString() ? { ...count, ...updates } : count
          )
        }));
      },

      deleteCounts: (ids: (string | number)[]) => {
        set((state) => ({
          counts: state.counts.filter(count => !ids.includes(count.id))
        }));
      },

      completeTutorial: async () => {
        try {
          await set(TUTORIAL_KEY, true);
          set({ showTutorial: false });
        } catch (error) {
          console.error('Failed to save tutorial completion:', error);
        }
      },

      resetTutorial: async () => {
        try {
          await set(TUTORIAL_KEY, false);
          set({ showTutorial: true });
        } catch (error) {
          console.error('Failed to reset tutorial:', error);
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: {
        getItem: async (name) => {
          try {
            const value = await get(name);
            return value;
          } catch (error) {
            console.error('Failed to load from IndexedDB:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await set(name, value);
          } catch (error) {
            console.error('Failed to save to IndexedDB:', error);
          }
        },
        removeItem: async (name) => {
          try {
            await set(name, undefined);
          } catch (error) {
            console.error('Failed to remove from IndexedDB:', error);
          }
        },
      },
    }
  )
);

if (typeof window !== 'undefined') {
  useAppStore.getState().initializeTutorial();
}