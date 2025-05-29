import React, { useEffect, useState } from 'react';
import RenameRulesConfig from '../RenameRulesConfig';
import SpiceRulesConfig from '../SpiceRulesConfig';
import styles from './styles.module.css';

const TABS = [
    {id: 'rename', label: 'Umbenennungsregeln', component: <RenameRulesConfig />},
    {id: 'spice', label: 'Gewürzregeln', component: <SpiceRulesConfig />},
];

const Config: React.FC = () => {
    const getInitialTab = () => {
        const tabParam = new URLSearchParams(window.location.search).get('tab');
        return TABS.some(t => t.id === tabParam) ? tabParam! : 'rename';
    }

    const [active, setActive] = useState(getInitialTab);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('tab', active);
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
    }, [active]);

    return (
        <div className={styles.wrapper}>
            <h1>Importer-Konfiguration</h1>

            <div className={styles.tabBar}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`${styles.tabButton} ${active === t.id ? styles.active : ''}`}
                        onClick={() => setActive(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className={styles.tabPanel}>
                {TABS.find(t => t.id === active)!.component}
            </div>
        </div>
    );
};

export default Config;
