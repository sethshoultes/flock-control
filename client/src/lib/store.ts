import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import type { Count } from '@shared/schema';

interface AppState {
  // Count related state
  counts: Count[];
  showTutorial: boolean;
  tutorialLoading: boolean;

  // Actions
  addCount: (count: Count) => void;
  clearCounts: () => void;
  importCounts: (counts: Count[]) => void;
  updateCount: (id: string | number, updates: Partial<Count>) => void;
  deleteCounts: (ids: (string | number)[]) => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  initializeTutorial: () => void;
}

const TUTORIAL_KEY = 'chicken-counter-tutorial-shown';

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      counts: [],
      showTutorial: true,
      tutorialLoading: true,

      // Actions
      addCount: (count: Count) => {
        set((state: AppState) => {
          // Only update local storage for guest users (userId = 0)
          if (count.userId === 0) {
            return { counts: [count, ...state.counts] };
          }
          // For authenticated users, let TanStack Query handle the cache
          return state;
        });
      },

      clearCounts: () => {
        set({ counts: [] });
      },

      importCounts: (counts: Count[]) => {
        // Only store counts locally for guest users
        const guestCounts = counts.filter(count => count.userId === 0);
        set({ counts: guestCounts });
      },

      updateCount: (id: string | number, updates: Partial<Count>) => {
        set((state: AppState) => {
          // Only update local storage for guest counts
          const count = state.counts.find(c => c.id.toString() === id.toString());
          if (count && count.userId === 0) {
            return {
              counts: state.counts.map(c =>
                c.id.toString() === id.toString() ? { ...c, ...updates } : c
              )
            };
          }
          return state;
        });
      },

      deleteCounts: (ids: (string | number)[]) => {
        set((state: AppState) => {
          // Only delete from local storage for guest counts
          return {
            counts: state.counts.filter(count => 
              count.userId !== 0 || !ids.includes(count.id)
            )
          };
        });
      },

      completeTutorial: () => {
        set({ showTutorial: false });
        try {
          localStorage.setItem(TUTORIAL_KEY, 'true');
        } catch (error) {
          console.error('Failed to save tutorial state:', error);
        }
      },

      resetTutorial: () => {
        set({ showTutorial: true });
        try {
          localStorage.setItem(TUTORIAL_KEY, 'false');
        } catch (error) {
          console.error('Failed to reset tutorial state:', error);
        }
      },

      initializeTutorial: () => {
        try {
          const hasSeenTutorial = localStorage.getItem(TUTORIAL_KEY) === 'true';
          set({ 
            showTutorial: !hasSeenTutorial,
            tutorialLoading: false 
          });
        } catch (error) {
          console.error('Failed to initialize tutorial state:', error);
          set({ 
            showTutorial: true,
            tutorialLoading: false 
          });
        }
      }
    }),
    {
      name: 'chicken-counter-storage',
      partialize: (state) => ({
        counts: state.counts.filter(count => count.userId === 0), // Only persist guest counts
        showTutorial: state.showTutorial
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
            await del(name);
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