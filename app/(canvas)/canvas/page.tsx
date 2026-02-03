// app/canvas/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import TreeCanvas from "@/components/canvas/TreeCanvas";
import Modal from "@/components/ui/Modal";
import PersonForm, { PersonFormData, RelationshipContext } from "@/components/forms/PersonForm";

import { getOrCreatePrimaryTree } from "@/lib/api/trees";
import { listPeople, createPerson } from "@/lib/api/people";
import { listRelationships, createRelationship } from "@/lib/api/relationships";

import type { Person, Relationship, RelationshipType } from "@/types/database";

type TreeRow = {
  id: string;
  user_id: string;
  name: string;
  is_primary: boolean;
};

export default function CanvasPage() {
  const { user, signOut } = useAuth();

  const [tree, setTree] = useState<TreeRow | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Modal state
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [relationshipContext, setRelationshipContext] = useState<RelationshipContext>(null);

  const userId = user?.id;

  // Load tree data
  const loadTreeData = useCallback(async () => {
    if (!userId) return;

    setLoadingData(true);
    setError(null);

    try {
      const t = await getOrCreatePrimaryTree(userId);
      setTree(t);

      const [p, r] = await Promise.all([listPeople(t.id), listRelationships(t.id)]);
      setPeople(p);
      setRelationships(r);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load tree data");
    } finally {
      setLoadingData(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTreeData();
  }, [loadTreeData]);

  const selectedPerson = selectedPersonId ? people.find((p) => p.id === selectedPersonId) : null;

  // Handle adding a new person (from empty state or standalone)
  const handleOpenAddPerson = () => {
    setRelationshipContext(null);
    setShowAddPersonModal(true);
  };

  // Handle adding a related person (partner, child, parent, sibling)
  const handleOpenAddRelatedPerson = (type: RelationshipType, direction?: 'parent' | 'child') => {
    if (!selectedPerson) return;

    setRelationshipContext({
      type,
      relatedPersonId: selectedPerson.id,
      relatedPersonName: selectedPerson.name,
    });
    setShowAddPersonModal(true);
  };

  // Handle form submission
  const handleAddPerson = async (formData: PersonFormData) => {
    if (!tree) throw new Error("No tree loaded");

    // Create the person
    const newPerson = await createPerson({
      tree_id: tree.id,
      name: formData.name,
      native_script_name: formData.native_script_name,
      gender: formData.gender || null,
      birth_date: formData.birth_date_unknown ? null : formData.birth_date,
      birth_date_unknown: formData.birth_date_unknown,
      location: formData.location,
      notes: formData.notes,
      is_adopted: formData.is_adopted,
    });

    // If there's a relationship context, create the relationship too
    if (relationshipContext) {
      const { type, relatedPersonId } = relationshipContext;

      if (type === 'partner') {
        await createRelationship({
          tree_id: tree.id,
          person_a_id: relatedPersonId,
          person_b_id: newPerson.id,
          relationship_type: 'partner',
          relationship_status: 'current',
        });
      } else if (type === 'parent_child') {
        // The selected person is the parent, new person is the child
        await createRelationship({
          tree_id: tree.id,
          person_a_id: relatedPersonId, // parent
          person_b_id: newPerson.id,    // child
          relationship_type: 'parent_child',
          parent_type: formData.is_adopted ? 'adoptive' : 'biological',
        });
      } else if (type === 'sibling') {
        await createRelationship({
          tree_id: tree.id,
          person_a_id: relatedPersonId,
          person_b_id: newPerson.id,
          relationship_type: 'sibling',
        });
      }
    }

    // Refresh data and close modal
    await loadTreeData();
    setShowAddPersonModal(false);
    setRelationshipContext(null);

    // Select the newly created person
    setSelectedPersonId(newPerson.id);
  };

  // Get modal title based on context
  const getModalTitle = () => {
    if (!relationshipContext) return "Add Person";

    switch (relationshipContext.type) {
      case 'partner':
        return "Add Partner";
      case 'parent_child':
        return "Add Child";
      case 'sibling':
        return "Add Sibling";
      default:
        return "Add Person";
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b bg-white px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold">FamilyCanvas</div>
            {tree && <div className="text-sm text-gray-600">{tree.name}</div>}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">{user?.email}</div>
            <button className="text-sm text-blue-600 hover:underline" onClick={() => signOut()}>
              Log out
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 bg-gray-50">
            {loadingData ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-600">Loading your family tree...</div>
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
            ) : people.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="text-2xl font-semibold text-gray-900">Your tree is empty</div>
                  <div className="mt-2 text-sm text-gray-600">
                    Start by adding your first family member.
                  </div>
                  <button
                    className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    onClick={handleOpenAddPerson}
                  >
                    Add person
                  </button>
                </div>
              </div>
            ) : (
              <TreeCanvas
                people={people}
                relationships={relationships}
                onPersonSelect={setSelectedPersonId}
              />
            )}
          </div>

          {/* Right sidebar - Person details */}
          {selectedPerson && (
            <div className="w-80 border-l bg-white p-6 overflow-y-auto">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold">Person Details</h2>
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setSelectedPersonId(null)}
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {/* Photo */}
                {selectedPerson.photo_url ? (
                  <img
                    src={selectedPerson.photo_url}
                    alt={selectedPerson.name}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200">
                    <span className="text-3xl font-semibold text-gray-600">
                      {selectedPerson.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <div className="text-sm text-gray-600">Name</div>
                  <div className="mt-1 font-medium">{selectedPerson.name}</div>
                  {selectedPerson.native_script_name && (
                    <div className="mt-1 text-gray-600">{selectedPerson.native_script_name}</div>
                  )}
                </div>

                {/* Birth date */}
                {selectedPerson.birth_date && !selectedPerson.birth_date_unknown && (
                  <div>
                    <div className="text-sm text-gray-600">Birth Date</div>
                    <div className="mt-1">{selectedPerson.birth_date}</div>
                  </div>
                )}

                {/* Death date */}
                {selectedPerson.is_deceased && selectedPerson.death_date && (
                  <div>
                    <div className="text-sm text-gray-600">Death Date</div>
                    <div className="mt-1">{selectedPerson.death_date}</div>
                  </div>
                )}

                {/* Location */}
                {selectedPerson.location && (
                  <div>
                    <div className="text-sm text-gray-600">Location</div>
                    <div className="mt-1">{selectedPerson.location}</div>
                  </div>
                )}

                {/* Gender */}
                {selectedPerson.gender && (
                  <div>
                    <div className="text-sm text-gray-600">Gender</div>
                    <div className="mt-1 capitalize">{selectedPerson.gender}</div>
                  </div>
                )}

                {/* Adopted */}
                {selectedPerson.is_adopted && (
                  <div className="rounded-md bg-pink-50 p-2 text-sm text-pink-800">
                    ❤️ Adopted
                  </div>
                )}

                {/* Notes */}
                {selectedPerson.notes && (
                  <div>
                    <div className="text-sm text-gray-600">Notes</div>
                    <div className="mt-1 text-sm">{selectedPerson.notes}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 space-y-2 pt-4 border-t">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Add Family Member
                  </div>
                  <button
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 text-left"
                    onClick={() => handleOpenAddRelatedPerson('partner')}
                  >
                    + Add Partner
                  </button>
                  <button
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 text-left"
                    onClick={() => handleOpenAddRelatedPerson('parent_child', 'child')}
                  >
                    + Add Child
                  </button>
                  <button
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 text-left"
                    onClick={() => handleOpenAddRelatedPerson('sibling')}
                  >
                    + Add Sibling
                  </button>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <button className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
                    Edit Details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Person Modal */}
      <Modal
        isOpen={showAddPersonModal}
        onClose={() => {
          setShowAddPersonModal(false);
          setRelationshipContext(null);
        }}
        title={getModalTitle()}
      >
        <PersonForm
          onSubmit={handleAddPerson}
          onCancel={() => {
            setShowAddPersonModal(false);
            setRelationshipContext(null);
          }}
          relationshipContext={relationshipContext}
        />
      </Modal>
    </ProtectedRoute>
  );
}
