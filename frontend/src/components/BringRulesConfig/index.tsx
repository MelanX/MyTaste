import React, { useEffect, useState } from 'react';
import styles from '../Config/styles.module.css';
import { apiFetch } from '../../utils/api_service';

interface BringRule {
    from: string[];
    to: string;
}

interface Props {
    onDirtyChange?: (dirty: boolean) => void;
}

const BringRulesConfig: React.FC<Props> = ({ onDirtyChange }) => {
    const [rules, setRules] = useState<BringRule[]>([]);
    const [savedRules, setSavedRules] = useState<BringRule[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiFetch('/api/config-rules')
            .then(res => res.json())
            .then(data => {
                const loaded = data.bring_rules ?? [];
                setRules(loaded);
                setSavedRules(loaded);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load config');
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (savedRules === null) return;
        onDirtyChange?.(JSON.stringify(rules) !== JSON.stringify(savedRules));
    }, [rules, savedRules, onDirtyChange]);

    const updateRule = (index: number, updated: BringRule) => {
        const newRules = [...rules];
        newRules[index] = updated;
        setRules(newRules);
    };

    const addRule = () => setRules([...rules, { from: [], to: '' }]);

    const removeRule = (index: number) => setRules(rules.filter((_, i) => i !== index));

    const save = async () => {
        const bring_rules = rules.filter(rule => rule.from.length > 0 && rule.to);
        const response = await apiFetch('/api/config-rules', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bring_rules }),
        });

        if (response.ok) {
            setRules(bring_rules);
            setSavedRules(bring_rules);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.container}>
            <h2>Bring Vereinheitlichungsregeln</h2>
            {rules.map((rule, idx) => (
                <div key={idx} className={styles.ruleRow}>
                    <div className={styles.fromGroup}>
                        <label>Von</label>
                        <input
                            type="text"
                            value={rule.from.join(', ')}
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
                            onChange={e => updateRule(idx, { ...rule, to: e.target.value })}
                        />
                    </div>
                    <button className={styles.removeButton} onClick={() => removeRule(idx)}>
                        <i className="fa-solid fa-trash-can" />
                    </button>
                </div>
            ))}
            <div className={styles.actions}>
                <button onClick={addRule}>Regel hinzufügen</button>
                <button onClick={save}>Speichern</button>
            </div>
        </div>
    );
};

export default BringRulesConfig;
