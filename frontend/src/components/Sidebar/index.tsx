import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle';

const linkClass = 'block py-2 text-[1.1rem] text-fg no-underline hover:text-accent-dark';
// Reset the global `li` card styling (App.css) for the nav items.
const navItemClass = 'm-0 border-none bg-transparent p-0 shadow-none';
const authButtonClass = 'rounded-md bg-accent px-5 py-2.5 text-on-accent hover:bg-accent-dark';

const Sidebar: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking the sidebar itself or the toggle button
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Add event listener when sidebar is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={toggleButtonRef}
        className="no-print fixed top-5 left-5 z-[1001] box-border flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-accent p-0 text-2xl text-white shadow-[0_2px_5px_var(--color-shadow-strong)]"
        onClick={toggleSidebar}
      >
        <i className={`fa-solid fa-${isOpen ? 'xmark' : 'bars'}`} />
      </button>

      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 z-[1000] h-screen w-[250px] bg-surface shadow-[2px_0_5px_var(--color-shadow-soft)] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        <div className="h-full overflow-y-auto px-5 pt-20 pb-5">
          <nav>
            <ul className="m-0 list-none p-0">
              <li className={navItemClass}>
                <Link
                  to="/"
                  className={linkClass}
                  onClick={() => {
                    if (window.location.pathname === '/') window.location.reload();
                    setIsOpen(false);
                  }}
                >
                  Home
                </Link>
              </li>
              {isAuthenticated && (
                <>
                  <li className={navItemClass}>
                    <Link to="/next-up" className={linkClass} onClick={() => setIsOpen(false)}>
                      Next Up
                    </Link>
                  </li>
                  <li className={navItemClass}>
                    <Link to="/collections" className={linkClass} onClick={() => setIsOpen(false)}>
                      Sammlungen
                    </Link>
                  </li>
                  <li className={navItemClass}>
                    <Link to="/new-recipe" className={linkClass} onClick={() => setIsOpen(false)}>
                      Rezept hinzufügen
                    </Link>
                  </li>
                  <li className={navItemClass}>
                    <Link to="/import-recipe" className={linkClass} onClick={() => setIsOpen(false)}>
                      Importiere Rezept
                    </Link>
                  </li>
                  <li className={navItemClass}>
                    <Link to="/config" className={linkClass} onClick={() => setIsOpen(false)}>
                      Einstellungen
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>

        {/* Auth button + version pinned to the bottom of the fixed sidebar (as on main). */}
        {isAuthenticated ? (
          <button
            className={`absolute bottom-5 left-1/2 w-4/5 -translate-x-1/2 ${authButtonClass}`}
            onClick={async () => {
              await logout();
              setIsOpen(false);
            }}
          >
            Logout
          </button>
        ) : (
          <Link to="/login" className="absolute bottom-5 left-1/2 w-4/5 -translate-x-1/2" onClick={() => setIsOpen(false)}>
            <button className={`w-full ${authButtonClass}`}>Login</button>
          </Link>
        )}

        <div className="absolute right-0 bottom-1 left-0 truncate px-4 text-center text-[0.75rem] text-fg-subtle">
          {import.meta.env.VITE_COMMIT_URL ? (
            <a
              href={import.meta.env.VITE_COMMIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-inherit no-underline hover:underline"
            >
              {import.meta.env.VITE_VERSION ?? 'dev'}
            </a>
          ) : (
            (import.meta.env.VITE_VERSION ?? 'dev')
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
