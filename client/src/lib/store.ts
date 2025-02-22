import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, set } from 'idb-keyval';
import type { Count, InsertCount } from '@shared/schema';
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
  addCount: (count: Count) => void;
  queueForUpload: (image: string) => void;
  syncPendingUploads: () => Promise<void>;
  setOnline: (status: boolean) => void;
  removePendingUpload: (id: string) => void;
}

// Create the store with persistence
export const useCountStore = create<CountStore>()(
  persist(
    (set, get) => ({
      // Persisted state
      counts: [],
      pendingUploads: [],
      isOnline: navigator.onLine,
      isSyncing: false,

      // Non-persisted functions
      addCount: (count) => {
        set((state) => ({
          counts: [count, ...state.counts]
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

        for (const upload of [...state.pendingUploads]) {
          try {
            const response = await apiRequest('POST', '/api/analyze', {
              image: upload.image
            });
            const data = await response.json();

            // Add the count and remove from pending
            state.addCount(data.count);
            state.removePendingUpload(upload.id);
          } catch (error) {
            // If upload fails, increment retry count
            set((state) => ({
              pendingUploads: state.pendingUploads.map(pending =>
                pending.id === upload.id
                  ? { ...pending, retryCount: pending.retryCount + 1 }
                  : pending
              )
            }));
          }
        }

        set({ isSyncing: false });
      },

      setOnline: (status) => {
        set({ isOnline: status });
        if (status) {
          // Try to sync when we come back online
          get().syncPendingUploads();
        }
      },
    }),
    {
      name: 'chicken-counter-storage',
      storage: {
        getItem: async (name) => {
          const value = await get(name);
          return value ?? null;
        },
        setItem: async (name, value) => {
          // Only persist the state, not the functions
          const { counts, pendingUploads, isOnline, isSyncing } = value;
          await set(name, { counts, pendingUploads, isOnline, isSyncing });
        },
        removeItem: async (name) => {
          await set(name, undefined);
        },
      },
      partialize: (state) => ({
        counts: state.counts,
        pendingUploads: state.pendingUploads,
        isOnline: state.isOnline,
        isSyncing: state.isSyncing,
      }),
    }
  )
);

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useCountStore.getState().setOnline(true));
  window.addEventListener('offline', () => useCountStore.getState().setOnline(false));
}