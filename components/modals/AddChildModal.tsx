// components/modals/AddChildModal.tsx
'use client';

import { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import PersonForm, { PersonFormData } from '@/components/forms/PersonForm';
import type { Person, Relationship } from '@/types/database';

type AddChildModalProps = {
  isOpen: boolean;
  onClose: () => void;
  parentPerson: Person;
  people: Person[];
  relationships: Relationship[];
  onSubmit: (formData: PersonFormData, otherParentId: string | null) => Promise<void>;
};

type PartnerOption = {
  id: string;
  name: string;
  status: string;
};

export default function AddChildModal({
  isOpen,
  onClose,
  parentPerson,
  people,
  relationships,
  onSubmit,
}: AddChildModalProps) {
  const [step, setStep] = useState<'select-parent' | 'fill-form'>('select-parent');
  const [selectedOtherParentId, setSelectedOtherParentId] = useState<string | null>(null);

  // Get all partners (current and past)
  const partnerOptions = useMemo((): PartnerOption[] => {
    const partnerRels = relationships.filter(
      (r) =>
        r.relationship_type === 'partner' &&
        (r.person_a_id === parentPerson.id || r.person_b_id === parentPerson.id)
    );

    return partnerRels.map((rel) => {
      const partnerId = rel.person_a_id === parentPerson.id ? rel.person_b_id : rel.person_a_id;
      const partnerPerson = people.find((p) => p.id === partnerId);
      return {
        id: partnerId,
        name: partnerPerson?.name || 'Unknown',
        status: rel.relationship_status || 'current',
      };
    }).filter((p) => p.name !== 'Unknown');
  }, [parentPerson, people, relationships]);

  // Sort: current partners first
  const sortedPartners = useMemo(() => {
    return [...partnerOptions].sort((a, b) => {
      if (a.status === 'current' && b.status !== 'current') return -1;
      if (a.status !== 'current' && b.status === 'current') return 1;
      return 0;
    });
  }, [partnerOptions]);

  const handleSelectParent = (parentId: string | null) => {
    setSelectedOtherParentId(parentId);
    setStep('fill-form');
  };

  const handleFormSubmit = async (formData: PersonFormData) => {
    await onSubmit(formData, selectedOtherParentId);
    // Reset state on close
    setStep('select-parent');
    setSelectedOtherParentId(null);
  };

  const handleClose = () => {
    setStep('select-parent');
    setSelectedOtherParentId(null);
    onClose();
  };

  const getOtherParentName = () => {
    if (selectedOtherParentId === null) return 'Unknown';
    const partner = partnerOptions.find((p) => p.id === selectedOtherParentId);
    return partner?.name || 'Unknown';
  };

  // If no partners, skip straight to form with unknown parent
  const shouldSkipParentSelection = partnerOptions.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'select-parent' ? 'Add Child' : `Add Child of ${parentPerson.name}`}
      width="md"
    >
      {step === 'select-parent' && !shouldSkipParentSelection ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Who is the other parent of this child?
          </p>

          <div className="space-y-2">
            {sortedPartners.map((partner) => (
              <button
                key={partner.id}
                onClick={() => handleSelectParent(partner.id)}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
              >
                <span className="font-medium">{partner.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  partner.status === 'current' 
                    ? 'bg-green-100 text-green-800' 
                    : partner.status === 'divorced'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {partner.status === 'deceased' ? 'deceased' : partner.status}
                </span>
              </button>
            ))}

            <button
              onClick={() => handleSelectParent(null)}
              className="w-full text-left px-4 py-3 border border-dashed rounded-lg hover:bg-gray-50 text-gray-600"
            >
              Other parent unknown
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Show other parent info */}
          {!shouldSkipParentSelection && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <span className="font-medium">Parents:</span> {parentPerson.name} & {getOtherParentName()}
              </div>
              <button
                onClick={() => setStep('select-parent')}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                Change other parent
              </button>
            </div>
          )}

          {shouldSkipParentSelection && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Parent:</span> {parentPerson.name}
                <br />
                <span className="text-xs">(Other parent will be listed as unknown)</span>
              </div>
            </div>
          )}

          <PersonForm
            onSubmit={handleFormSubmit}
            onCancel={handleClose}
            relationshipContext={{
              type: 'parent_child',
              relatedPersonId: parentPerson.id,
              relatedPersonName: parentPerson.name,
            }}
            submitLabel="Add Child"
          />
        </div>
      )}
    </Modal>
  );
}
