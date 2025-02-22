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
  setOnline: (status: boolean) => Promise<void>;
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
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds timeout for health checks

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Count state
      counts: [],
      pendingUploads: [],
      isOnline: navigator.onLine,
      isSyncing: false,

      // Tutorial state
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

        console.log(`Starting sync of ${state.pendingUploads.length} pending uploads`);
        set({ isSyncing: true });

        try {
          const results = await Promise.all(
            state.pendingUploads.map(async (upload) => {
              try {
                console.log(`Attempting to sync upload ${upload.id}`);
                const response = await apiRequest('POST', '/api/analyze', { image: upload.image });
                const data = await response.json();

                if (data.count) {
                  state.addCount(data.count);
                  state.removePendingUpload(upload.id);
                  console.log(`Successfully synced upload ${upload.id}`);
                  return { success: true, count: data.count };
                }

                console.warn(`No count data received for upload ${upload.id}`);
                return { success: false, error: new Error('No count data received') };
              } catch (error) {
                console.error(`Upload error for ${upload.id}:`, error);
                // Only increment retry count if it's a network error
                if (error instanceof Error && error.message.includes('network')) {
                  set((state) => ({
                    pendingUploads: state.pendingUploads.map(pending =>
                      pending.id === upload.id
                        ? { ...pending, retryCount: pending.retryCount + 1 }
                        : pending
                    )
                  }));
                }
                return { success: false, error };
              }
            })
          );

          const successCount = results.filter(r => r.success).length;
          const failCount = results.length - successCount;

          console.log(`Sync completed: ${successCount} succeeded, ${failCount} failed`);

          if (successCount > 0) {
            const totalChickens = results.reduce((sum, r) => {
              if (r.success && r.count) {
                return sum + r.count.count;
              }
              return sum;
            }, 0);
            console.log(`Synced ${successCount} images, found ${totalChickens} chickens`);
          }
        } catch (error) {
          console.error('Error during sync:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      setOnline: async (status: boolean) => {
        if (status) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

            try {
              const response = await fetch('/api/health', {
                signal: controller.signal
              });
              clearTimeout(timeoutId);

              const isConnected = response.ok;
              console.log(`Health check completed. Connected: ${isConnected}`);
              set({ isOnline: isConnected });

              if (isConnected) {
                get().syncPendingUploads();
              }
            } catch (error) {
              console.warn('Health check failed:', error);
              set({ isOnline: false });
            }
          } catch (error) {
            console.error('Connection check failed:', error);
            set({ isOnline: false });
          }
        } else {
          console.log('Setting offline mode');
          set({ isOnline: false });
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
            console.log('Retrieved from storage:', { name, value: value !== null ? 'Found' : 'Not found' });
            return value;
          } catch (error) {
            console.error('Failed to load from IndexedDB:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await set(name, value);
            console.log('Saved to storage:', { name, valueExists: value !== null });
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

  // Initial connectivity check and tutorial state
  checkConnectivity();
  useAppStore.getState().initializeTutorial();
}