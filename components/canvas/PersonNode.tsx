// components/canvas/PersonNode.tsx
'use client';

import { memo, useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { Person } from '@/types/database';
import { supabase } from '@/lib/supabase/client';

export type QuickAddActions = {
  canAddChild: boolean;
  canAddPartner: boolean;
  canAddSibling: boolean;
  canAddParent: boolean;
  onAddChild?: () => void;
  onAddPartner?: () => void;
  onAddSibling?: () => void;
  onAddParent?: () => void;
};

export type PersonNodeData = {
  person: Person;
  isSelected?: boolean;
  onClick?: (personId: string) => void;
  quickAdd?: QuickAddActions;
};

// Hook to get signed URL for a photo path
function useSignedPhotoUrl(photoUrl: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoUrl) {
      setSignedUrl(null);
      return;
    }

    if (photoUrl.startsWith('http') || photoUrl.startsWith('data:')) {
      setSignedUrl(photoUrl);
      return;
    }

    async function getUrl() {
      try {
        const { data, error } = await supabase.storage
          .from('family-photos')
          .createSignedUrl(photoUrl!, 3600);
        if (!error && data) setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Failed to get signed URL for node:', err);
      }
    }
    getUrl();
  }, [photoUrl]);

  return signedUrl;
}

// Gender accent colors
const GENDER_ACCENT: Record<string, { border: string; bg: string; text: string }> = {
  male: { border: '#93c5fd', bg: '#eff6ff', text: '#3b82f6' },
  female: { border: '#f9a8d4', bg: '#fdf2f8', text: '#ec4899' },
  other: { border: '#c4b5fd', bg: '#f5f3ff', text: '#8b5cf6' },
};

const DEFAULT_ACCENT = { border: '#e2e7e4', bg: '#f8faf9', text: '#6b7d73' };

// Quick add button
function QuickAddButton({
  position,
  onClick,
  label,
}: {
  position: 'top' | 'bottom' | 'left' | 'right';
  onClick: () => void;
  label: string;
}) {
  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', flexDirection: 'column' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', flexDirection: 'column' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px', flexDirection: 'row' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px', flexDirection: 'row' },
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="fc-quick-add"
      aria-label={`Add ${label.toLowerCase()}`}
      style={{
        position: 'absolute',
        ...positionStyles[position],
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        padding: '6px 12px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: 'var(--font-body, system-ui)',
        whiteSpace: 'nowrap',
        zIndex: 50,
        minHeight: '32px',
      }}
    >
      <span style={{ fontSize: '13px', lineHeight: 1 }}>+</span>
      <span>{label}</span>
    </button>
  );
}

function PersonNode({ data, selected }: NodeProps<PersonNodeData>) {
  const { person, onClick, quickAdd } = data;
  const photoUrl = useSignedPhotoUrl(person.photo_url);
  const handleClick = () => { if (onClick) onClick(person.id); };

  const gender = person.gender || '';
  const accent = GENDER_ACCENT[gender] || DEFAULT_ACCENT;
  const showQuickAdd = selected && quickAdd;

  const initials = person.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Build screen reader description
  const ariaLabel = [
    person.name,
    person.is_deceased ? '(deceased)' : '',
    person.birth_date && !person.birth_date_unknown ? `born ${person.birth_date.slice(0, 4)}` : '',
    person.is_deceased && person.death_date ? `died ${person.death_date.slice(0, 4)}` : '',
    person.location ? `lives in ${person.location}` : '',
    person.is_adopted ? 'adopted' : '',
  ].filter(Boolean).join(', ');

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-selected={selected}
      className={`fc-node ${selected ? 'selected' : ''} ${person.is_deceased ? 'deceased' : ''}`}
      style={{
        width: '120px',
        minHeight: '100px',
        borderColor: selected ? undefined : (person.is_deceased ? '#b5b0a8' : accent.border),
        position: 'relative',
        fontFamily: 'var(--font-body, system-ui)',
      }}
    >
      {/* Hidden handles */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} />

      {/* Quick Add */}
      {showQuickAdd && (
        <>
          {quickAdd.canAddParent && quickAdd.onAddParent && (
            <QuickAddButton position="top" onClick={quickAdd.onAddParent} label="Parent" />
          )}
          {quickAdd.canAddChild && quickAdd.onAddChild && (
            <QuickAddButton position="bottom" onClick={quickAdd.onAddChild} label="Child" />
          )}
          {quickAdd.canAddPartner && quickAdd.onAddPartner && (
            <QuickAddButton position="right" onClick={quickAdd.onAddPartner} label="Partner" />
          )}
          {quickAdd.canAddSibling && quickAdd.onAddSibling && (
            <QuickAddButton position="left" onClick={quickAdd.onAddSibling} label="Sibling" />
          )}
        </>
      )}

      {/* Content */}
      <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        {/* Photo or initials */}
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={person.name}
            style={{
              width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover',
              marginBottom: '6px', border: `2px solid ${accent.border}`,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div style={{
            width: '46px', height: '46px', borderRadius: '50%',
            backgroundColor: accent.bg, border: `2px solid ${accent.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px',
          }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: accent.text, letterSpacing: '-0.02em' }}>
              {initials}
            </span>
          </div>
        )}

        {/* Name */}
        <div style={{
          fontSize: '12px', fontWeight: 600, textAlign: 'center', lineHeight: 1.3,
          maxWidth: '110px', overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', color: person.is_deceased ? '#635e57' : '#242f29',
        }}>
          {person.name}
        </div>

        {/* Birth year */}
        {person.birth_date && !person.birth_date_unknown && (
          <div style={{ fontSize: '10px', color: '#70756f', marginTop: '2px', fontWeight: 500 }}>
            {person.birth_date.slice(0, 4)}
            {person.is_deceased && person.death_date && (
              <span> – {person.death_date.slice(0, 4)}</span>
            )}
          </div>
        )}

        {/* Deceased indicator */}
        {person.is_deceased && (
          <div style={{
            position: 'absolute', top: '3px', right: '3px',
            fontSize: '9px', fontWeight: 600, color: '#635e57',
            backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px',
            padding: '1px 4px', lineHeight: 1.4, letterSpacing: '0.02em',
          }} title="Deceased">
            ✝
          </div>
        )}

        {/* Adopted indicator */}
        {person.is_adopted && (
          <div style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '12px' }} title="Adopted">
            ❤️
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PersonNode);
