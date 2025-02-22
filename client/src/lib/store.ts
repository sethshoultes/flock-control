import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, set } from 'idb-keyval';
import type { Count } from '@shared/schema';
import { apiRequest } from './queryClient';

// Unified state interface
interface AppState {
  // Count related state
  counts: Count[];
  pendingUploads: PendingUpload[];
  isOnline: boolean;
  isSyncing: boolean;

  // Tutorial state
  showTutorial: boolean;
  tutorialLoading: boolean;

  // Actions
  addCount: (count: Count) => void;
  queueForUpload: (image: string) => void;
  syncPendingUploads: () => Promise<void>;
  setOnline: (status: boolean) => void;
  removePendingUpload: (id: string) => void;
  clearCounts: () => void;
  importCounts: (counts: Count[]) => void;
  updateCount: (id: string | number, updates: Partial<Count>) => void;
  deleteCounts: (ids: (string | number)[]) => void;

  // Tutorial actions
  completeTutorial: () => Promise<void>;
  resetTutorial: () => Promise<void>;
  initializeTutorial: () => Promise<void>;
}

interface PendingUpload {
  id: string;
  image: string;
  timestamp: Date;
  retryCount: number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Count state
      counts: [],
      pendingUploads: [],
      isOnline: true,
      isSyncing: false,

      // Tutorial state
      showTutorial: false,
      tutorialLoading: true,

      // Initialize tutorial state
      initializeTutorial: async () => {
        try {
          const hasSeenTutorial = await get<boolean>('chicken-counter-tutorial-shown');
          set({ 
            showTutorial: !hasSeenTutorial,
            tutorialLoading: false 
          });
        } catch (error) {
          console.error('Failed to initialize tutorial state:', error);
          set({ showTutorial: true, tutorialLoading: false });
        }
      },

      // Complete tutorial
      completeTutorial: async () => {
        try {
          await set('chicken-counter-tutorial-shown', true);
          set({ showTutorial: false });
        } catch (error) {
          console.error('Failed to save tutorial completion:', error);
        }
      },

      // Reset tutorial
      resetTutorial: async () => {
        try {
          await set('chicken-counter-tutorial-shown', false);
          set({ showTutorial: true });
        } catch (error) {
          console.error('Failed to reset tutorial:', error);
        }
      },

      // Count actions
      addCount: (count) => {
        set((state) => ({
          counts: [count, ...state.counts]
        }));
      },

      updateCount: (id, updates) => {
        set((state) => ({
          counts: state.counts.map(count =>
            count.id.toString() === id.toString() ? { ...count, ...updates } : count
          )
        }));
      },

      queueForUpload: (image) => {
        set((state) => ({
          pendingUploads: [
            ...state.pendingUploads,
            {
              id: crypto.randomUUID(),
              image,
              timestamp: new Date(),
              retryCount: 0
            }
          ]
        }));
      },

      removePendingUpload: (id) => {
        set((state) => ({
          pendingUploads: state.pendingUploads.filter(upload => upload.id !== id)
        }));
      },

      syncPendingUploads: async () => {
        const state = get();
        if (!state.isOnline || state.pendingUploads.length === 0 || state.isSyncing) {
          return;
        }

        set({ isSyncing: true });

        try {
          const results = await Promise.all(
            state.pendingUploads.map(async (upload) => {
              try {
                const response = await apiRequest('POST', '/api/analyze', { image: upload.image });
                const data = await response.json();

                if (data.count) {
                  state.addCount(data.count);
                  state.removePendingUpload(upload.id);
                  return { success: true, count: data.count };
                }
                return { success: false, error: new Error('No count data received') };
              } catch (error) {
                set((state) => ({
                  pendingUploads: state.pendingUploads.map(pending =>
                    pending.id === upload.id
                      ? { ...pending, retryCount: pending.retryCount + 1 }
                      : pending
                  )
                }));
                return { success: false, error };
              }
            })
          );

          const successCount = results.filter(r => r.success).length;
          const totalChickens = results.reduce((sum, r) => {
            if (r.success && r.count) {
              return sum + r.count.count;
            }
            return sum;
          }, 0);

          if (successCount > 0) {
            console.log(`Synced ${successCount} images, found ${totalChickens} chickens`);
          }
        } catch (error) {
          console.error('Error during sync:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      setOnline: async (status) => {
        if (status) {
          try {
            const response = await fetch('/api/health');
            const isConnected = response.ok;
            set({ isOnline: isConnected });

            if (isConnected) {
              get().syncPendingUploads();
            }
          } catch (error) {
            console.error('Connection check failed:', error);
            set({ isOnline: false });
          }
        } else {
          set({ isOnline: false });
        }
      },

      clearCounts: () => {
        set({ counts: [], pendingUploads: [] });
      },

      importCounts: (counts) => {
        set({ counts });
      },

      deleteCounts: (ids) => {
        set((state) => ({
          counts: state.counts.filter(count => !ids.includes(count.id))
        }));
      },
    }),
    {
      name: 'chicken-counter-storage',
      storage: {
        getItem: async (name) => {
          try {
            const value = await get(name);
            console.log('Retrieved from storage:', { name, hasValue: value !== undefined });
            return value;
          } catch (error) {
            console.error('Failed to load from IndexedDB:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await set(name, value);
            console.log('Saved to storage:', { name });
          } catch (error) {
            console.error('Failed to save to IndexedDB:', error);
          }
        },
        removeItem: async (name) => {
          try {
            await set(name, undefined);
            console.log('Removed from storage:', { name });
          } catch (error) {
            console.error('Failed to remove from IndexedDB:', error);
          }
        },
      },
    }
  )
);

// Initialize app state
if (typeof window !== 'undefined') {
  // Set up online/offline listeners
  const checkConnectivity = () => useAppStore.getState().setOnline(navigator.onLine);
  window.addEventListener('online', checkConnectivity);
  window.addEventListener('offline', checkConnectivity);

  // Initial connectivity check
  checkConnectivity();

  // Initialize tutorial state
  useAppStore.getState().initializeTutorial();
}