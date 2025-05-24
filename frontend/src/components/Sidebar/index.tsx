import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './styles.module.css';

const Sidebar: React.FC = () => {
    const {isAuthenticated, logout} = useAuth();
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
                className={`${styles.toggleButton} no-print`}
                onClick={toggleSidebar}
            >
                <i className={`fa-solid fa-${isOpen ? 'xmark' : 'bars'}`} />
            </button>

            <div
                ref={sidebarRef}
                className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}
            >
                <div className={styles.sidebarContent}>
                    <nav>
                        <ul>
                            <li>
                                <Link to="/" reloadDocument onClick={() => setIsOpen(false)}>Home</Link>
                            </li>
                            {isAuthenticated && (
                                <>
                                    <li>
                                        <Link to="/new-recipe" onClick={() => setIsOpen(false)}>Rezept hinzufügen</Link>
                                    </li>
                                    <li>
                                        <Link to="/import-recipe" onClick={() => setIsOpen(false)}>Importiere
                                            Rezept</Link>
                                    </li>
                                    <li>
                                        <Link to="/rename-rules"
                                              onClick={() => setIsOpen(false)}>Umbenennungsregeln</Link>
                                    </li>
                                </>
                            )}
                            <li>
                                {isAuthenticated ? (
                                    <button onClick={() => {
                                        logout();
                                        setIsOpen(false);
                                    }}>Logout</button>
                                ) : (
                                    <Link to="/login" onClick={() => setIsOpen(false)}>
                                        <button>Login</button>
                                    </Link>
                                )}
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </>
    );
};

export default Sidebar;