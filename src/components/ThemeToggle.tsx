import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-5 h-5" />;
    }
    return theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />;
  };

  const getTitle = () => {
    if (theme === 'system') return 'System theme (click to switch)';
    return theme === 'dark' ? 'Dark mode (click to switch)' : 'Light mode (click to switch)';
  };

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
      title={getTitle()}
    >
      {getIcon()}
    </button>
  );
}
