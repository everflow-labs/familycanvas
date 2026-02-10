// components/sidebars/PersonDetailsPanel.tsx
'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Person, Relationship } from '@/types/database';
import { supabase } from '@/lib/supabase/client';

// Hook to get signed URL for a photo path
function useSignedPhotoUrl(photoUrl: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoUrl) {
      setSignedUrl(null);
      return;
    }

    // If it's already a full URL (legacy or signed), use as-is
    if (photoUrl.startsWith('http') || photoUrl.startsWith('data:')) {
      setSignedUrl(photoUrl);
      return;
    }

    // It's a storage path - generate signed URL
    async function getUrl() {
      try {
        const { data, error } = await supabase.storage
          .from('family-photos')
          .createSignedUrl(photoUrl!, 3600);

        if (!error && data) {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Failed to get signed URL:', err);
      }
    }

    getUrl();
  }, [photoUrl]);

  return signedUrl;
}

type PersonDetailsPanelProps = {
  person: Person;
  people: Person[];
  relationships: Relationship[];
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
  onAddPartner: () => void;
  onAddChild: (otherParentId: string | null) => void;
  onAddSibling: () => void;
  onAddParent: () => void;
  onEdit: () => void;
  onDelete: () => void;
  // Relationship editing
  onUpdatePartnerStatus: (relationshipId: string, newStatus: string) => Promise<void>;
  onChangeParent: (oldParentId: string) => void;
  onLinkParent: (existingPersonId: string) => void;
};

type PartnerInfo = {
  person: Person;
  relationship: Relationship;
  status: string;        // The actual DB status (current, divorced, separated, deceased)
  displayLabel: string;  // What to show in UI badge
  isEditable: boolean;   // Whether status can be changed (not for deceased)
  children: Person[];
};

// Format birth date for display based on precision
function formatBirthDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const [year, month, day] = parts;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  if (day === '01' && month === '01') {
    return year;
  }
  
  if (day === '01') {
    const monthName = monthNames[parseInt(month) - 1];
    return `${monthName} ${year}`;
  }
  
  const monthName = monthNames[parseInt(month) - 1];
  return `${monthName} ${parseInt(day)}, ${year}`;
}

export default function PersonDetailsPanel({
  person,
  people,
  relationships,
  onClose,
  onSelectPerson,
  onAddPartner,
  onAddChild,
  onAddSibling,
  onAddParent,
  onEdit,
  onDelete,
  onUpdatePartnerStatus,
  onChangeParent,
  onLinkParent,
}: PersonDetailsPanelProps) {
  const photoUrl = useSignedPhotoUrl(person.photo_url);

  // Track which partner relationship is being status-edited
  const [editingStatusRelId, setEditingStatusRelId] = useState<string | null>(null);

  // Reset editing state when person changes
  useEffect(() => {
    setEditingStatusRelId(null);
  }, [person.id]);

  // Get all relationship data for this person
  const {
    currentPartner,
    previousPartners,
    parents,
    siblings,
    childrenWithUnknownParent,
    canAddSibling,
    canAddParent,
    canAddPartner,
    linkableParentCandidates,
    hasCurrentPartner,
  } = useMemo(() => {
    const personId = person.id;

    // ── Partner relationships ──────────────────────────────────────
    const partnerRels = relationships.filter(
      (r) =>
        r.relationship_type === 'partner' &&
        (r.person_a_id === personId || r.person_b_id === personId)
    );

    const allPartners: PartnerInfo[] = partnerRels
      .map((rel) => {
        const partnerId = rel.person_a_id === personId ? rel.person_b_id : rel.person_a_id;
        const partnerPerson = people.find((p) => p.id === partnerId);

        if (!partnerPerson) return null;

        // Find children of this couple
        const children = people.filter((child) => {
          const childParentRels = relationships.filter(
            (r) => r.relationship_type === 'parent_child' && r.person_b_id === child.id
          );
          const parentIds = childParentRels.map((r) => r.person_a_id);
          return parentIds.includes(personId) && parentIds.includes(partnerId);
        });

        const status = rel.relationship_status || 'current';

        // Display label: 'deceased' in DB → show as 'widowed' in UI
        let displayLabel = status;
        if (status === 'deceased') {
          displayLabel = 'widowed';
        }

        // Status is editable for living partnerships (not deceased)
        const isEditable = status !== 'deceased';

        return {
          person: partnerPerson,
          relationship: rel,
          status,
          displayLabel,
          isEditable,
          children,
        };
      })
      .filter((p): p is PartnerInfo => p !== null);

    // Current partner = status is 'current' in DB
    // (when a partner dies, their relationship status is updated to 'deceased')
    const current = allPartners.find((p) => p.status === 'current') || null;

    // Previous partners = everyone except current
    const previous = allPartners.filter((p) => p.status !== 'current');

    // ── Parents ────────────────────────────────────────────────────
    const parentRels = relationships.filter(
      (r) => r.relationship_type === 'parent_child' && r.person_b_id === personId
    );
    const parentsList = parentRels
      .map((rel) => people.find((p) => p.id === rel.person_a_id))
      .filter((p): p is Person => !!p);

    // ── Siblings ───────────────────────────────────────────────────
    const siblingIds = new Set<string>();
    for (const parent of parentsList) {
      const parentChildRels = relationships.filter(
        (r) => r.relationship_type === 'parent_child' && r.person_a_id === parent.id
      );
      for (const rel of parentChildRels) {
        if (rel.person_b_id !== personId) {
          siblingIds.add(rel.person_b_id);
        }
      }
    }
    const siblingRels = relationships.filter(
      (r) =>
        r.relationship_type === 'sibling' &&
        (r.person_a_id === personId || r.person_b_id === personId)
    );
    for (const rel of siblingRels) {
      const sibId = rel.person_a_id === personId ? rel.person_b_id : rel.person_a_id;
      siblingIds.add(sibId);
    }
    const siblingsList = Array.from(siblingIds)
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is Person => !!p);

    // ── Children with unknown parent ───────────────────────────────
    const allChildRels = relationships.filter(
      (r) => r.relationship_type === 'parent_child' && r.person_a_id === personId
    );
    const allChildIds = allChildRels.map((r) => r.person_b_id);

    const childrenWithKnownParent = new Set<string>();
    for (const partner of allPartners) {
      for (const child of partner.children) {
        childrenWithKnownParent.add(child.id);
      }
    }

    const unknownParentChildren = allChildIds
      .filter((id) => !childrenWithKnownParent.has(id))
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is Person => !!p);

    // ── canAddParent: topmost generation + bloodline logic ──────────
    const isRoot = parentsList.length === 0;
    const isBloodline = person.is_bloodline !== false;
    let canAddParentValue = false;

    if (parentsList.length === 1) {
      // Always allow adding a 2nd parent (completing the pair)
      canAddParentValue = true;
    } else if (isRoot && parentsList.length === 0) {
      if (isBloodline) {
        canAddParentValue = true;
      } else {
        // Non-bloodline root: allow only if direction not yet committed
        const partnerIds = relationships
          .filter(
            (r) =>
              r.relationship_type === 'partner' &&
              (r.person_a_id === person.id || r.person_b_id === person.id)
          )
          .map((r) => (r.person_a_id === person.id ? r.person_b_id : r.person_a_id));

        const allPartnersAreRoots = partnerIds.every((pid) => {
          const partnerParentCount = relationships.filter(
            (r) => r.relationship_type === 'parent_child' && r.person_b_id === pid
          ).length;
          return partnerParentCount === 0;
        });

        canAddParentValue = allPartnersAreRoots;
      }
    }

    // ── Find linkable parent candidates ──────────────────────────────
    // When person has 1 parent, that parent's partners are candidates
    // to be linked as the 2nd parent (without creating a new person)
    let linkableParentCandidates: Person[] = [];
    if (parentsList.length === 1) {
      const existingParent = parentsList[0];
      const parentPartnerIds = relationships
        .filter(
          (r) =>
            r.relationship_type === 'partner' &&
            (r.person_a_id === existingParent.id || r.person_b_id === existingParent.id)
        )
        .map((r) =>
          r.person_a_id === existingParent.id ? r.person_b_id : r.person_a_id
        );

      // Filter to partners who aren't already a parent of this person
      const existingParentIds = new Set(parentsList.map((p) => p.id));
      linkableParentCandidates = parentPartnerIds
        .filter((pid) => !existingParentIds.has(pid))
        .map((pid) => people.find((p) => p.id === pid))
        .filter((p): p is Person => !!p);
    }

    // ── canAddPartner: non-bloodline ex-partners cannot re-partner ──
    const canAddPartnerValue = !current && !person.is_deceased && isBloodline;

    return {
      currentPartner: current,
      previousPartners: previous,
      parents: parentsList,
      siblings: siblingsList,
      childrenWithUnknownParent: unknownParentChildren,
      canAddSibling: parentsList.length > 0,
      canAddParent: canAddParentValue,
      canAddPartner: canAddPartnerValue,
      linkableParentCandidates,
      hasCurrentPartner: !!current,
    };
  }, [person, people, relationships]);

  // ── Helper components ──────────────────────────────────────────────

  const PersonLink = ({ p, className = '' }: { p: Person; className?: string }) => (
    <button
      onClick={() => onSelectPerson(p.id)}
      className={`text-emerald-600 hover:text-emerald-800 hover:underline text-left ${className}`}
    >
      {p.name}
    </button>
  );

  const StatusBadge = ({
    label,
    status,
    isClickable = false,
    onClick,
  }: {
    label: string;
    status: string;
    isClickable?: boolean;
    onClick?: () => void;
  }) => {
    const colors: Record<string, string> = {
      current: 'bg-emerald-100 text-emerald-800',
      divorced: 'bg-amber-100 text-amber-800',
      separated: 'bg-amber-50 text-amber-700',
      widowed: 'bg-stone-200 text-stone-700',
    };

    if (isClickable && onClick) {
      return (
        <button
          onClick={onClick}
          className={`text-xs px-2 py-0.5 rounded-full ${colors[label] || 'bg-stone-100 text-stone-600'} hover:ring-2 hover:ring-emerald-300 cursor-pointer inline-flex items-center gap-1`}
          title="Click to change status"
        >
          {label}
          <span className="text-[10px]">▾</span>
        </button>
      );
    }

    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[label] || 'bg-stone-100 text-stone-600'}`}>
        {label}
      </span>
    );
  };

  // Inline status editor for a partner relationship
  const StatusEditor = ({
    relationshipId,
    currentStatus,
  }: {
    relationshipId: string;
    currentStatus: string;
  }) => {
    const statuses = ['current', 'divorced', 'separated'];

    const handleStatusChange = async (newStatus: string) => {
      if (newStatus !== currentStatus) {
        await onUpdatePartnerStatus(relationshipId, newStatus);
      }
      setEditingStatusRelId(null);
    };

    return (
      <div className="flex items-center gap-1 flex-wrap mt-1">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${
              status === currentStatus
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status}
          </button>
        ))}
        <button
          onClick={() => setEditingStatusRelId(null)}
          className="text-xs text-gray-400 hover:text-gray-600 ml-1"
          title="Cancel"
        >
          ✕
        </button>
      </div>
    );
  };

  // Render a partner section (used for both current and previous)
  const PartnerSection = ({ partner }: { partner: PartnerInfo }) => {
    const isEditing = editingStatusRelId === partner.relationship.id;

    return (
      <div className="border-l-2 border-gray-200 pl-3 py-1">
        <div className="flex items-center gap-2 flex-wrap">
          <PersonLink p={partner.person} className="font-medium" />
          {isEditing ? (
            <StatusEditor
              relationshipId={partner.relationship.id}
              currentStatus={partner.status}
            />
          ) : (
            <StatusBadge
              label={partner.displayLabel}
              status={partner.status}
              isClickable={partner.isEditable}
              onClick={
                partner.isEditable
                  ? () => setEditingStatusRelId(partner.relationship.id)
                  : undefined
              }
            />
          )}
        </div>

        {/* Children together */}
        {partner.children.length > 0 && (
          <div className="mt-1.5 ml-1">
            <div className="text-xs text-gray-500">Children together:</div>
            {partner.children.map((child) => (
              <div key={child.id} className="text-sm">
                <PersonLink p={child} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="fc-sidebar fixed inset-0 z-40 bg-white sm:static sm:inset-auto sm:z-auto sm:w-80 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b flex-shrink-0">
        <h2 className="text-lg font-semibold">Person Details</h2>
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 pb-24 sm:pb-6 space-y-6">
        {/* Photo & Basic Info */}
        <div className="flex items-start gap-4">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={person.name}
              className="h-20 w-20 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 flex-shrink-0">
              <span className="text-2xl font-semibold text-gray-600">
                {person.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg">{person.name}</div>
            {person.native_script_name && (
              <div className="text-gray-600">{person.native_script_name}</div>
            )}
            {person.birth_date && !person.birth_date_unknown && (
              <div className="text-sm text-gray-500 mt-1">
                Born {formatBirthDate(person.birth_date)}
              </div>
            )}
            {person.is_deceased && (
              <div className="text-sm text-gray-500">
                {person.death_date ? `Died ${person.death_date}` : 'Deceased'}
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {person.is_adopted && (
            <span className="text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-800">
              ❤️ Adopted
            </span>
          )}
          {person.gender && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
              {person.gender === 'other' ? 'Non-binary' : person.gender}
            </span>
          )}
          {person.location && (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
              📍 {person.location}
            </span>
          )}
        </div>

        {/* ── Parents Section ─────────────────────────────────────── */}
        {(parents.length > 0 || canAddParent) && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Parents
            </div>
            <div className="space-y-1.5">
              {parents.map((parent) => (
                <div key={parent.id} className="flex items-center justify-between">
                  <PersonLink p={parent} />
                  <button
                    onClick={() => onChangeParent(parent.id)}
                    className="text-xs text-gray-400 hover:text-emerald-600 px-2 py-0.5 rounded hover:bg-emerald-50"
                  >
                    Change
                  </button>
                </div>
              ))}

              {/* Show linkable candidates (existing partner of current parent) */}
              {canAddParent && linkableParentCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  onClick={() => onLinkParent(candidate.id)}
                  className="text-sm text-emerald-600 hover:text-emerald-800 block"
                >
                  + Add {candidate.name} as parent
                </button>
              ))}

              {/* Only show "Add new parent" when person has NO parents yet */}
              {canAddParent && parents.length === 0 && (
                <button
                  onClick={onAddParent}
                  className="text-sm text-emerald-600 hover:text-emerald-800 block"
                >
                  + Add parent
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Current Partner Section ─────────────────────────────── */}
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Partner
          </div>
          {currentPartner ? (
            <PartnerSection partner={currentPartner} />
          ) : canAddPartner ? (
            <button
              onClick={onAddPartner}
              className="text-sm text-emerald-600 hover:text-emerald-800"
            >
              + Add Partner
            </button>
          ) : (
            <span className="text-sm text-gray-400 italic">None</span>
          )}
        </div>

        {/* ── Previous Partners Section ───────────────────────────── */}
        {previousPartners.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Previous Partners
            </div>
            <div className="space-y-3">
              {previousPartners.map((partner) => (
                <PartnerSection key={partner.person.id} partner={partner} />
              ))}
            </div>
          </div>
        )}

        {/* Show "Add Partner" if only has ex/deceased partners but no current */}
        {canAddPartner && previousPartners.length > 0 && (
          <button
            onClick={onAddPartner}
            className="text-sm text-emerald-600 hover:text-emerald-800"
          >
            + Add New Partner
          </button>
        )}

        {/* ── Children with Unknown Parent ────────────────────────── */}
        {childrenWithUnknownParent.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Children (other parent unknown)
            </div>
            <div className="space-y-1">
              {childrenWithUnknownParent.map((child) => (
                <div key={child.id}>
                  <PersonLink p={child} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Siblings Section ────────────────────────────────────── */}
        {(siblings.length > 0 || canAddSibling) && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Siblings
            </div>
            {siblings.length > 0 ? (
              <div className="space-y-1">
                {siblings.map((sibling) => (
                  <div key={sibling.id}>
                    <PersonLink p={sibling} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No siblings</div>
            )}
            {canAddSibling && (
              <button
                onClick={onAddSibling}
                className="mt-2 text-sm text-emerald-600 hover:text-emerald-800"
              >
                + Add Sibling
              </button>
            )}
          </div>
        )}

        {/* ── Notes ───────────────────────────────────────────────── */}
        {person.notes && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Notes
            </div>
            <div className="text-sm text-gray-700 bg-gray-50 rounded p-3">
              {person.notes}
            </div>
          </div>
        )}
      </div>

      {/* ── Actions Footer ─────────────────────────────────────────── */}
      <div className="border-t p-4 space-y-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Actions
        </div>

        {/* Add Child - always available */}
        <button
          onClick={() => {
            onAddChild(currentPartner?.person.id || null);
          }}
          className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 text-left"
        >
          + Add Child
        </button>

        {/* Add Partner - only if allowed (bloodline check, not deceased, no current partner) */}
        {canAddPartner && (
          <button
            onClick={onAddPartner}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 text-left"
          >
            + Add Partner
          </button>
        )}

        {/* Add Sibling - only if has parents */}
        {canAddSibling && (
          <button
            onClick={onAddSibling}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 text-left"
          >
            + Add Sibling
          </button>
        )}

        {/* Add Parent - only when person has no parents yet */}
        {canAddParent && parents.length === 0 && (
          <button
            onClick={onAddParent}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 text-left"
          >
            + Add Parent
          </button>
        )}

        <div className="pt-2 border-t mt-2 space-y-2">
          <button
            onClick={onEdit}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Edit Details
          </button>
          <button
            onClick={onDelete}
            className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete Person
          </button>
        </div>
      </div>
    </div>
  );
}
