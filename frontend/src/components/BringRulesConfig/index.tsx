import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api_service';
import FromPillInput from '../FromPillInput';

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
      .then((res) => res.json())
      .then((data) => {
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
    const bring_rules = rules.filter((rule) => rule.from.length > 0 && rule.to);
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
  if (error) return <div className="my-4 text-danger">{error}</div>;

  return (
    <div className="mx-auto my-8 rounded-lg bg-surface p-4 shadow-[0_2px_6px_var(--color-shadow-soft)]">
      <h2>Bring Vereinheitlichungsregeln</h2>
      {rules.map((rule, idx) => (
        <div key={idx} className="mb-4 flex items-start gap-4">
          <div className="flex flex-1 flex-col">
            <label className="mb-1 font-medium">Von</label>
            <FromPillInput value={rule.from} onChange={(from) => updateRule(idx, { ...rule, from })} />
          </div>
          <div className="flex flex-1 flex-col">
            <label className="mb-1 font-medium">Zu</label>
            <input
              type="text"
              className="m-0 h-10 rounded border border-line p-2"
              value={rule.to}
              onChange={(e) => updateRule(idx, { ...rule, to: e.target.value })}
            />
          </div>
          <button
            className="mt-[calc(1.5rem+0.25rem)] h-10 w-10 cursor-pointer self-start rounded border-none bg-danger p-2 text-[1.4rem] text-white hover:bg-danger-strong"
            onClick={() => removeRule(idx)}
          >
            <i className="fa-solid fa-trash-can" />
          </button>
        </div>
      ))}
      <div className="mt-6 flex gap-4">
        <button
          className="cursor-pointer rounded border-none bg-accent px-6 py-3 text-base text-white transition-colors hover:bg-accent-dark"
          onClick={addRule}
        >
          Regel hinzufügen
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

export default BringRulesConfig;
