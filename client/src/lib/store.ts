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
          // Only store guest mode counts (userId === 0)
          if (count.userId === 0) {
            // Ensure we don't duplicate counts
            const existingIndex = state.counts.findIndex(c => c.id === count.id);
            if (existingIndex >= 0) {
              const newCounts = [...state.counts];
              newCounts[existingIndex] = count;
              return { counts: newCounts };
            }
            return { counts: [count, ...state.counts] };
          }
          return state; // No change for authenticated users
        });
      },

      clearCounts: () => {
        set({ counts: [] });
      },

      importCounts: (counts: Count[]) => {
        // Only import guest mode counts
        const guestCounts = counts.filter(count => count.userId === 0);
        set({ counts: guestCounts });
      },

      updateCount: (id: string | number, updates: Partial<Count>) => {
        set((state: AppState) => {
          // Only update guest mode counts
          const count = state.counts.find(c => c.id.toString() === id.toString());
          if (count?.userId === 0) {
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
          // Only delete guest mode counts
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
            if (!value) return null;

            // Validate stored data
            const parsed = JSON.parse(JSON.stringify(value)); // Deep clone to avoid mutations
            if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.counts)) {
                // Ensure only guest counts are loaded
                parsed.counts = parsed.counts.filter((c: any) => c && c.userId === 0);
              }
              return parsed;
            }
            return null;
          } catch (error) {
            console.error('Failed to load from IndexedDB:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            // Only save guest counts
            if (value && typeof value === 'object' && Array.isArray(value.counts)) {
              value.counts = value.counts.filter(count => count.userId === 0);
            }
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