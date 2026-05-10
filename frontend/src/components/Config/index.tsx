import React, { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import RenameRulesConfig from '../RenameRulesConfig';
import SpiceRulesConfig from '../SpiceRulesConfig';
import styles from './styles.module.css';

interface TabProps {
    onDirtyChange?: (dirty: boolean) => void;
}

interface TabDef {
    id: string;
    label: string;
    Component: React.ComponentType<TabProps>;
}

const TABS: TabDef[] = [
    { id: 'rename', label: 'Umbenennungsregeln', Component: RenameRulesConfig },
    { id: 'spice', label: 'Gewürzregeln', Component: SpiceRulesConfig },
];

const Config: React.FC = () => {
    const getInitialTab = () => {
        const tabParam = new URLSearchParams(window.location.search).get('tab');
        return TABS.some(t => t.id === tabParam) ? tabParam! : 'rename';
    };

    const [active, setActive] = useState(getInitialTab);
    const [isDirty, setIsDirty] = useState(false);
    const [pendingTab, setPendingTab] = useState<string | null>(null);

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('tab', active);
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
    }, [active]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleTabClick = (tabId: string) => {
        if (tabId === active) return;
        if (isDirty) {
            setPendingTab(tabId);
        } else {
            setActive(tabId);
        }
    };

    const isDialogOpen = pendingTab !== null || blocker.state === 'blocked';

    const handleConfirm = () => {
        if (pendingTab !== null) {
            setIsDirty(false);
            setActive(pendingTab);
            setPendingTab(null);
        } else if (blocker.state === 'blocked') {
            setIsDirty(false);
            blocker.proceed();
        }
    };

    const handleCancel = () => {
        if (pendingTab !== null) {
            setPendingTab(null);
        } else if (blocker.state === 'blocked') {
            blocker.reset();
        }
    };

    const ActiveComponent = TABS.find(t => t.id === active)!.Component;

    return (
        <div className={styles.wrapper}>
            <h1>Importer-Konfiguration</h1>

            <div className={styles.tabBar}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`${styles.tabButton} ${active === t.id ? styles.active : ''}`}
                        onClick={() => handleTabClick(t.id)}
                    >
                        {t.label}
                        {active === t.id && isDirty && (
                            <span className={styles.dirtyBadge} data-testid="dirty-indicator" title="Ungespeicherte Änderungen">•</span>
                        )}
                    </button>
                ))}
            </div>

            <div className={styles.tabPanel}>
                <ActiveComponent onDirtyChange={setIsDirty} />
            </div>

            {isDialogOpen && (
                <div className={styles.dialogOverlay}>
                    <div className={styles.dialog}>
                        <p>Du hast ungespeicherte Änderungen. Trotzdem wechseln?</p>
                        <div className={styles.dialogActions}>
                            <button className={styles.dialogCancel} onClick={handleCancel}>Abbrechen</button>
                            <button className={styles.dialogConfirm} onClick={handleConfirm}>Trotzdem wechseln</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Config;
