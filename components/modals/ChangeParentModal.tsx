// components/modals/ChangeParentModal.tsx
'use client';

import { useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import type { Person, Relationship } from '@/types/database';

type ChangeParentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  childPerson: Person;
  currentParentId: string;
  people: Person[];
  relationships: Relationship[];
  onSubmit: (newParentId: string | null) => Promise<void>;
};

type ParentOption = {
  id: string;
  name: string;
  status: string;
};

export default function ChangeParentModal({
  isOpen,
  onClose,
  childPerson,
  currentParentId,
  people,
  relationships,
  onSubmit,
}: ChangeParentModalProps) {
  const currentParent = people.find((p) => p.id === currentParentId);

  // All parents of this child
  const parentIds = useMemo(() => {
    return relationships
      .filter((r) => r.relationship_type === 'parent_child' && r.person_b_id === childPerson.id)
      .map((r) => r.person_a_id);
  }, [childPerson.id, relationships]);

  const hasMultipleParents = parentIds.length >= 2;

  // The OTHER parent (the one staying)
  const otherParentId = parentIds.find((id) => id !== currentParentId) || null;
  const otherParent = otherParentId ? people.find((p) => p.id === otherParentId) : null;

  // Reference parent for listing replacement options
  const referenceParentId = otherParentId || currentParentId;

  const replacementOptions = useMemo((): ParentOption[] => {
    const partnerRels = relationships.filter(
      (r) =>
        r.relationship_type === 'partner' &&
        (r.person_a_id === referenceParentId || r.person_b_id === referenceParentId)
    );

    return partnerRels
      .map((rel) => {
        const partnerId =
          rel.person_a_id === referenceParentId ? rel.person_b_id : rel.person_a_id;
        const partnerPerson = people.find((p) => p.id === partnerId);
        if (!partnerPerson) return null;
        if (parentIds.includes(partnerId)) return null; // Already a parent

        let displayStatus = rel.relationship_status || 'current';
        if (partnerPerson.is_deceased && displayStatus === 'current') {
          displayStatus = 'widowed';
        }

        return { id: partnerId, name: partnerPerson.name, status: displayStatus };
      })
      .filter((opt): opt is ParentOption => opt !== null);
  }, [referenceParentId, people, relationships, parentIds]);

  const sortedOptions = useMemo(() => {
    return [...replacementOptions].sort((a, b) => {
      if (a.status === 'current' && b.status !== 'current') return -1;
      if (a.status !== 'current' && b.status === 'current') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [replacementOptions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800';
      case 'divorced': return 'bg-orange-100 text-orange-800';
      case 'separated': return 'bg-yellow-100 text-yellow-800';
      case 'widowed': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const referenceParent = people.find((p) => p.id === referenceParentId);
  const noOptions = sortedOptions.length === 0 && !hasMultipleParents;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Change Parent of ${childPerson.name}`}
      width="md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Replacing:</span> {currentParent?.name || 'Unknown'}
          </div>
          {otherParent && (
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Other parent:</span> {otherParent.name}
            </div>
          )}
        </div>

        {noOptions ? (
          <div className="text-sm text-gray-500 text-center py-4">
            No alternative parents available.
            <br />
            <span className="text-xs">
              {referenceParent?.name || 'This parent'} has no other partners to choose from.
            </span>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Select a new parent
              {referenceParent ? ` from ${referenceParent.name}'s partners` : ''}:
            </p>

            <div className="space-y-2">
              {sortedOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onSubmit(option.id)}
                  className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="font-medium">{option.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(option.status)}`}>
                    {option.status}
                  </span>
                </button>
              ))}

              {hasMultipleParents && (
                <button
                  onClick={() => onSubmit(null)}
                  className="w-full text-left px-4 py-3 border border-dashed rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  Set parent as unknown
                  <span className="block text-xs text-gray-400 mt-0.5">
                    Removes {currentParent?.name || 'this parent'} as a parent (
                    {otherParent?.name || 'other parent'} remains)
                  </span>
                </button>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
