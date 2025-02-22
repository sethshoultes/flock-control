import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, set } from 'idb-keyval';
import type { Count, InsertCount } from '@shared/schema';

interface CountState {
  counts: Count[];
  pendingUploads: { image: string; timestamp: Date }[];
  isOnline: boolean;
}

interface CountStore extends CountState {
  addCount: (count: Count) => void;
  queueForUpload: (image: string) => void;
  syncPendingUploads: () => Promise<void>;
  setOnline: (status: boolean) => void;
}

// Create the store with persistence
export const useCountStore = create<CountStore>()(
  persist(
    (set, get) => ({
      // Persisted state
      counts: [],
      pendingUploads: [],
      isOnline: navigator.onLine,

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
            { image, timestamp: new Date() }
          ]
        }));
      },

      syncPendingUploads: async () => {
        const state = get();
        if (!state.isOnline || state.pendingUploads.length === 0) return;

        const pendingUploads = [...state.pendingUploads];
        set({ pendingUploads: [] });

        for (const upload of pendingUploads) {
          try {
            const response = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: upload.image })
            });

            if (!response.ok) {
              throw new Error('Failed to upload image');
            }

            const data = await response.json();
            state.addCount(data.count);
          } catch (error) {
            // If upload fails, add back to queue
            set((state) => ({
              pendingUploads: [...state.pendingUploads, upload]
            }));
          }
        }
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
          const { counts, pendingUploads, isOnline } = value;
          await set(name, { counts, pendingUploads, isOnline });
        },
        removeItem: async (name) => {
          await set(name, undefined);
        },
      },
      partialize: (state) => ({
        counts: state.counts,
        pendingUploads: state.pendingUploads,
        isOnline: state.isOnline,
      }),
    }
  )
);

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useCountStore.getState().setOnline(true));
  window.addEventListener('offline', () => useCountStore.getState().setOnline(false));
}