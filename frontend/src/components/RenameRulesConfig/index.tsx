import React, { useEffect, useState } from 'react';
import styles from '../Config/styles.module.css';
import { apiFetch } from "../../utils/api_service";

interface RenameRule {
    from: string[];
    to: string;
}

const RenameRulesConfig: React.FC = () => {
    const [rules, setRules] = useState<RenameRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        apiFetch('/api/importer-config')
            .then(res => res.json())
            .then(data => {
                setRules(data.rename_rules);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load config');
                setLoading(false);
            });
    }, []);

    const updateRule = (index: number, updated: RenameRule) => {
        const newRules = [...rules];
        newRules[index] = updated;
        setRules(newRules);
    };

    const addRule = () => {
        setRules([...rules, {from: [], to: ''}]);
    };

    const removeRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    const saveConfig = async () => {
        const rename_rules = rules.filter(rule => rule.from.length > 0 && rule.to);
        const response = await apiFetch('/api/importer-config', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({rename_rules}),
        });

        if (response.ok) {
            setRules(rename_rules);
        } else {
            const json = await response.json();
            setErrors([json.message, ...json.details]);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.container}>
            <h2>Umbenennungsregeln Konfiguration</h2>
            {rules.map((rule, idx) => (
                <div key={idx} className={styles.ruleRow}>
                    <div className={styles.fromGroup}>
                        <label>Von</label>
                        <input
                            type="text"
                            value={rule.from.join(", ")}
                            onChange={e =>
                                updateRule(idx, {
                                    ...rule,
                                    from: e.target.value.split(',').map(s => s.trim()),
                                })
                            }
                        />
                    </div>
                    <div className={styles.toGroup}>
                        <label>Zu</label>
                        <input
                            type="text"
                            value={rule.to}
                            onChange={e => updateRule(idx, {...rule, to: e.target.value})}
                        />
                    </div>
                    <button className={styles.removeButton} onClick={() => removeRule(idx)}>
                        <i className="fa-solid fa-trash-can" />
                    </button>
                </div>
            ))}
            <div className={styles.actions}>
                <button onClick={addRule}>Regel hinzufügen</button>
                <button onClick={saveConfig}>Speichere Konfiguration</button>
            </div>
        </div>
    );
};

export default RenameRulesConfig;
