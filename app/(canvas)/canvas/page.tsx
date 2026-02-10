// app/canvas/page.tsx
"use client";

import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import TreeCanvas from "@/components/canvas/TreeCanvas";
import Modal from "@/components/ui/Modal";
import PersonForm, { PersonFormData } from "@/components/forms/PersonForm";
import PersonDetailsPanel from "@/components/sidebars/PersonDetailsPanel";
import AddChildModal from "@/components/modals/AddChildModal";
import ChangeParentModal from "@/components/modals/ChangeParentModal";
import ShareModal from "@/components/modals/ShareModal";
import UpgradeModal from "@/components/modals/UpgradeModal";
import TopBar from "@/components/layout/TopBar";
import ProfileSetup from "@/components/auth/ProfileSetup";
import TutorialModal from "@/components/modals/TutorialModal";
import Logo from "@/components/ui/Logo";

import useTreeStore, { FREE_TREE_LIMIT } from "@/stores/useTreeStore";
import useUIStore from "@/stores/useUIStore";

export default function CanvasPage() {
  const { user, signOut } = useAuth();
  const userId = user?.id;

  // ─── Mobile detection ───
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ─── Details panel visibility (separate from selection on mobile) ───
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);

  // ─── Tree store ───
  const {
    tree, allTrees, people, relationships, profile, loadingData, error, searchIndex,
    loadTreeData, clearCanvas, hasCurrentPartner, isAtCapacity,
    addPerson, addPartner, addChild, addSibling, addParent,
    linkParent, editPerson, removePerson,
    updatePartnerStatus, changeParent,
    completeProfile, skipProfile, updateProfile,
    getAllCollapsePairKeys,
    switchTree, createNewTree, renameCurrentTree, deleteCurrentTree,
  } = useTreeStore();

  // ─── UI store ───
  const {
    selectedPersonId, focusPersonId, activeModal, changeParentContext, collapsedIds, upgradeReason,
    selectPerson, focusPerson, openModal, closeModal, openChangeParent, openUpgrade,
    toggleCollapse, collapseAll, expandAll,
  } = useUIStore();

  // ─── Load data on mount ───
  useEffect(() => {
    if (userId) loadTreeData(userId);
  }, [userId, loadTreeData]);

  // ─── Derived state ───
  const selectedPerson = selectedPersonId
    ? people.find((p) => p.id === selectedPersonId) ?? null
    : null;

  const changeParentChild = changeParentContext
    ? people.find((p) => p.id === changeParentContext.childId) ?? null
    : null;

  // ─── Mobile-aware person selection ───
  // Use refs so the callback reference stays STABLE — if it changes, TreeCanvas
  // recomputes initialNodes via useMemo and the useEffect sync overwrites
  // the node's selected:true state, which kills quick-add button visibility.
  const selectedPersonIdRef = useRef(selectedPersonId);
  const isMobileRef = useRef(isMobile);
  useEffect(() => { selectedPersonIdRef.current = selectedPersonId; }, [selectedPersonId]);
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);

  // Desktop: single click selects + opens details panel (sidebar doesn't obstruct canvas)
  // Mobile: first tap selects (shows quick-add buttons), second tap opens full-screen details
  const handlePersonSelect = useCallback((personId: string | null) => {
    if (personId === null) {
      selectPerson(null);
      setDetailsPanelOpen(false);
      return;
    }

    if (isMobileRef.current) {
      if (selectedPersonIdRef.current === personId) {
        // Second tap on same person → open details panel
        setDetailsPanelOpen(true);
      } else {
        // First tap on a new person → select only (show quick-add)
        selectPerson(personId);
        setDetailsPanelOpen(false);
      }
    } else {
      // Desktop: always select + show details
      selectPerson(personId);
      setDetailsPanelOpen(true);
    }
  }, [selectPerson]); // ← stable deps only!

  // Close details panel when person is deselected externally
  useEffect(() => {
    if (!selectedPersonId) setDetailsPanelOpen(false);
  }, [selectedPersonId]);

  // ─── Capacity-gated modal openers ───
  const openAddModal = (modal: 'add-person' | 'add-partner' | 'add-child' | 'add-sibling' | 'add-parent') => {
    if (isAtCapacity()) {
      openUpgrade('leaf_capacity');
      return;
    }
    openModal(modal);
  };

  // ─── Modal open handlers (with validation) ───
  const [addPersonInitialName, setAddPersonInitialName] = useState('');

  const handleOpenAddPerson = () => {
    setAddPersonInitialName('');
    openAddModal('add-person');
  };

  const handleStartWithYourself = () => {
    setAddPersonInitialName(profile?.full_name || '');
    openAddModal('add-person');
  };

  const handleOpenAddPartner = () => {
    if (!selectedPerson) return;
    if (hasCurrentPartner(selectedPerson.id)) {
      alert('This person already has a current partner. Please change the existing partnership status first.');
      return;
    }
    openAddModal('add-partner');
  };

  const handleOpenAddChild = () => openAddModal('add-child');

  const handleOpenAddSibling = () => {
    if (!selectedPerson) return;
    const hasParent = relationships.some(
      (r) => r.relationship_type === 'parent_child' && r.person_b_id === selectedPerson.id
    );
    if (!hasParent) {
      alert('Cannot add a sibling without a parent. Please add a parent first.');
      return;
    }
    openAddModal('add-sibling');
  };

  const handleOpenAddParent = () => openAddModal('add-parent');
  const handleOpenEditPerson = () => openModal('edit-person');

  const handleOpenChangeParent = (oldParentId: string) => {
    if (!selectedPerson) return;
    openChangeParent(selectedPerson.id, oldParentId);
  };

  // ─── Quick add handlers (from node click) — also capacity-gated ───
  const handleQuickAddChild = useCallback(
    (personId: string) => {
      if (isAtCapacity()) {
        openUpgrade('leaf_capacity');
        return;
      }
      selectPerson(personId);
      openModal('add-child');
    },
    [selectPerson, openModal, isAtCapacity, openUpgrade]
  );

  const handleQuickAddPartner = useCallback(
    (personId: string) => {
      if (isAtCapacity()) {
        openUpgrade('leaf_capacity');
        return;
      }
      if (hasCurrentPartner(personId)) {
        alert('This person already has a current partner. Please change the existing partnership status first.');
        return;
      }
      selectPerson(personId);
      openModal('add-partner');
    },
    [selectPerson, openModal, hasCurrentPartner, isAtCapacity, openUpgrade]
  );

  const handleQuickAddSibling = useCallback(
    (personId: string) => {
      if (isAtCapacity()) {
        openUpgrade('leaf_capacity');
        return;
      }
      const hasParent = relationships.some(
        (r) => r.relationship_type === 'parent_child' && r.person_b_id === personId
      );
      if (!hasParent) {
        alert('Cannot add a sibling without a parent. Please add a parent first.');
        return;
      }
      selectPerson(personId);
      openModal('add-sibling');
    },
    [selectPerson, openModal, relationships, isAtCapacity, openUpgrade]
  );

  const handleQuickAddParent = useCallback(
    (personId: string) => {
      if (isAtCapacity()) {
        openUpgrade('leaf_capacity');
        return;
      }
      selectPerson(personId);
      openModal('add-parent');
    },
    [selectPerson, openModal, isAtCapacity, openUpgrade]
  );

  const quickAddHandlers = useMemo(
    () => ({
      onAddChild: handleQuickAddChild,
      onAddPartner: handleQuickAddPartner,
      onAddSibling: handleQuickAddSibling,
      onAddParent: handleQuickAddParent,
    }),
    [handleQuickAddChild, handleQuickAddPartner, handleQuickAddSibling, handleQuickAddParent]
  );

  // ─── Collapse all ───
  const handleCollapseAll = useCallback(() => {
    collapseAll(getAllCollapsePairKeys());
  }, [collapseAll, getAllCollapsePairKeys]);

  // ─── Navigation ───
  const handleOpenSettings = () => {
    window.location.href = '/settings';
  };

  // ─── Share ───
  const [showShareModal, setShowShareModal] = useState(false);

  // ─── Tutorial ───
  const [showTutorial, setShowTutorial] = useState(false);

  // Auto-show tutorial after profile setup completes (first time only)
  useEffect(() => {
    if (profile?.profile_completed && !profile?.has_seen_tutorial) {
      setShowTutorial(true);
    }
  }, [profile?.profile_completed, profile?.has_seen_tutorial]);

  const handleCloseTutorial = useCallback(async () => {
    setShowTutorial(false);
    if (profile && !profile.has_seen_tutorial) {
      await updateProfile({ has_seen_tutorial: true });
    }
  }, [profile, updateProfile]);

  const handleOpenTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  // ─── Export PDF ───
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    const container = document.querySelector('.react-flow') as HTMLElement | null;
    if (!viewport || !container) {
      alert('Could not find the tree canvas to export.');
      return;
    }

    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const nodeElements = viewport.querySelectorAll('.react-flow__node');
      if (nodeElements.length === 0) {
        alert('No tree content to export.');
        setExporting(false);
        return;
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodeElements.forEach((el) => {
        const node = el as HTMLElement;
        const transform = node.style.transform;
        const match = transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
        if (match) {
          const x = parseFloat(match[1]);
          const y = parseFloat(match[2]);
          const w = node.offsetWidth;
          const h = node.offsetHeight;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + w);
          maxY = Math.max(maxY, y + h);
        }
      });

      const padding = 60;
      const contentWidth = maxX - minX + padding * 2;
      const contentHeight = maxY - minY + padding * 2;

      const dataUrl = await toPng(viewport, {
        backgroundColor: '#f9f8f6',
        width: contentWidth,
        height: contentHeight,
        style: {
          width: `${contentWidth}px`,
          height: `${contentHeight}px`,
          transform: `translate(${-minX + padding}px, ${-minY + padding}px)`,
        },
        pixelRatio: 2,
      });

      const orientation = contentWidth > contentHeight ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [contentWidth, contentHeight],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, contentWidth, contentHeight);
      pdf.save(`${tree?.name || 'family-tree'}.pdf`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ─── Search ───

  const handleSearchSelect = useCallback(async (personId: string, treeId: string) => {
    // If person is in a different tree, switch first
    if (tree && treeId !== tree.id) {
      await switchTree(treeId);
    }
    selectPerson(personId);
    focusPerson(personId);
    // On mobile: just pan/focus to the person, let user tap again for details
    // On desktop: open details panel immediately
    if (!isMobileRef.current) {
      setDetailsPanelOpen(true);
    }
  }, [selectPerson, focusPerson, switchTree, tree]);

  // ─── New tree ───
  const handleCreateTree = () => {
    const defaultName = `Family ${allTrees.length + 1}`;
    const name = prompt('Enter a name for your new tree:', defaultName);
    if (name?.trim()) {
      createNewTree(name.trim());
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="fc-app flex h-screen flex-col">
        {/* Top bar */}
        <TopBar
          treeName={tree?.name ?? 'Family 1'}
          treeId={tree?.id ?? ''}
          peopleCount={people.length}
          leafCapacity={profile?.leaf_capacity ?? 100}
          userName={profile?.full_name || user?.email || 'User'}
          userPhotoUrl={profile?.photo_url ?? null}
          allTrees={allTrees}
          treeLimit={profile?.tree_limit ?? FREE_TREE_LIMIT}
          onCollapseAll={handleCollapseAll}
          onExpandAll={expandAll}
          onClearAll={clearCanvas}
          onLogOut={signOut}
          onOpenSettings={handleOpenSettings}
          onShare={() => setShowShareModal(true)}
          onExport={handleExport}
          onSwitchTree={switchTree}
          onCreateTree={handleCreateTree}
          onRenameTree={renameCurrentTree}
          onDeleteTree={deleteCurrentTree}
          onUpgrade={openUpgrade}
          onTutorial={handleOpenTutorial}
          hasPeople={people.length > 0}
          hasCollapsedBranches={collapsedIds.size > 0}
          people={searchIndex}
          onSearchSelect={handleSearchSelect}
        />

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 fc-canvas-bg">
            {loadingData ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                  <div className="text-sm text-gray-500">Loading your family tree...</div>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="text-sm font-medium text-red-800">Error</div>
                  <div className="mt-1 text-sm text-red-600">{error}</div>
                  <button
                    className="mt-3 text-sm text-red-700 underline hover:text-red-900"
                    onClick={() => window.location.reload()}
                  >
                    Reload page
                  </button>
                </div>
              </div>
            ) : profile && !profile.profile_completed ? (
              <ProfileSetup
                initialName={profile.full_name || user?.user_metadata?.full_name || ''}
                onComplete={completeProfile}
                onSkip={skipProfile}
              />
            ) : people.length === 0 ? (
              <div className="flex h-full items-start sm:items-center justify-center overflow-y-auto p-4 py-8">
                <div className="max-w-2xl w-full">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                      <Logo size="md" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                      Start your family tree
                    </h2>
                    <p className="mt-2 text-gray-500">
                      Pick one person as your starting point — you&apos;ll grow the tree outward from there.
                    </p>
                  </div>

                  {/* Starting point options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <button
                      onClick={handleStartWithYourself}
                      className="group relative flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-emerald-400 hover:shadow-md"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900">Start with yourself</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Add parents, siblings, and your own family from here
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleOpenAddPerson}
                      className="group relative flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-emerald-400 hover:shadow-md"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 group-hover:bg-amber-100 transition-colors">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900">Start with a grandparent</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Build downward through the generations
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleOpenAddPerson}
                      className="group relative flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-emerald-400 hover:shadow-md"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors">
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900">Add a person</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Start with anyone — a parent, uncle, cousin, or anyone else
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Tips */}
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Tips for building your tree</p>
                    <ul className="space-y-1.5 text-xs text-gray-500">
                      <li className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Click any person to add their partner, children, parents, or siblings
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Only the name is required — add details like dates and photos anytime
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        You can grow the tree upward (add parents) from the topmost generation
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <TreeCanvas
                people={people}
                relationships={relationships}
                onPersonSelect={handlePersonSelect}
                quickAddHandlers={quickAddHandlers}
                collapsedIds={collapsedIds}
                onToggleCollapse={toggleCollapse}
                focusPersonId={focusPersonId}
                selectedPersonId={selectedPersonId}
              />
            )}
          </div>

          {/* Right sidebar - Person details */}
          {selectedPerson && detailsPanelOpen && (
            <PersonDetailsPanel
              person={selectedPerson}
              people={people}
              relationships={relationships}
              onClose={() => {
                if (isMobile) {
                  // On mobile: closing panel keeps person selected (quick-add still visible)
                  setDetailsPanelOpen(false);
                } else {
                  // On desktop: closing panel deselects
                  selectPerson(null);
                  setDetailsPanelOpen(false);
                }
              }}
              onSelectPerson={(personId: string) => {
                selectPerson(personId);
                setDetailsPanelOpen(true);
                focusPerson(personId);
              }}
              onAddPartner={handleOpenAddPartner}
              onAddChild={handleOpenAddChild}
              onAddSibling={handleOpenAddSibling}
              onAddParent={handleOpenAddParent}
              onEdit={handleOpenEditPerson}
              onDelete={removePerson}
              onUpdatePartnerStatus={updatePartnerStatus}
              onChangeParent={handleOpenChangeParent}
              onLinkParent={linkParent}
            />
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}

      {/* Add Person Modal (standalone) */}
      <Modal isOpen={activeModal === 'add-person'} onClose={closeModal} title="Add Person">
        <PersonForm
          key={addPersonInitialName}
          onSubmit={addPerson}
          onCancel={closeModal}
          initialData={addPersonInitialName ? { name: addPersonInitialName } : undefined}
        />
      </Modal>

      {/* Add Partner Modal */}
      <Modal
        isOpen={activeModal === 'add-partner'}
        onClose={closeModal}
        title={`Add Partner for ${selectedPerson?.name || ''}`}
      >
        <PersonForm
          onSubmit={addPartner}
          onCancel={closeModal}
          relationshipContext={
            selectedPerson
              ? {
                  type: 'partner',
                  relatedPersonId: selectedPerson.id,
                  relatedPersonName: selectedPerson.name,
                }
              : undefined
          }
          submitLabel="Add Partner"
        />
      </Modal>

      {/* Add Child Modal (with parent selection) */}
      {selectedPerson && (
        <AddChildModal
          isOpen={activeModal === 'add-child'}
          onClose={closeModal}
          parentPerson={selectedPerson}
          people={people}
          relationships={relationships}
          onSubmit={addChild}
        />
      )}

      {/* Add Sibling Modal */}
      <Modal
        isOpen={activeModal === 'add-sibling'}
        onClose={closeModal}
        title={`Add Sibling of ${selectedPerson?.name || ''}`}
      >
        <PersonForm
          onSubmit={addSibling}
          onCancel={closeModal}
          relationshipContext={
            selectedPerson
              ? {
                  type: 'sibling',
                  relatedPersonId: selectedPerson.id,
                  relatedPersonName: selectedPerson.name,
                }
              : undefined
          }
          submitLabel="Add Sibling"
        />
      </Modal>

      {/* Add Parent Modal */}
      <Modal
        isOpen={activeModal === 'add-parent'}
        onClose={closeModal}
        title={`Add Parent of ${selectedPerson?.name || ''}`}
      >
        <PersonForm
          onSubmit={addParent}
          onCancel={closeModal}
          submitLabel="Add Parent"
        />
      </Modal>

      {/* Edit Person Modal */}
      <Modal
        isOpen={activeModal === 'edit-person'}
        onClose={closeModal}
        title={`Edit ${selectedPerson?.name || ''}`}
      >
        {selectedPerson && (
          <PersonForm
            onSubmit={editPerson}
            onCancel={closeModal}
            initialData={{
              name: selectedPerson.name,
              native_script_name: selectedPerson.native_script_name || undefined,
              gender: (selectedPerson.gender as PersonFormData['gender']) || undefined,
              birth_date: selectedPerson.birth_date || undefined,
              birth_date_unknown: selectedPerson.birth_date_unknown || false,
              location: selectedPerson.location || undefined,
              notes: selectedPerson.notes || undefined,
              photo_url: selectedPerson.photo_url || undefined,
              is_adopted: selectedPerson.is_adopted || false,
              is_deceased: selectedPerson.is_deceased || false,
              death_date: selectedPerson.death_date || undefined,
            }}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Change Parent Modal */}
      {changeParentChild && changeParentContext && (
        <ChangeParentModal
          isOpen={activeModal === 'change-parent'}
          onClose={closeModal}
          childPerson={changeParentChild}
          currentParentId={changeParentContext.oldParentId}
          people={people}
          relationships={relationships}
          onSubmit={changeParent}
        />
      )}

      {/* Share Modal */}
      {tree && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          treeId={tree.id}
          treeName={tree.name}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={activeModal === 'upgrade'}
        onClose={closeModal}
        reason={upgradeReason ?? 'premium_feature'}
        currentCount={people.length}
        limit={profile?.leaf_capacity ?? 100}
      />

      {/* Tutorial Modal */}
      <TutorialModal isOpen={showTutorial} onClose={handleCloseTutorial} />
    </ProtectedRoute>
  );
}
