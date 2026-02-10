// components/layout/TopBar.tsx
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import Logo from '@/components/ui/Logo';

type SearchablePerson = {
  id: string;
  name: string;
  location?: string | null;
  treeId: string;
  treeName: string;
};

type TreeOption = {
  id: string;
  name: string;
  is_primary: boolean;
};

type TopBarProps = {
  treeName: string;
  treeId: string;
  peopleCount: number;
  leafCapacity: number;
  userName: string;
  userPhotoUrl: string | null;
  allTrees: TreeOption[];
  treeLimit: number;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onClearAll: () => void;
  onLogOut: () => void;
  onOpenSettings: () => void;
  onShare: () => void;
  onExport: () => void;
  onSwitchTree: (treeId: string) => void;
  onCreateTree: () => void;
  onRenameTree: (newName: string) => void;
  onDeleteTree: () => void;
  onUpgrade: (reason: 'leaf_capacity' | 'multi_tree' | 'premium_feature') => void;
  onTutorial: () => void;
  hasPeople: boolean;
  hasCollapsedBranches: boolean;
  people?: SearchablePerson[];
  onSearchSelect?: (personId: string, treeId: string) => void;
};

export default function TopBar({
  treeName,
  treeId,
  peopleCount,
  leafCapacity,
  userName,
  userPhotoUrl,
  allTrees,
  treeLimit,
  onCollapseAll,
  onExpandAll,
  onClearAll,
  onLogOut,
  onOpenSettings,
  onShare,
  onExport,
  onSwitchTree,
  onCreateTree,
  onRenameTree,
  onDeleteTree,
  onUpgrade,
  onTutorial,
  hasPeople,
  hasCollapsedBranches,
  people = [],
  onSearchSelect,
}: TopBarProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [treeMenuOpen, setTreeMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const toolsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const treeMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Generate signed URL for profile photo
  useEffect(() => {
    if (!userPhotoUrl) {
      setAvatarUrl(null);
      return;
    }
    if (userPhotoUrl.startsWith('data:') || userPhotoUrl.includes('token=')) {
      setAvatarUrl(userPhotoUrl);
      return;
    }

    let storagePath = userPhotoUrl;
    const match = userPhotoUrl.match(/family-photos\/(.+)/);
    if (match) storagePath = match[1];

    supabase.storage
      .from('family-photos')
      .createSignedUrl(storagePath, 3600)
      .then(({ data }) => {
        if (data) setAvatarUrl(data.signedUrl);
      });
  }, [userPhotoUrl]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (treeMenuRef.current && !treeMenuRef.current.contains(e.target as Node)) {
        setTreeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  // Filtered search results — current tree first
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches = people
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 10);
    // Sort: current tree first, then alphabetical
    matches.sort((a, b) => {
      const aIsCurrent = a.treeId === treeId ? 0 : 1;
      const bIsCurrent = b.treeId === treeId ? 0 : 1;
      if (aIsCurrent !== bIsCurrent) return aIsCurrent - bIsCurrent;
      return a.name.localeCompare(b.name);
    });
    return matches;
  }, [searchQuery, people, treeId]);

  const capacityPercent = leafCapacity > 0 ? (peopleCount / leafCapacity) * 100 : 0;
  const capacityWarning = capacityPercent >= 80;
  const capacityDanger = capacityPercent >= 95;
  const atCapacity = peopleCount >= leafCapacity;

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== treeName) {
      onRenameTree(trimmed);
    }
    setRenaming(false);
  };

  const handleNewTree = () => {
    setTreeMenuOpen(false);
    if (allTrees.length >= treeLimit) {
      onUpgrade('multi_tree');
    } else {
      onCreateTree();
    }
  };

  const anyDropdownOpen = toolsOpen || accountOpen || treeMenuOpen || searchOpen;

  return (
    <div className="fc-topbar flex items-center justify-between px-4 py-2.5 sm:px-6">
      {/* Mobile backdrop — visible when any dropdown is open */}
      {anyDropdownOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 sm:hidden"
          onClick={() => {
            setToolsOpen(false);
            setAccountOpen(false);
            setTreeMenuOpen(false);
            setSearchOpen(false);
          }}
        />
      )}
      {/* ─── Left: Logo + Tree selector + Leaf counter ─── */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="hidden text-base font-semibold text-white sm:inline" style={{ fontFamily: 'var(--font-display)' }}>
            FamilyCanvas
          </span>
        </div>

        {/* Divider */}
        <div className="hidden h-5 w-px bg-white/20 sm:block" />

        {/* Tree selector dropdown */}
        <div className="relative" ref={treeMenuRef}>
          {renaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setRenaming(false);
              }}
              className="w-32 rounded border border-emerald-400/50 bg-white/10 px-2 py-0.5 text-sm font-medium text-white outline-none ring-1 ring-emerald-400/50 sm:w-44"
            />
          ) : (
            <button
              onClick={() => {
                setTreeMenuOpen(!treeMenuOpen);
                setToolsOpen(false);
                setAccountOpen(false);
              }}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
            >
              <span className="truncate max-w-[100px] sm:max-w-[180px]">{treeName}</span>
              <svg className="h-3.5 w-3.5 shrink-0 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          )}

          {/* Tree dropdown menu */}
          {treeMenuOpen && (
            <div className="fixed left-2 right-2 top-[52px] z-50 rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-1 sm:w-56 max-h-[70vh] overflow-y-auto">
              {/* Tree list */}
              <div className="px-2 py-1">
                <div className="px-1 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Your trees</div>
                {allTrees.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (t.id !== treeId) onSwitchTree(t.id);
                      setTreeMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      t.id === treeId
                        ? 'bg-emerald-50 text-emerald-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {/* Tree icon */}
                    <svg className={`h-4 w-4 shrink-0 ${t.id === treeId ? 'text-emerald-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                    </svg>
                    <span className="truncate">{t.name}</span>
                    {t.id === treeId && (
                      <svg className="ml-auto h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="my-1 border-t border-gray-100" />

              {/* New tree */}
              <button
                onClick={handleNewTree}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New tree
                {allTrees.length >= treeLimit && (
                  <span className="ml-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">PRO</span>
                )}
              </button>

              {/* Divider */}
              <div className="my-1 border-t border-gray-100" />

              {/* Rename */}
              <button
                onClick={() => {
                  setTreeMenuOpen(false);
                  setRenameValue(treeName);
                  setRenaming(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
                Rename tree
              </button>

              {/* Delete (only if more than 1 tree) */}
              {allTrees.length > 1 && (
                <button
                  onClick={() => {
                    setTreeMenuOpen(false);
                    onDeleteTree();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete tree
                </button>
              )}
            </div>
          )}
        </div>

        {/* Leaf counter (clickable when at/near capacity) */}
        <button
          onClick={() => {
            if (atCapacity) onUpgrade('leaf_capacity');
          }}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
            capacityDanger
              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 cursor-pointer'
              : capacityWarning
              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer'
              : 'bg-white/10 text-white/70 cursor-default'
          }`}
          title={atCapacity ? 'Upgrade to add more people' : `${peopleCount} of ${leafCapacity} leaves used`}
        >
          <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          {peopleCount} / {leafCapacity}
          {atCapacity && (
            <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          )}
        </button>
      </div>

      {/* ─── Center: Search ─── */}
      <div className="relative" ref={searchRef}>
        {/* Mobile: search icon button */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="rounded-md p-1.5 text-white/70 hover:bg-white/10 sm:hidden"
          title="Search all trees"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>

        {/* Desktop: always-visible search input */}
        <div className="relative hidden sm:block">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search all trees..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim()) setSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchQuery('');
                setSearchOpen(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-48 rounded-lg border border-white/15 bg-white/10 py-1.5 pl-8 pr-3 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-emerald-400/50 focus:bg-white/15 focus:ring-1 focus:ring-emerald-400/30 lg:w-64"
          />
        </div>

        {/* Mobile: expandable search panel — fixed position below topbar */}
        {searchOpen && (
          <div className="fixed left-3 right-3 top-[52px] z-50 rounded-lg border border-gray-200 bg-white shadow-lg sm:hidden">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search all trees..."
                value={searchQuery}
                autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }
                }}
                className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-3 pr-3 text-sm text-gray-700 outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
              />
            </div>
            {searchQuery.trim() && (
              <div className="border-t border-gray-100 py-1">
                {searchResults.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400">No results</div>
                ) : (
                  searchResults.map((person) => (
                    <button
                      key={`${person.treeId}-${person.id}`}
                      onClick={() => {
                        if (onSearchSelect) onSearchSelect(person.id, person.treeId);
                        setSearchQuery('');
                        setSearchOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-gray-700">{person.name}</div>
                        <div className="flex items-center gap-1.5">
                          {person.location && (
                            <span className="truncate text-xs text-gray-400">{person.location}</span>
                          )}
                          {person.location && person.treeId !== treeId && (
                            <span className="text-xs text-gray-300">·</span>
                          )}
                          {person.treeId !== treeId && (
                            <span className="shrink-0 text-xs text-emerald-600">{person.treeName}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Desktop: search results dropdown */}
        {searchOpen && searchQuery.trim() && (
          <div className="absolute left-0 top-full z-50 mt-1 hidden w-full min-w-[220px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:block">
            {searchResults.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">No results</div>
            ) : (
              searchResults.map((person) => (
                <button
                  key={`${person.treeId}-${person.id}`}
                  onClick={() => {
                    if (onSearchSelect) onSearchSelect(person.id, person.treeId);
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-700">{person.name}</div>
                    <div className="flex items-center gap-1.5">
                      {person.location && (
                        <span className="truncate text-xs text-gray-400">{person.location}</span>
                      )}
                      {person.location && person.treeId !== treeId && (
                        <span className="text-xs text-gray-300">·</span>
                      )}
                      {person.treeId !== treeId && (
                        <span className="shrink-0 text-xs text-emerald-600">{person.treeName}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ─── Right: Tools menu + Account dropdown ─── */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Tools menu (...) */}
        <div className="relative" ref={toolsRef}>
          <button
            onClick={() => {
              setToolsOpen(!toolsOpen);
              setAccountOpen(false);
              setTreeMenuOpen(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
            title="Tools"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </button>

          {toolsOpen && (
            <div className="fixed left-2 right-2 top-[52px] z-50 rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-48 max-h-[70vh] overflow-y-auto">
              <button
                onClick={() => {
                  onCollapseAll();
                  setToolsOpen(false);
                }}
                disabled={!hasPeople}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                </svg>
                Collapse all
              </button>
              <button
                onClick={() => {
                  onExpandAll();
                  setToolsOpen(false);
                }}
                disabled={!hasCollapsedBranches}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                Expand all
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button
                onClick={() => {
                  onClearAll();
                  setToolsOpen(false);
                }}
                disabled={!hasPeople}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Clear all people
              </button>
            </div>
          )}
        </div>

        {/* Account dropdown */}
        <div className="relative" ref={accountRef}>
          <button
            onClick={() => {
              setAccountOpen(!accountOpen);
              setToolsOpen(false);
              setTreeMenuOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs font-medium text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden max-w-[120px] truncate sm:inline">{userName}</span>
            <svg className="h-4 w-4 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {accountOpen && (
            <div className="fixed left-2 right-2 top-[52px] z-50 rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-56 max-h-[70vh] overflow-y-auto">
              {/* User info */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900 truncate">{userName}</div>
                <div className="text-xs text-gray-500 mt-0.5">Free plan</div>
              </div>

              {/* Share Tree */}
              <button
                onClick={() => {
                  setAccountOpen(false);
                  onShare();
                }}
                disabled={!hasPeople}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
                Share tree
              </button>

              {/* Export PDF */}
              <button
                onClick={() => {
                  setAccountOpen(false);
                  onExport();
                }}
                disabled={!hasPeople}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export PDF
              </button>

              {/* Quick guide */}
              <button
                onClick={() => {
                  setAccountOpen(false);
                  onTutorial();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                Quick guide
              </button>

              <div className="my-1 border-t border-gray-100" />

              {/* Upgrade */}
              <button
                onClick={() => {
                  setAccountOpen(false);
                  onUpgrade('premium_feature');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                </svg>
                Upgrade to Pro
                <span className="ml-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">SOON</span>
              </button>

              <div className="my-1 border-t border-gray-100" />

              {/* Account Settings */}
              <button
                onClick={() => {
                  setAccountOpen(false);
                  onOpenSettings();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                Account settings
              </button>

              {/* Help & Support */}
              <button
                onClick={() => {
                  setAccountOpen(false);
                  window.location.href = '/support';
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                Help & Support
              </button>

              {/* Log out */}
              <button
                onClick={() => {
                  setAccountOpen(false);
                  onLogOut();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
