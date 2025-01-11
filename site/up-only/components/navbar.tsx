'use client';

import { Github } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from 'next-themes';

const Navbar = () => {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="text-xl font-bold">UpOnly</div>
          <div className="flex gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                window.open('https://github.com/coding4kicks/up-only', '_blank')
              }
            >
              <Github className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <span className="h-5 w-5">🌞</span>
              ) : (
                <span className="h-5 w-5">🌙</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
