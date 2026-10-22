import { useEffect, useState } from 'react';

export const fieldClass = 'w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm';
export function NumberField({ label, value, min, max, onChange, unit = 'cm', disabled=false }: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void | boolean; unit?: string;disabled?:boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <label className="block text-xs text-slate-300">{label} {unit && <span className="text-slate-500">({unit})</span>}
    <input className={fieldClass + ' mt-1 disabled:opacity-50'} disabled={disabled} type="number" min={min} max={max} step={1} value={draft}
      onChange={e => { setDraft(e.target.value); const n=e.target.valueAsNumber; if (Number.isFinite(n) && n>=min && n<=max && onChange(n)===false) setDraft(String(value)); }}
      onBlur={() => { const n=draft.trim() ? Number(draft) : value; const next=Number.isFinite(n) ? Math.max(min,Math.min(max,n)) : value; setDraft(String(next)); if(onChange(next)===false)setDraft(String(value)); }} />
  </label>;
}
export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />{label}</label>;
}
