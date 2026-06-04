import React, { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import RenameRulesConfig from '../RenameRulesConfig';
import SpiceRulesConfig from '../SpiceRulesConfig';
import BringRulesConfig from '../BringRulesConfig';
import styles from './styles.module.css';

interface TabProps {
  onDirtyChange?: (dirty: boolean) => void;
}

interface TabDef {
  id: string;
  label: string;
  Component: React.ComponentType<TabProps>;
}

interface TabGroup {
  groupLabel: string;
  tabs: TabDef[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    groupLabel: 'Bring',
    tabs: [{ id: 'bring', label: 'Vereinheitlichungsregeln', Component: BringRulesConfig }],
  },
  {
    groupLabel: 'Importer',
    tabs: [
      { id: 'rename', label: 'Umbenennungsregeln', Component: RenameRulesConfig },
      { id: 'spice', label: 'Gewürzregeln', Component: SpiceRulesConfig },
    ],
  },
];

const ALL_TABS = TAB_GROUPS.flatMap((g) => g.tabs);

const Config: React.FC = () => {
  const getInitialTab = () => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    return ALL_TABS.some((t) => t.id === tabParam) ? tabParam! : 'rename';
  };

  const [active, setActive] = useState(getInitialTab);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname);

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

  const ActiveComponent = ALL_TABS.find((t) => t.id === active)!.Component;

  return (
    <div className={styles.wrapper}>
      <h1>Konfiguration</h1>

      <div className={styles.tabBar}>
        {TAB_GROUPS.map((group) => (
          <div key={group.groupLabel} className={styles.tabGroup}>
            <span className={styles.groupLabel}>{group.groupLabel}</span>
            {group.tabs.map((t) => (
              <button
                key={t.id}
                className={`${styles.tabButton} ${active === t.id ? styles.active : ''}`}
                onClick={() => handleTabClick(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.tabPanel}>
        {isDirty && (
          <div className={styles.dirtyBanner} data-testid="dirty-indicator">
            Ungespeicherte Änderungen
          </div>
        )}
        <ActiveComponent onDirtyChange={setIsDirty} />
      </div>

      {isDialogOpen && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <p>Du hast ungespeicherte Änderungen. Trotzdem wechseln?</p>
            <div className={styles.dialogActions}>
              <button className={styles.dialogCancel} onClick={handleCancel}>
                Abbrechen
              </button>
              <button className={styles.dialogConfirm} onClick={handleConfirm}>
                Trotzdem wechseln
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Config;
