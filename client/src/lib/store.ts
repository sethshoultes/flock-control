import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, set } from 'idb-keyval';
import type { Count } from '@shared/schema';
import { apiRequest } from './queryClient';

interface PendingUpload {
  id: string;
  image: string;
  timestamp: Date;
  retryCount: number;
}

interface CountState {
  counts: Count[];
  pendingUploads: PendingUpload[];
  isOnline: boolean;
  isSyncing: boolean;
}

interface CountStore extends CountState {
  counts: Count[];
  pendingUploads: PendingUpload[];
  isOnline: boolean;
  isSyncing: boolean;
  addCount: (count: Count) => void;
  queueForUpload: (image: string) => void;
  syncPendingUploads: () => Promise<void>;
  setOnline: (status: boolean) => void;
  removePendingUpload: (id: string) => void;
  clearCounts: () => void;
  importCounts: (counts: Count[]) => void;
  updateCount: (id: string | number, updates: Partial<Count>) => void;
  deleteCounts: (ids: (string | number)[]) => void;
}

export const useCountStore = create<CountStore>()(
  persist(
    (set, get) => ({
      counts: [],
      pendingUploads: [],
      isOnline: navigator.onLine,
      isSyncing: false,

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
                const response = await apiRequest('POST', '/api/analyze', {
                  image: upload.image
                });
                const data = await response.json();

                state.addCount(data.count);
                state.removePendingUpload(upload.id);
                return { success: true, count: data.count };
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
          const totalChickens = results.reduce((sum, r) => r.success ? sum + r.count.count : sum, 0);

          if (successCount > 0) {
            console.log(`Synced ${successCount} images, found ${totalChickens} chickens`);
          }
        } finally {
          set({ isSyncing: false });
        }
      },

      setOnline: (status) => {
        set({ isOnline: status });
        if (status) {
          get().syncPendingUploads();
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
            return await get(name);
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

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useCountStore.getState().setOnline(true));
  window.addEventListener('offline', () => useCountStore.getState().setOnline(false));
}