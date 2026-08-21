'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'dark' | 'light';

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'domio-theme';

export function ThemeProvider({
  initialTheme = 'dark',
  children,
}: {
  initialTheme?: Theme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  // Once the user explicitly toggles, an in-flight mount fetch must not clobber
  // their choice (avoids a late GET reverting the theme).
  const userChanged = useRef(false);

  // Reflect the theme onto <html data-theme="…"> so the CSS overrides apply.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // On mount, reconcile with the saved preference (localStorage first for an
  // instant read, then the DB which is authoritative across devices). Skips if
  // the user has already toggled this session.
  useEffect(() => {
    let cancelled = false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!userChanged.current && (stored === 'light' || stored === 'dark')) {
        setThemeState(stored);
      }
    } catch {
      /* ignore */
    }
    fetch('/api/user/theme')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (
          !cancelled &&
          !userChanged.current &&
          (data?.theme === 'light' || data?.theme === 'dark')
        ) {
          setThemeState(data.theme);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = (t: Theme) => {
    userChanged.current = true;
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    fetch('/api/user/theme', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {});
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
