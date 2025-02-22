import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, set } from 'idb-keyval';
import type { Count } from '@shared/schema';
import { apiRequest } from './queryClient';
import { toast } from '@/hooks/use-toast';

interface PendingUpload {
  id: string;
  image: string;
  timestamp: Date;
  retryCount: number;
}

interface ConnectionState {
  isOnline: boolean;
  isDatabaseConnected: boolean;
  lastError?: string;
  isTestingOffline?: boolean;
}

interface CountState {
  counts: Count[];
  pendingUploads: PendingUpload[];
  connection: ConnectionState;
  isSyncing: boolean;
}

interface CountStore extends CountState {
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
      connection: {
        isOnline: true,
        isDatabaseConnected: true,
      },
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
        const { connection } = get();
        if (!connection.isDatabaseConnected) {
          toast({
            title: "Database Disconnected",
            description: "Your data will be saved locally and synced when the database connection is restored.",
            variant: "destructive"
          });
        }

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
        const { connection } = state;
        if (!connection.isOnline || !connection.isDatabaseConnected || state.pendingUploads.length === 0 || state.isSyncing) {
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
            toast({
              title: "Sync Complete",
              description: `Successfully synced ${successCount} images, found ${totalChickens} chickens`
            });
          }
        } finally {
          set({ isSyncing: false });
        }
      },

      setOnline: async (status) => {
        const state = get();
        console.log('Checking connection status:', status);

        // If we're in test mode and trying to stay offline, don't perform the check
        if (state.connection.isTestingOffline && !status) {
          return;
        }

        if (status) {
          try {
            console.log('Fetching health check...');
            const response = await fetch('/api/health', {
              signal: AbortSignal.timeout(5000)
            });
            const data = await response.json();
            console.log('Health check response:', data);

            const isConnected = response.ok;
            const isDatabaseConnected = data.database === 'connected';

            console.log('Connection state:', { isConnected, isDatabaseConnected, error: data.error });

            set((state) => ({
              connection: {
                ...state.connection,
                isOnline: isConnected,
                isDatabaseConnected,
                lastError: isDatabaseConnected ? undefined : data.error,
                isTestingOffline: false // Clear test mode when connection is restored
              }
            }));

            if (!isConnected) {
              toast({
                title: "Connection Lost",
                description: "You are currently offline. Changes will be saved locally.",
                variant: "destructive"
              });
            } else if (!isDatabaseConnected) {
              toast({
                title: "Database Disconnected",
                description: data.error || "Unable to connect to the database. Your data will be saved locally.",
                variant: "destructive"
              });
            } else {
              const state = get();
              if (state.pendingUploads.length > 0) {
                toast({
                  title: "Connection Restored",
                  description: `Syncing ${state.pendingUploads.length} pending uploads...`
                });
                state.syncPendingUploads();
              }
            }
          } catch (error) {
            console.error('Connection check failed:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
              set((state) => ({
                connection: {
                  ...state.connection,
                  isOnline: false,
                  isDatabaseConnected: false,
                  lastError: 'Network connection failed',
                  isTestingOffline: false
                }
              }));
            } else {
              set((state) => ({
                connection: {
                  ...state.connection,
                  isOnline: true,
                  isDatabaseConnected: false,
                  lastError: error instanceof Error ? error.message : 'Unknown error',
                  isTestingOffline: false
                }
              }));
            }
          }
        } else {
          console.log('Browser reported offline');
          set((state) => ({
            connection: {
              ...state.connection,
              isOnline: false,
              isDatabaseConnected: false,
              isTestingOffline: state.connection.isTestingOffline // Preserve test mode status
            }
          }));
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

if (typeof window !== 'undefined') {
  const checkConnectivity = () => useCountStore.getState().setOnline(navigator.onLine);
  window.addEventListener('online', checkConnectivity);
  window.addEventListener('offline', checkConnectivity);

  checkConnectivity();
}