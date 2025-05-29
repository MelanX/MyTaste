import React, { useState } from 'react';
import RenameRulesConfig from '../RenameRulesConfig';
import SpiceRulesConfig from '../SpiceRulesConfig';
import styles from './styles.module.css';

const TABS = [
    {id: 'rename', label: 'Umbenennungsregeln', component: <RenameRulesConfig />},
    {id: 'spice', label: 'Gewürzregeln', component: <SpiceRulesConfig />},
];

const Config: React.FC = () => {
    const [active, setActive] = useState('rename');

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
