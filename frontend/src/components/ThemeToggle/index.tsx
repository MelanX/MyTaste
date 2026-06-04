import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'mytaste-theme';

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light'; // light is the default (MyTaste's cream/orange identity)
}

export const THEME_CHANGE_EVENT = 'mytaste:themechange';

function apply(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

// Apply immediately on module load to avoid a flash of the wrong theme.
apply(readTheme());

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    apply(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const next = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={theme === 'light' ? 'Heller Modus — zu dunkel wechseln' : 'Dunkler Modus — zu hell wechseln'}
      aria-label={`Switch to ${next} mode`}
      className="box-border flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-transparent p-0 text-[1.1rem] text-accent-dark transition-colors hover:bg-bg-alt"
    >
      <i className={theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} />
    </button>
  );
}
