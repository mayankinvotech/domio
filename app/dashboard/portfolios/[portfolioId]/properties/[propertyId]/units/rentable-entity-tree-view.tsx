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
  BED: '🛏️',
};

const TYPE_BADGES: Record<string, string> = {
  PROPERTY: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  FLOOR: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  ROOM: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  BED: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

function TreeNode({ node, depth = 0 }: { node: RentableEntityNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col">
      <div
        style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
        className="group flex flex-wrap items-center justify-between gap-3 border-b border-[#1A1A2A] py-3.5 pr-4 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex h-5 w-5 items-center justify-center rounded text-xs text-[#8B6FE8] hover:bg-[#5B4FE8]/20"
            >
              {expanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-5 text-center text-xs text-[#4A4A6A]">•</span>
          )}

          <span className="text-lg">{TYPE_ICONS[node.type] || '📌'}</span>

          <span
            className={
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ' +
              (TYPE_BADGES[node.type] || 'border-gray-500/30 bg-gray-500/10 text-gray-300')
            }
          >
            {RENTABLE_ENTITY_TYPE_LABELS[node.type]}
          </span>

          <span className="font-semibold text-white truncate">{node.name}</span>
          <span className="font-mono text-xs text-[#6A6A8A]">({node.code})</span>

          <NotesIcon notes={node.notes} />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Active Lease info if directly leased */}
          {node.activeLease ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-emerald-300">
              <span>👤 {node.activeLease.tenantName}</span>
              <span className="text-[#6A6A8A]">|</span>
              <span className="font-medium text-white">{formatRent(node.activeLease.monthlyRent)}/mo</span>
            </div>
          ) : (
            <span className="text-[#6A6A8A]">Direct Rent: {formatRent(node.rentAmount)}</span>
          )}

          {/* Aggregated rent & collection rollups */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border border-[#312D58] bg-[#0E0C22] px-2.5 py-1 text-xs" title="Sum of monthly rent of this unit and all its subunits">
              <span className="text-[#B0B0C8]">Rent Rollup:</span>
              <span className="font-semibold text-[#8B6FE8]">{formatRent(node.aggregatedRent)}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-[#0E0C22] px-2.5 py-1 text-xs" title="Sum of total rent collected across this unit and all its subunits">
              <span className="text-[#B0B0C8]">Collection Rollup:</span>
              <span className="font-semibold text-emerald-400">{formatRent(node.aggregatedCollection)}</span>
            </div>
          </div>

          <span
            className={
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' +
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
      <div className="rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-8 text-center">
        <p className="text-sm text-[#B0B0C8]">No hierarchical rental entities configured yet for this property.</p>
        <p className="mt-1 text-xs text-[#6A6A8A]">
          Use &quot;Add Entity / Unit&quot; to define floors, rooms, beds, or whole-building levels.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#312D58] bg-[#17152F] shadow-lg">
      <div className="border-b border-[#312D58] bg-[#0E0C22] px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#8B6FE8]">
        Property Rental Hierarchy &amp; Recursive Rent Rollups
      </div>
      <div className="divide-y divide-[#1A1A2A]">
        {entities.map((node) => (
          <TreeNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
