import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        return { theme: newTheme };
      }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Initialize theme from storage on mount
if (typeof window !== 'undefined') {
  const theme = useTheme.getState().theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
