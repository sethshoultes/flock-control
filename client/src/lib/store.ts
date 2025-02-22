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

const TUTORIAL_KEY = 'chicken-counter-tutorial-shown';
const STORAGE_KEY = 'chicken-counter-storage';

// Create the store with proper initialization
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      counts: [],
      pendingUploads: [],
      isOnline: true,
      isSyncing: false,
      showTutorial: true,
      tutorialLoading: false,

      // Initialize tutorial state
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

      // Count actions
      addCount: (count) => {
        set((state) => ({
          counts: [count, ...state.counts]
        }));
      },

      queueForUpload: (image) => {
        console.log('Queueing image for upload (offline mode)');
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
                console.error('Upload error:', error);
                return { success: false, error };
              }
            })
          );

          const successCount = results.filter(r => r.success).length;
          console.log(`Sync completed: ${successCount} succeeded`);
        } catch (error) {
          console.error('Error during sync:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      // Online/Offline management
      setOnline: (status) => {
        console.log('Setting online status:', status);
        set({ isOnline: status });
        if (status) {
          get().syncPendingUploads();
        }
      },

      removePendingUpload: (id) => {
        set((state) => ({
          pendingUploads: state.pendingUploads.filter(upload => upload.id !== id)
        }));
      },

      clearCounts: () => {
        set({ counts: [], pendingUploads: [] });
      },

      importCounts: (counts) => {
        set({ counts });
      },

      updateCount: (id, updates) => {
        set((state) => ({
          counts: state.counts.map(count =>
            count.id.toString() === id.toString() ? { ...count, ...updates } : count
          )
        }));
      },

      deleteCounts: (ids) => {
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
          // First update IndexedDB
          await set(TUTORIAL_KEY, false);
          // Then update the store state
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

// Initialize app state
if (typeof window !== 'undefined') {
  // Set up online/offline listeners
  window.addEventListener('online', () => useAppStore.getState().setOnline(true));
  window.addEventListener('offline', () => useAppStore.getState().setOnline(false));

  // Initial state setup
  useAppStore.getState().setOnline(navigator.onLine);
  useAppStore.getState().initializeTutorial();
}