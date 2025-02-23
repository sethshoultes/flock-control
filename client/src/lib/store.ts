import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, set } from 'idb-keyval';
import type { Count } from '@shared/schema';

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
  completeTutorial: () => void;
  resetTutorial: () => void;
  initializeTutorial: () => void;
}

const TUTORIAL_KEY = 'chicken-counter-tutorial-shown';
const STORAGE_KEY = 'chicken-counter-storage';

// Separate non-persisted actions
const createActions = (set: any) => ({
  addCount: (count: Count) => {
    set((state: AppState) => ({
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
    set((state: AppState) => ({
      counts: state.counts.map(count =>
        count.id.toString() === id.toString() ? { ...count, ...updates } : count
      )
    }));
  },

  deleteCounts: (ids: (string | number)[]) => {
    set((state: AppState) => ({
      counts: state.counts.filter(count => !ids.includes(count.id))
    }));
  },

  completeTutorial: () => {
    set({ showTutorial: false });
    localStorage.setItem(TUTORIAL_KEY, 'true');
  },

  resetTutorial: () => {
    set({ showTutorial: true });
    localStorage.setItem(TUTORIAL_KEY, 'false');
  },

  initializeTutorial: () => {
    const hasSeenTutorial = localStorage.getItem(TUTORIAL_KEY) === 'true';
    set({ 
      showTutorial: !hasSeenTutorial,
      tutorialLoading: false 
    });
  }
});

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state (persisted)
      counts: [],
      showTutorial: true,
      tutorialLoading: true,

      // Actions (not persisted)
      ...createActions(set)
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        counts: state.counts,
        showTutorial: state.showTutorial,
        tutorialLoading: state.tutorialLoading
      }),
      storage: {
        getItem: async (name) => {
          try {
            const value = await get(name);
            console.log('Retrieved store data:', { name, found: !!value });
            return value;
          } catch (error) {
            console.error('Failed to load from IndexedDB:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await set(name, value);
            console.log('Saved store data:', { name });
          } catch (error) {
            console.error('Failed to save to IndexedDB:', error);
          }
        },
        removeItem: async (name) => {
          try {
            await set(name, undefined);
            console.log('Removed store data:', { name });
          } catch (error) {
            console.error('Failed to remove from IndexedDB:', error);
          }
        },
      },
    }
  )
);

// Initialize tutorial state
if (typeof window !== 'undefined') {
  useAppStore.getState().initializeTutorial();
}