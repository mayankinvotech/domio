'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Inline-editable "Floor / Section" row inside the Unit Info card. Saves the
// existing `floor` field via a floor-only PATCH to /api/sub-properties/[id].
export default function UnitFloorEditor({
  unitId,
  floor,
}: {
  unitId: string;
  floor: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(floor ?? '');
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    const res = await fetch(`/api/sub-properties/${unitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ floor: value }),
    });
    if (res.ok) {
      setEditing(false);
      router.refresh();
    }
    setPending(false);
  }

  if (editing) {
    return (
      <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
        <span className="text-[#6A6A8A]">Floor / Section</span>
        <span className="flex items-center gap-1.5">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
            placeholder="e.g. Ground"
            data-testid="floor-input"
            className="w-28 rounded-md border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-2 py-1 text-sm text-white outline-none focus:border-[#5B4FE8]"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending}
            data-testid="floor-save"
            className="rounded-md bg-[#5B4FE8] px-2 py-1 text-xs font-medium text-white hover:bg-[#4A3FD0] disabled:opacity-60"
          >
            {pending ? '…' : 'Save'}
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span className="text-[#6A6A8A]">Floor / Section</span>
      <span className="flex items-center gap-2">
        <span className={floor ? 'text-white' : 'text-[#4A4A6A]'}>
          {floor || '—'}
        </span>
        <button
          type="button"
          onClick={() => {
            setValue(floor ?? '');
            setEditing(true);
          }}
          data-testid="floor-edit"
          className="text-xs font-medium text-[#8B6FE8] transition-colors hover:text-white"
        >
          Edit
        </button>
      </span>
    </div>
  );
}
