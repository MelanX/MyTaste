import React, { useEffect, useState } from 'react';
import styles from '../Config/styles.module.css';
import { apiFetch } from '../../utils/api_service';
import ErrorSection from "../ErrorSection";

interface SpiceAliasRule {
    alias: string;
    spices: string[];
}

interface SpiceRules {
    spices: string[];
    spice_map: SpiceAliasRule[];
}

const apiSpiceMapToArray = (map: Record<string, string[]>): SpiceAliasRule[] => {
    return map ? Object.entries(map).map(([alias, spices]) => ({alias, spices})) : [];
};

const uiSpiceMapToObject = (map: SpiceAliasRule[]): Record<string, string[]> => {
    return Object.fromEntries(
        map
            .filter(r => r.alias.trim())
            .map(({alias, spices}) => [alias.trim(), spices])
    );
};

const SpiceRulesConfig: React.FC = () => {
    const [rules, setRules] = useState<SpiceRules>({
        spices: [],
        spice_map: [],
    });
    const [errors, setErrors] = useState<string[]>([]);
    const [newSpice, setNewSpice] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiFetch('/api/importer-config')
            .then(res => res.json())
            .then(data => {
                const spice_rules = data.spice_rules ?? {spices: [], spice_map: {}};
                setRules({
                    spices: spice_rules.spices ?? [],
                    spice_map: apiSpiceMapToArray(spice_rules.spice_map),
                })
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load config');
                setLoading(false);
            });
    }, []);

    const upsertAlias = (idx: number, rule: SpiceAliasRule) => {
        const updated = [...rules.spice_map];
        updated[idx] = rule;
        setRules({...rules, spice_map: updated});
    };
    const addAlias = () => setRules({...rules, spice_map: [...rules.spice_map, {alias: '', spices: []}]});
    const removeAlias = (idx: number) =>
        setRules({...rules, spice_map: rules.spice_map.filter((_, i) => i !== idx)});

    const save = async () => {
        setErrors([]);
        const response = await apiFetch('/api/importer-config', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                spice_rules: {
                    spices: rules.spices,
                    spice_map: uiSpiceMapToObject(rules.spice_map),
                }
            }),
        });

        if (!response.ok) {
            const json = await response.json();
            setErrors([json.message, ...json.details]);
            return;
        }
    };

    const handleAddSpice = () => {
        if (!newSpice.trim()) return;
        if (rules.spices.includes(newSpice.trim())) return;
        setRules(r => ({...r, spices: [...r.spices, newSpice.trim()].sort()}));
        setNewSpice('');
    };
    const handleRemoveSpice = (idx: number) =>
        setRules(r => ({...r, spices: r.spices.filter((_, i) => i !== idx)}));


    if (loading) return <div>Loading…</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    const errorDetails = errors.slice(1).map((err, i) => {
        if (err && typeof err === 'object' && 'alias' in err && Array.isArray((err as any).missing)) {
            const {alias, missing} = err as { alias: string; missing: string[] };
            return (
                <span key={i}>
                    <code>{alias}</code>&nbsp;→&nbsp;
                    <span className={styles.missing}>{missing.join(', ')}</span>
                </span>
            );
        }
        if (err && typeof err === 'object') {
            const [alias, list] = Object.entries(err)[0] as [string, string[]];
            return (
                <span key={i}>
                    <code>{alias}</code>&nbsp;→&nbsp;
                    <span className={styles.missing}>{list.join(', ')}</span>
                </span>
            );
        }

        return <span key={i}>{String(err)}</span>;
    });

    return (
        <div className={styles.container}>
            <div className={styles.mainTitle}>Gewürz-Konfiguration</div>

            {/* simple spices list */}
            <div className={styles.secondaryTitle}>Gewürze</div>
            <div className={styles.spicesContainer}>
                {rules.spices.map((s, i) => (
                    <div key={i}
                         className={styles.spiceTag}
                         onClick={() => handleRemoveSpice(i)}>
                        {s}
                    </div>
                ))}
            </div>
            <div className={styles.spiceInputRow}>
                <div className={styles.formGroup}>
                    <input
                        type="text"
                        value={newSpice}
                        onChange={e => setNewSpice(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddSpice(); }}
                        placeholder="Neues Gewürz"
                    />
                </div>
                <button
                    type="button"
                    className={styles.addButton}
                    onClick={handleAddSpice}
                    disabled={!newSpice.trim()}>
                    <i className="fa-solid fa-plus" />
                </button>
            </div>

            {/* alias-map table */}
            <div className={styles.secondaryTitle}>Alias</div>
            {rules.spice_map.map((r, i) => {
                /* helper: toggle a spice tag on / off */
                const toggleSpice = (spice: string) => {
                    const selected = r.spices.includes(spice);
                    const newSpices = selected
                        ? r.spices.filter(s => s !== spice)
                        : [...r.spices, spice];
                    upsertAlias(i, {...r, spices: newSpices});
                };

                return (
                    <div key={i} className={styles.aliasRow}>
                        {/*  left -> the alias input */}
                        <div className={styles.fromGroup}>
                            <input
                                value={r.alias}
                                onChange={e => upsertAlias(i, {...r, alias: e.target.value})}
                            />
                        </div>

                        {/*  right -> selectable spice tags */}
                        <div className={styles.tagsGroup}>
                            {rules.spices.map(sp => {
                                const selected = r.spices.includes(sp);
                                return (
                                    <span
                                        key={sp}
                                        className={`${styles.tag} ${selected ? styles.selected : ''}`}
                                        onClick={() => toggleSpice(sp)}
                                    >
                            {sp}
                        </span>
                                );
                            })}
                        </div>

                        {/* delete button stays unchanged */}
                        <button className={styles.removeButton} onClick={() => removeAlias(i)}>
                            <i className="fa-solid fa-trash-can" />
                        </button>
                    </div>
                );
            })}

            {errors.length > 0 && (
                <ErrorSection title={errors[0]} details={errorDetails} />
            )}

            <div className={styles.actions}>
                <button onClick={addAlias}>Alias hinzufügen</button>
                <button onClick={save}>Speichern</button>
            </div>
        </div>
    );
};

export default SpiceRulesConfig;
