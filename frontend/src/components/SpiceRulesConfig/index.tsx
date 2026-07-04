import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/apiService';
import ErrorSection from '../ErrorSection';

interface SpiceAliasRule {
  alias: string;
  spices: string[];
}

interface SpiceRules {
  spices: string[];
  spice_map: SpiceAliasRule[];
}

const apiSpiceMapToArray = (map: Record<string, string[]>): SpiceAliasRule[] => {
  return map ? Object.entries(map).map(([alias, spices]) => ({ alias, spices })) : [];
};

const uiSpiceMapToObject = (map: SpiceAliasRule[]): Record<string, string[]> => {
  return Object.fromEntries(map.filter((r) => r.alias.trim()).map(({ alias, spices }) => [alias.trim(), spices]));
};

interface Props {
  onDirtyChange?: (dirty: boolean) => void;
}

const SpiceRulesConfig: React.FC<Props> = ({ onDirtyChange }) => {
  const [rules, setRules] = useState<SpiceRules>({
    spices: [],
    spice_map: [],
  });
  const [savedRules, setSavedRules] = useState<SpiceRules | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [newSpice, setNewSpice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/config-rules')
      .then((res) => res.json())
      .then((data) => {
        const spice_rules = data.spice_rules ?? { spices: [], spice_map: {} };
        const loaded: SpiceRules = {
          spices: spice_rules.spices ?? [],
          spice_map: apiSpiceMapToArray(spice_rules.spice_map),
        };
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

  const upsertAlias = (idx: number, rule: SpiceAliasRule) => {
    const updated = [...rules.spice_map];
    updated[idx] = rule;
    setRules({ ...rules, spice_map: updated });
  };
  const addAlias = () => setRules({ ...rules, spice_map: [...rules.spice_map, { alias: '', spices: [] }] });
  const removeAlias = (idx: number) => setRules({ ...rules, spice_map: rules.spice_map.filter((_, i) => i !== idx) });

  const save = async () => {
    setErrors([]);
    const response = await apiFetch('/api/config-rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spice_rules: {
          spices: rules.spices,
          spice_map: uiSpiceMapToObject(rules.spice_map),
        },
      }),
    });

    if (!response.ok) {
      const json = await response.json();
      setErrors([json.message, ...json.details]);
      return;
    }
    setSavedRules(rules);
  };

  const handleAddSpice = () => {
    if (!newSpice.trim()) return;
    if (rules.spices.includes(newSpice.trim())) return;
    setRules((r) => ({ ...r, spices: [...r.spices, newSpice.trim()].sort() }));
    setNewSpice('');
  };
  const handleRemoveSpice = (idx: number) => setRules((r) => ({ ...r, spices: r.spices.filter((_, i) => i !== idx) }));

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="my-4 text-danger">{error}</div>;

  const errorDetails = errors.slice(1).map((err, i) => {
    if (err && typeof err === 'object' && 'alias' in err && Array.isArray((err as { missing?: unknown }).missing)) {
      const { alias, missing } = err as { alias: string; missing: string[] };
      return (
        <span key={i}>
          <code>{alias}</code>&nbsp;→&nbsp;
          <span>{missing.join(', ')}</span>
        </span>
      );
    }
    if (err && typeof err === 'object') {
      const [alias, list] = Object.entries(err)[0] as [string, string[]];
      return (
        <span key={i}>
          <code>{alias}</code>&nbsp;→&nbsp;
          <span>{list.join(', ')}</span>
        </span>
      );
    }

    return <span key={i}>{String(err)}</span>;
  });

  return (
    <div className="mx-auto my-8 rounded-lg bg-surface p-4 shadow-[0_2px_6px_var(--color-shadow-soft)]">
      <div className="mb-4 text-[2rem] font-semibold text-fg">Gewürz-Konfiguration</div>

      {/* simple spices list */}
      <div className="my-4 text-[1.4rem] font-medium">Gewürze</div>
      <div className="mb-4 mt-2 flex flex-wrap gap-2">
        {rules.spices.map((s, i) => (
          <div
            key={i}
            className="cursor-pointer rounded-2xl border border-line bg-bg-alt px-3 py-[5px] text-[0.9rem] hover:border-danger hover:bg-danger hover:text-white"
            onClick={() => handleRemoveSpice(i)}
          >
            {s}
          </div>
        ))}
      </div>
      <div className="flex gap-2.5">
        <div>
          <input
            type="text"
            className="rounded border border-line p-2"
            value={newSpice}
            onChange={(e) => setNewSpice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSpice();
            }}
            placeholder="Neues Gewürz"
          />
        </div>
        <button
          type="button"
          className="flex h-8 w-8 cursor-pointer self-center justify-center rounded-full border-none"
          onClick={handleAddSpice}
          disabled={!newSpice.trim()}
        >
          <i className="fa-solid fa-plus" />
        </button>
      </div>

      {/* alias-map table */}
      <div className="my-4 text-[1.4rem] font-medium">Alias</div>
      {rules.spice_map.map((r, i) => {
        /* helper: toggle a spice tag on / off */
        const toggleSpice = (spice: string) => {
          const selected = r.spices.includes(spice);
          const newSpices = selected ? r.spices.filter((s) => s !== spice) : [...r.spices, spice];
          upsertAlias(i, { ...r, spices: newSpices });
        };

        return (
          <div key={i} className="mb-4 grid grid-cols-[minmax(180px,280px)_1fr_auto] items-center gap-4 border-b border-line pb-4">
            {/*  left -> the alias input */}
            <div className="flex flex-1 flex-col">
              <input value={r.alias} onChange={(e) => upsertAlias(i, { ...r, alias: e.target.value })} />
            </div>

            {/*  right -> selectable spice tags */}
            <div className="flex flex-1 flex-wrap gap-2">
              {rules.spices.map((sp) => {
                const selected = r.spices.includes(sp);
                return (
                  <span
                    key={sp}
                    className={`cursor-pointer select-none rounded-[14px] border px-2.5 py-1 text-[0.85rem] ${
                      selected
                        ? 'border-accent-dark bg-accent-dark text-white'
                        : 'border-line bg-bg-alt text-fg-muted hover:border-accent-dark hover:bg-accent-soft'
                    }`}
                    onClick={() => toggleSpice(sp)}
                  >
                    {sp}
                  </span>
                );
              })}
            </div>

            {/* delete button stays unchanged */}
            <button
              className="h-10 w-10 cursor-pointer justify-self-end self-center rounded border-none bg-danger p-2 text-[1.4rem] text-white hover:bg-danger-strong"
              onClick={() => removeAlias(i)}
            >
              <i className="fa-solid fa-trash-can" />
            </button>
          </div>
        );
      })}

      {errors.length > 0 && <ErrorSection title={errors[0]} details={errorDetails} />}

      <div className="mt-6 flex gap-4">
        <button
          className="cursor-pointer rounded border-none bg-accent px-6 py-3 text-base text-white transition-colors hover:bg-accent-dark"
          onClick={addAlias}
        >
          Alias hinzufügen
        </button>
        <button
          className="cursor-pointer rounded border-none bg-accent px-6 py-3 text-base text-white transition-colors hover:bg-accent-dark"
          onClick={save}
        >
          Speichern
        </button>
      </div>
    </div>
  );
};

export default SpiceRulesConfig;
