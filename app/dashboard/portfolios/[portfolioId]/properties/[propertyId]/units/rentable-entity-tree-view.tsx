'use client';

import { useState } from 'react';
import type { RentableEntityNode } from '@/lib/rentable-entities';
import { RENTABLE_ENTITY_TYPE_LABELS } from '@/lib/rentable-entities';
import { formatRent, subPropertyStatusBadgeClass, subPropertyStatusLabel } from '@/lib/sub-property-types';
import NotesIcon from '@/components/ui/notes-icon';

const TYPE_ICONS: Record<string, string> = {
  PROPERTY: '🏢',
  FLOOR: '🏗️',
  ROOM: '🚪',
  OFFICE: '💼',
  BED: '🛏️',
};

const TYPE_BADGES: Record<string, string> = {
  PROPERTY: 'border-purple-200 bg-purple-50 text-purple-700 font-semibold',
  FLOOR: 'border-blue-200 bg-blue-50 text-blue-700 font-semibold',
  ROOM: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold',
  OFFICE: 'border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold',
  BED: 'border-amber-200 bg-amber-50 text-amber-800 font-semibold',
};

function TreeNode({ node, depth = 0 }: { node: RentableEntityNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col">
      <div
        style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
        className="group flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 py-3.5 pr-4 transition-colors hover:bg-zinc-50/70"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex h-5 w-5 items-center justify-center rounded text-xs text-zinc-600 hover:bg-zinc-200 transition"
            >
              {expanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-5 text-center text-xs text-zinc-300">•</span>
          )}

          <span className="text-lg">{TYPE_ICONS[node.type] || '📌'}</span>

          <span
            className={
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] ' +
              (TYPE_BADGES[node.type] || 'border-zinc-200 bg-zinc-50 text-zinc-700')
            }
          >
            {RENTABLE_ENTITY_TYPE_LABELS[node.type]}
          </span>

          <span className="font-bold text-zinc-900 truncate">{node.name}</span>
          <span className="font-mono text-xs text-zinc-400">({node.code})</span>

          <NotesIcon notes={node.notes} />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Active Lease info if directly leased */}
          {node.activeLease ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-emerald-700 font-medium">
              <span>👤 {node.activeLease.tenantName}</span>
              <span className="text-zinc-300">|</span>
              <span className="font-bold text-zinc-900 font-mono">{formatRent(node.activeLease.monthlyRent)}/mo</span>
            </div>
          ) : (
            <span className="text-zinc-500 font-medium">Direct Rent: <strong className="text-zinc-900 font-mono">{formatRent(node.rentAmount)}</strong></span>
          )}

          {/* Aggregated rent & collection rollups */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs" title="Sum of monthly rent of this unit and all its subunits">
              <span className="text-zinc-500">Rent Rollup:</span>
              <span className="font-bold text-zinc-900 font-mono">{formatRent(node.aggregatedRent)}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1 text-xs" title="Sum of total rent collected across this unit and all its subunits">
              <span className="text-zinc-500">Collection:</span>
              <span className="font-bold text-emerald-700 font-mono">{formatRent(node.aggregatedCollection)}</span>
            </div>
          </div>

          <span
            className={
              'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
              subPropertyStatusBadgeClass(node.status)
            }
          >
            {subPropertyStatusLabel(node.status)}
          </span>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RentableEntityTreeView({ entities }: { entities: RentableEntityNode[] }) {
  if (!entities || entities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-xs">
        <p className="text-sm font-semibold text-zinc-700">No hierarchical rental entities configured yet for this property.</p>
        <p className="mt-1 text-xs text-zinc-500">
          Use &quot;Add Entity / Unit&quot; to define floors, rooms, beds, or whole-building levels.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
      <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-700">
        Property Rental Hierarchy &amp; Recursive Rent Rollups
      </div>
      <div className="divide-y divide-zinc-100">
        {entities.map((node) => (
          <TreeNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
