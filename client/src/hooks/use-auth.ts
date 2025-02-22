import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
        set({ isLoading: true, error: null });
        try {
          const res = await apiRequest('POST', '/api/login', { username, password });
          const user = await res.json();
          set({ user, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      register: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiRequest('POST', '/api/register', { username, password });
          const user = await res.json();
          set({ user, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await apiRequest('POST', '/api/logout');
          set({ user: null, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Logout failed';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export function useAuthMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest('POST', '/api/login', credentials);
      return res.json();
    },
    onSuccess: (user) => {
      useAuth.setState({ user });
      queryClient.invalidateQueries({ queryKey: ['/api/counts'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await apiRequest('POST', '/api/register', data);
      return res.json();
    },
    onSuccess: (user) => {
      useAuth.setState({ user });
      queryClient.invalidateQueries({ queryKey: ['/api/counts'] });
      toast({
        title: 'Welcome!',
        description: 'Your account has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      useAuth.setState({ user: null });
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
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