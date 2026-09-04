'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { RentableEntityType, SubPropertyStatus } from '@prisma/client';
import type { RentableEntityNode } from '@/lib/rentable-entities';
import { RENTABLE_ENTITY_TYPE_LABELS } from '@/lib/rentable-entities';
import { formatRent, subPropertyStatusBadgeClass, subPropertyStatusLabel } from '@/lib/sub-property-types';
import type { VacantUnit } from '@/components/portfolios/assign-tenant-modal';
import type { SubPropertyListItem } from '@/lib/sub-properties';

const TYPE_ICONS: Record<string, string> = {
  PROPERTY: '🏢',
  FLOOR: '🏗️',
  ROOM: '🚪',
  OFFICE: '💼',
  BED: '🛏️',
};

const TYPE_COLORS: Record<string, { border: string; bg: string; text: string; headerBg: string }> = {
  PROPERTY: {
    border: 'border-purple-300 hover:border-purple-500',
    bg: 'bg-purple-50/50',
    text: 'text-purple-800',
    headerBg: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
  },
  FLOOR: {
    border: 'border-blue-300 hover:border-blue-500',
    bg: 'bg-blue-50/50',
    text: 'text-blue-800',
    headerBg: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white',
  },
  ROOM: {
    border: 'border-emerald-300 hover:border-emerald-500',
    bg: 'bg-emerald-50/50',
    text: 'text-emerald-800',
    headerBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
  },
  OFFICE: {
    border: 'border-indigo-300 hover:border-indigo-500',
    bg: 'bg-indigo-50/50',
    text: 'text-indigo-800',
    headerBg: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
  },
  BED: {
    border: 'border-amber-300 hover:border-amber-500',
    bg: 'bg-amber-50/50',
    text: 'text-amber-800',
    headerBg: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  },
};

export default function InteractiveFlowchart({
  entities = [],
  units = [],
  propertyName = 'Property',
  propertyId = '',
  portfolioId = '',
  onAssignTenant,
}: {
  entities?: RentableEntityNode[];
  units?: SubPropertyListItem[];
  propertyName?: string;
  propertyId?: string;
  portfolioId?: string;
  onAssignTenant?: (unit: VacantUnit) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OCCUPIED' | 'VACANT' | 'MAINTENANCE'>('ALL');
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<RentableEntityNode | null>(null);

  // Pan / drag state
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  // If no rentable entities exist yet but regular units do, synthesize a tree
  const treeRoots = useMemo<RentableEntityNode[]>(() => {
    if (entities && entities.length > 0) return entities;
    if (units && units.length > 0) {
      return [
        {
          id: `prop-${propertyId}`,
          displayId: null,
          propertyId,
          name: propertyName,
          type: 'PROPERTY' as RentableEntityType,
          code: 'ROOT',
          areaSqft: null,
          rentAmount: 0,
          status: 'VACANT',
          notes: null,
          sortOrder: null,
          parentId: null,
          activeLease: null,
          aggregatedRent: units.reduce((s, u) => s + (u.rentAmount || 0), 0),
          aggregatedCollection: 0,
          children: units.map((u): RentableEntityNode => ({
            id: u.id,
            displayId: null,
            propertyId,
            name: u.name,
            type: 'ROOM' as RentableEntityType,
            code: u.unitNumber || '',
            areaSqft: u.areaSqft,
            rentAmount: u.rentAmount || 0,
            status: u.status,
            notes: u.notes,
            sortOrder: null,
            parentId: `prop-${propertyId}`,
            activeLease: u.currentTenantName
              ? {
                  tenancyId: '',
                  tenantName: u.currentTenantName,
                  monthlyRent: u.rentAmount || 0,
                  startDate: new Date(),
                  endDate: new Date(),
                }
              : null,
            aggregatedRent: u.rentAmount || 0,
            aggregatedCollection: 0,
            children: [],
          })),
        },
      ];
    }
    return [];
  }, [entities, units, propertyId, propertyName]);

  const toggleCollapse = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedNodes(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    const allIds = new Set<string>();
    function collect(nodes: RentableEntityNode[]) {
      for (const n of nodes) {
        if (n.children && n.children.length > 0) {
          allIds.add(n.id);
          collect(n.children);
        }
      }
    }
    collect(treeRoots);
    setCollapsedNodes(allIds);
  }, [treeRoots]);

  // Center chart in container initially
  useEffect(() => {
    if (containerRef.current) {
      const el = containerRef.current;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
  }, [treeRoots]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (containerRef.current) {
      setScrollStart({
        left: containerRef.current.scrollLeft,
        top: containerRef.current.scrollTop,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = scrollStart.left - dx;
    containerRef.current.scrollTop = scrollStart.top - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Node matcher for search & status highlighting
  const nodeMatches = useCallback(
    (node: RentableEntityNode): boolean => {
      if (statusFilter !== 'ALL' && node.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          node.name.toLowerCase().includes(q) ||
          node.code.toLowerCase().includes(q) ||
          (node.activeLease?.tenantName.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    },
    [searchQuery, statusFilter]
  );

  if (treeRoots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-xs">
        <span className="text-4xl">📊</span>
        <h3 className="mt-3 text-base font-bold text-zinc-900">No Rental Hierarchy Configured</h3>
        <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">
          Add units, floors, rooms, or beds to this property to explore the interactive flowchart.
        </p>
        {portfolioId && propertyId && (
          <Link
            href={`/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units/new`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-zinc-800"
          >
            + Add First Entity
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden">
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/90 px-4 py-3">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52 sm:w-60">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find node or tenant..."
              className="w-full rounded-full border border-zinc-200 bg-white py-1.5 pl-8 pr-7 text-xs text-zinc-900 shadow-2xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700"
              >
                ×
              </button>
            )}
          </div>

          {/* Status filter pill buttons */}
          <div className="flex items-center rounded-full border border-zinc-200 bg-white p-0.5 shadow-2xs text-[11px] font-semibold">
            {(['ALL', 'OCCUPIED', 'VACANT', 'MAINTENANCE'] as const).map((s) => {
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-2.5 py-1 transition cursor-pointer ${
                    active
                      ? 'bg-zinc-900 text-white shadow-xs font-bold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {s === 'ALL' ? 'All Statuses' : s === 'OCCUPIED' ? '🟢 Occupied' : s === 'VACANT' ? '🟡 Vacant' : '🔴 Maint'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Zoom controls & Expand/Collapse */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-zinc-200 bg-white p-0.5 shadow-2xs text-xs font-semibold text-zinc-600">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
              className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
              title="Zoom Out"
            >
              −
            </button>
            <span className="w-12 text-center font-mono text-[11px] select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(1))))}
              className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ── Flowchart Canvas ──────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative overflow-auto p-8 min-h-[420px] max-h-[620px] select-none bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:20px_20px] bg-zinc-50/40 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="flex justify-center min-w-max pb-12 pt-4"
        >
          <div className="flex flex-col items-center gap-8">
            {treeRoots.map((root) => (
              <FlowNode
                key={root.id}
                node={root}
                portfolioId={portfolioId}
                propertyId={propertyId}
                collapsedNodes={collapsedNodes}
                onToggleCollapse={toggleCollapse}
                onSelectNode={(n) => setSelectedNode(n)}
                onAssignTenant={onAssignTenant}
                selectedNodeId={selectedNode?.id}
                nodeMatches={nodeMatches}
                isRoot
              />
            ))}
          </div>
        </div>

        {/* Canvas instruction badge */}
        <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-2 text-[11px] font-medium text-zinc-400">
          <span>🖐️ Drag canvas to pan</span>
          <span>•</span>
          <span>🖱️ Click node to view details</span>
          <span>•</span>
          <span>[+] / [−] to fold branches</span>
        </div>
      </div>

      {/* ── Node Inspector Modal / Drawer ─────────────────────────────────── */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{TYPE_ICONS[selectedNode.type] || '🏢'}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      {RENTABLE_ENTITY_TYPE_LABELS[selectedNode.type]}
                    </span>
                    <span className="font-mono text-xs text-zinc-400">({selectedNode.code})</span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">{selectedNode.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>

            {/* Content info */}
            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-3">
                <div>
                  <span className="text-zinc-500 font-medium">Direct Rent:</span>
                  <p className="font-mono font-bold text-zinc-900 text-sm">
                    {formatRent(selectedNode.rentAmount)}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium">Total Rollup Rent:</span>
                  <p className="font-mono font-bold text-zinc-900 text-sm">
                    {formatRent(selectedNode.aggregatedRent)}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium">Collections:</span>
                  <p className="font-mono font-bold text-emerald-700 text-sm">
                    {formatRent(selectedNode.aggregatedCollection)}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium">Status:</span>
                  <p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${subPropertyStatusBadgeClass(
                        selectedNode.status
                      )}`}
                    >
                      {subPropertyStatusLabel(selectedNode.status)}
                    </span>
                  </p>
                </div>
              </div>

              {selectedNode.activeLease && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Active Lease
                  </span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-bold text-emerald-950">
                      👤 {selectedNode.activeLease.tenantName}
                    </span>
                    <span className="font-mono font-bold text-emerald-900">
                      {formatRent(selectedNode.activeLease.monthlyRent)}/mo
                    </span>
                  </div>
                </div>
              )}

              {selectedNode.notes && (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Notes
                  </span>
                  <p className="mt-1 text-zinc-700 whitespace-pre-wrap">{selectedNode.notes}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-4">
              {selectedNode.type !== 'BED' && portfolioId && propertyId && (
                <Link
                  href={`/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units/new?parentId=${selectedNode.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <span>+</span> Add Sub-Unit Under This
                </Link>
              )}
              {selectedNode.status !== 'OCCUPIED' && onAssignTenant && selectedNode.children.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onAssignTenant({
                      id: selectedNode.id,
                      name: selectedNode.name,
                      unitNumber: selectedNode.code,
                      rentAmount: selectedNode.rentAmount || selectedNode.aggregatedRent,
                      isRentableEntity: true,
                    });
                    setSelectedNode(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
                >
                  🔑 Assign Tenant
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recursive Flowchart Node Component ──────────────────────────────────────
function FlowNode({
  node,
  portfolioId,
  propertyId,
  collapsedNodes,
  onToggleCollapse,
  onSelectNode,
  onAssignTenant,
  selectedNodeId,
  nodeMatches,
  isRoot = false,
}: {
  node: RentableEntityNode;
  portfolioId: string;
  propertyId: string;
  collapsedNodes: Set<string>;
  onToggleCollapse: (id: string, e?: React.MouseEvent) => void;
  onSelectNode: (node: RentableEntityNode) => void;
  onAssignTenant?: (unit: VacantUnit) => void;
  selectedNodeId?: string;
  nodeMatches: (node: RentableEntityNode) => boolean;
  isRoot?: boolean;
}) {
  const isCollapsed = collapsedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isMatch = nodeMatches(node);

  const colors = TYPE_COLORS[node.type] || TYPE_COLORS.ROOM;
  const isOccupied = node.status === 'OCCUPIED' || !!node.activeLease;
  const allowSubUnit = node.type !== 'BED';

  const subUnitHref = portfolioId && propertyId
    ? `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units/new?parentId=${node.id}`
    : '#';

  return (
    <div className="flex flex-col items-center">
      {/* ── Node Card ────────────────────────────────────────────────────── */}
      <div
        onClick={() => onSelectNode(node)}
        className={`group relative flex flex-col w-56 rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
          colors.border
        } ${isSelected ? 'ring-3 ring-zinc-900 ring-offset-2' : ''} ${
          !isMatch ? 'opacity-40 grayscale-30' : 'opacity-100'
        }`}
      >
        {/* Card Header Bar */}
        <div className={`flex items-center justify-between px-3 py-1.5 rounded-t-2xl text-xs font-semibold ${colors.headerBg}`}>
          <div className="flex items-center gap-1.5 truncate">
            <span>{TYPE_ICONS[node.type] || '🏢'}</span>
            <span className="text-[11px] font-bold tracking-wide uppercase">
              {RENTABLE_ENTITY_TYPE_LABELS[node.type]}
            </span>
          </div>
          {node.code && (
            <span className="font-mono text-[10px] bg-black/20 px-1.5 py-0.2 rounded text-white/90">
              {node.code}
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="p-3">
          <div className="flex items-baseline justify-between gap-1">
            <h4 className="font-bold text-zinc-900 text-sm truncate" title={node.name}>
              {node.name}
            </h4>
            <span
              className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${subPropertyStatusBadgeClass(
                node.status
              )}`}
            >
              {subPropertyStatusLabel(node.status)}
            </span>
          </div>

          {/* Occupied tenant banner */}
          {isOccupied && node.activeLease && (
            <div className="mt-1.5 flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 truncate">
              <span>👤</span>
              <span className="truncate">{node.activeLease.tenantName}</span>
            </div>
          )}

          {/* Metrics row */}
          <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-xl bg-zinc-50/80 p-2 text-[10px]">
            <div>
              <span className="text-zinc-400 font-medium">Direct:</span>
              <p className="font-mono font-bold text-zinc-800">
                {formatRent(node.rentAmount)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-zinc-400 font-medium">Rollup Rent:</span>
              <p className="font-mono font-bold text-zinc-900">
                {formatRent(node.aggregatedRent)}
              </p>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs">
            {allowSubUnit ? (
              <Link
                href={subUnitHref}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-600 hover:text-white hover:scale-110 shadow-2xs"
                title={`Add sub-unit under ${node.name}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </Link>
            ) : (
              <span className="text-[10px] text-zinc-300 font-mono select-none">🛏 terminal</span>
            )}

            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => onToggleCollapse(node.id, e)}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 transition hover:bg-zinc-200"
              >
                <span>{isCollapsed ? '+' : '−'}</span>
                <span>{node.children.length} sub-unit{node.children.length !== 1 ? 's' : ''}</span>
              </button>
            ) : !isOccupied && onAssignTenant ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignTenant({
                    id: node.id,
                    name: node.name,
                    unitNumber: node.code,
                    rentAmount: node.rentAmount || node.aggregatedRent,
                    isRentableEntity: true,
                  });
                }}
                className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs transition hover:bg-emerald-700"
              >
                🔑 Assign
              </button>
            ) : (
              <span className="text-[10px] text-zinc-400 font-mono">Leaf Unit</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Connecting Lines & Children ────────────────────────────────────── */}
      {hasChildren && !isCollapsed && (
        <div className="flex flex-col items-center">
          {/* Vertical stem line coming down from parent card */}
          <div className="h-6 w-0.5 bg-zinc-300" />

          {/* Children container with horizontal crossbar */}
          <div className="flex items-start justify-center gap-6 relative">
            {/* Horizontal connecting crossbar across all children */}
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-0.5 bg-zinc-300"
                style={{
                  left: `calc(${100 / (node.children.length * 2)}%)`,
                  right: `calc(${100 / (node.children.length * 2)}%)`,
                }}
              />
            )}

            {/* Child branches */}
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Vertical line dropping down to child node card */}
                <div className="h-6 w-0.5 bg-zinc-300" />

                <FlowNode
                  node={child}
                  portfolioId={portfolioId}
                  propertyId={propertyId}
                  collapsedNodes={collapsedNodes}
                  onToggleCollapse={onToggleCollapse}
                  onSelectNode={onSelectNode}
                  onAssignTenant={onAssignTenant}
                  selectedNodeId={selectedNodeId}
                  nodeMatches={nodeMatches}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
