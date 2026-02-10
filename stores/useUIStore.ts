// stores/useUIStore.ts
import { create } from 'zustand';
import type { UpgradeReason } from '@/components/modals/UpgradeModal';

type ModalType =
  | 'add-person'
  | 'add-partner'
  | 'add-sibling'
  | 'add-parent'
  | 'add-child'
  | 'edit-person'
  | 'change-parent'
  | 'upgrade'
  | null;

type ChangeParentContext = {
  childId: string;
  oldParentId: string;
} | null;

type UIState = {
  // Selection
  selectedPersonId: string | null;

  // Focus (auto-pan to person)
  focusPersonId: string | null;

  // Modals
  activeModal: ModalType;
  changeParentContext: ChangeParentContext;
  upgradeReason: UpgradeReason | null;

  // Collapse/expand
  collapsedIds: Set<string>;
};

type UIActions = {
  // Selection
  selectPerson: (id: string | null) => void;

  // Focus (auto-pan to person, auto-clears)
  focusPerson: (id: string) => void;

  // Modals
  openModal: (modal: NonNullable<ModalType>) => void;
  closeModal: () => void;
  openChangeParent: (childId: string, oldParentId: string) => void;
  openUpgrade: (reason: UpgradeReason) => void;

  // Collapse/expand
  toggleCollapse: (pairKey: string) => void;
  collapseAll: (allPairKeys: Set<string>) => void;
  expandAll: () => void;
};

const useUIStore = create<UIState & UIActions>((set) => ({
  // ─── Initial state ───
  selectedPersonId: null,
  focusPersonId: null,
  activeModal: null,
  changeParentContext: null,
  upgradeReason: null,
  collapsedIds: new Set(),

  // ─── Selection ───
  selectPerson: (id) => set({ selectedPersonId: id }),

  // ─── Focus (auto-pan) ───
  focusPerson: (id) => {
    set({ focusPersonId: id });
    // Auto-clear after animation completes
    setTimeout(() => set({ focusPersonId: null }), 500);
  },

  // ─── Modals ───
  openModal: (modal) => set({ activeModal: modal }),

  closeModal: () =>
    set({ activeModal: null, changeParentContext: null, upgradeReason: null }),

  openChangeParent: (childId, oldParentId) =>
    set({
      activeModal: 'change-parent',
      changeParentContext: { childId, oldParentId },
    }),

  openUpgrade: (reason) =>
    set({
      activeModal: 'upgrade',
      upgradeReason: reason,
    }),

  // ─── Collapse/expand ───
  toggleCollapse: (pairKey) =>
    set((state) => {
      const next = new Set(state.collapsedIds);
      if (next.has(pairKey)) {
        next.delete(pairKey);
      } else {
        next.add(pairKey);
      }
      return { collapsedIds: next };
    }),

  collapseAll: (allPairKeys) => set({ collapsedIds: allPairKeys }),

  expandAll: () => set({ collapsedIds: new Set() }),
}));

export default useUIStore;
export type { ModalType, ChangeParentContext };
