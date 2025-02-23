import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme: 'light' | 'dark') => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        set({ theme });
      },
      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(newTheme);
          return { theme: newTheme };
        });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme from storage when rehydrating
        if (state) {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(state.theme);
        }
      },
    }
  )
);

// Initialize theme based on system preference if no stored theme
if (typeof window !== 'undefined') {
  const storedTheme = localStorage.getItem('theme-storage');
  if (!storedTheme) {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    useTheme.getState().setTheme(systemTheme);
  }
}