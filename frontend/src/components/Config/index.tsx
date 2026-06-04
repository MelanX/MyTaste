import React, { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import RenameRulesConfig from '../RenameRulesConfig';
import SpiceRulesConfig from '../SpiceRulesConfig';
import BringRulesConfig from '../BringRulesConfig';

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
    <div className="mx-auto max-w-[960px]">
      <h1>Konfiguration</h1>

      <div className="mb-4 flex flex-col gap-[0.35rem]">
        {TAB_GROUPS.map((group) => (
          <div key={group.groupLabel} className="flex flex-wrap items-center gap-2">
            <span className="min-w-[4.5rem] select-none pr-[0.15rem] text-xs font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              {group.groupLabel}
            </span>
            {group.tabs.map((t) => (
              <button
                key={t.id}
                className={`text-[1.2rem] ${
                  active === t.id ? 'bg-success-bright text-white hover:cursor-default hover:bg-success-bright' : ''
                }`}
                onClick={() => handleTabClick(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4">
        {isDirty && (
          <div
            className="mb-4 rounded-md border border-warning bg-warning/15 px-3.5 py-2 text-sm font-medium text-warning-fg"
            data-testid="dirty-indicator"
          >
            Ungespeicherte Änderungen
          </div>
        )}
        <ActiveComponent onDirtyChange={setIsDirty} />
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45">
          <div className="w-[90%] max-w-[420px] rounded-lg bg-surface px-8 py-6 shadow-[0_4px_24px_var(--color-shadow-strong)]">
            <p className="m-0 mb-5 text-base leading-normal">Du hast ungespeicherte Änderungen. Trotzdem wechseln?</p>
            <div className="flex justify-end gap-3">
              <button
                className="cursor-pointer rounded border-none bg-accent px-[1.1rem] py-2 text-[0.95rem] text-white hover:bg-accent-dark"
                onClick={handleCancel}
              >
                Abbrechen
              </button>
              <button
                className="cursor-pointer rounded border-none bg-danger px-[1.1rem] py-2 text-[0.95rem] text-white hover:bg-danger-strong"
                onClick={handleConfirm}
              >
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
