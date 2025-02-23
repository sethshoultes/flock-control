import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { InsertUser } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface AuthState {
  user: { id: number; username: string } | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthStore extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        console.log('Attempting login...', { username });
        set({ isLoading: true, error: null });
        try {
          const res = await apiRequest('POST', '/api/login', { username, password });
          const user = await res.json();
          console.log('Login successful:', user);
          set({ user, isLoading: false });
        } catch (error) {
          console.error('Login failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      register: async (username: string, password: string) => {
        console.log('Attempting registration...', { username });
        set({ isLoading: true, error: null });
        try {
          const res = await apiRequest('POST', '/api/register', { username, password });
          const user = await res.json();
          console.log('Registration successful:', user);
          set({ user, isLoading: false });
        } catch (error) {
          console.error('Registration failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      logout: async () => {
        console.log('Attempting logout...');
        set({ isLoading: true, error: null });
        try {
          await apiRequest('POST', '/api/logout');
          console.log('Logout successful');
          set({ user: null, isLoading: false });
        } catch (error) {
          console.error('Logout failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Logout failed';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user 
      }),
      storage: {
        getItem: (name) => {
          try {
            const item = localStorage.getItem(name);
            console.log('Retrieved auth storage:', { name, value: item ? 'Found' : 'Not found' });
            return item ? JSON.parse(item) : null;
          } catch (error) {
            console.error('Failed to load auth from storage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
            console.log('Saved auth to storage:', { name });
          } catch (error) {
            console.error('Failed to save auth to storage:', error);
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
            console.log('Removed auth from storage:', { name });
          } catch (error) {
            console.error('Failed to remove auth from storage:', error);
          }
        },
      },
    }
  )
);

export function useAuthMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      console.log('Login mutation started:', { username: credentials.username });
      const res = await apiRequest('POST', '/api/login', credentials);
      return res.json();
    },
    onSuccess: (user) => {
      console.log('Login mutation successful:', user);
      useAuth.setState({ user });
      // Invalidate and refetch all user data after successful login
      queryClient.invalidateQueries({ queryKey: ['/api/counts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${user.username}`,
      });
    },
    onError: (error: Error) => {
      console.error('Login mutation failed:', error);
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      console.log('Register mutation started:', { username: data.username });
      const res = await apiRequest('POST', '/api/register', data);
      return res.json();
    },
    onSuccess: (user) => {
      console.log('Register mutation successful:', user);
      useAuth.setState({ user });
      // Initialize new user data
      queryClient.invalidateQueries({ queryKey: ['/api/counts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: 'Welcome!',
        description: 'Your account has been created successfully.',
      });
    },
    onError: (error: Error) => {
      console.error('Register mutation failed:', error);
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('Logout mutation started');
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      console.log('Logout mutation successful');
      useAuth.setState({ user: null });
      // Clear all queries from the cache on logout
      queryClient.clear();
      toast({
        title: 'Goodbye!',
        description: 'You have been logged out successfully.',
      });
    },
    onError: (error: Error) => {
      console.error('Logout mutation failed:', error);
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    loginMutation,
    registerMutation,
    logoutMutation,
  };
}