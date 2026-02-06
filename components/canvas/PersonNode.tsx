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
        console.error('Failed to get signed URL for node:', err);
      }
    }

    getUrl();
  }, [photoUrl]);

  return signedUrl;
}

// Quick add button component with label
function QuickAddButton({ 
  position, 
  onClick, 
  label,
}: { 
  position: 'top' | 'bottom' | 'left' | 'right';
  onClick: () => void;
  label: string;
}) {
  const isVertical = position === 'top' || position === 'bottom';
  
  const positionStyles: Record<string, React.CSSProperties> = {
    top: { 
      bottom: '100%', 
      left: '50%', 
      transform: 'translateX(-50%)', 
      marginBottom: '6px',
      flexDirection: 'column',
    },
    bottom: { 
      top: '100%', 
      left: '50%', 
      transform: 'translateX(-50%)', 
      marginTop: '6px',
      flexDirection: 'column',
    },
    left: { 
      right: '100%', 
      top: '50%', 
      transform: 'translateY(-50%)', 
      marginRight: '6px',
      flexDirection: 'row',
    },
    right: { 
      left: '100%', 
      top: '50%', 
      transform: 'translateY(-50%)', 
      marginLeft: '6px',
      flexDirection: 'row',
    },
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: 'absolute',
        ...positionStyles[position],
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '6px',
        backgroundColor: '#3b82f6',
        color: 'white',
        fontSize: '11px',
        fontWeight: 500,
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        zIndex: 50,
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2563eb';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3b82f6';
      }}
    >
      <span style={{ fontSize: '12px' }}>+</span>
      <span>{label}</span>
    </button>
  );
}

function PersonNode({ data, selected }: NodeProps<PersonNodeData>) {
  const { person, onClick, quickAdd } = data;
  const photoUrl = useSignedPhotoUrl(person.photo_url);

  const handleClick = () => {
    if (onClick) onClick(person.id);
  };

  // Determine border color based on selection and gender
  const getBorderColor = () => {
    if (selected) return 'border-blue-500';
    if (person.gender === 'male') return 'border-blue-300';
    if (person.gender === 'female') return 'border-pink-300';
    if (person.gender === 'other') return 'border-purple-400';
    return 'border-gray-300';
  };

  // Show quick add when selected
  const showQuickAdd = selected && quickAdd;

  return (
    <div
      className={`
        relative rounded-lg shadow-md
        border-2 ${getBorderColor()}
        cursor-pointer hover:shadow-lg transition-shadow
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        ${person.is_deceased ? 'bg-gray-100' : 'bg-white'}
      `}
      style={{ 
        width: '120px', 
        minHeight: '100px',
        opacity: person.is_deceased ? 0.8 : 1,
      }}
      onClick={handleClick}
    >
      {/* Hidden handles - just for React Flow edge routing */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ opacity: 0, pointerEvents: 'none' }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ opacity: 0, pointerEvents: 'none' }} 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        style={{ opacity: 0, pointerEvents: 'none' }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ opacity: 0, pointerEvents: 'none' }} 
      />

      {/* Quick Add Buttons - show when selected */}
      {showQuickAdd && (
        <>
          {/* Add Parent - Top */}
          {quickAdd.canAddParent && quickAdd.onAddParent && (
            <QuickAddButton
              position="top"
              onClick={quickAdd.onAddParent}
              label="Parent"
            />
          )}

          {/* Add Child - Bottom */}
          {quickAdd.canAddChild && quickAdd.onAddChild && (
            <QuickAddButton
              position="bottom"
              onClick={quickAdd.onAddChild}
              label="Child"
            />
          )}

          {/* Add Partner - Right */}
          {quickAdd.canAddPartner && quickAdd.onAddPartner && (
            <QuickAddButton
              position="right"
              onClick={quickAdd.onAddPartner}
              label="Partner"
            />
          )}

          {/* Add Sibling - Left */}
          {quickAdd.canAddSibling && quickAdd.onAddSibling && (
            <QuickAddButton
              position="left"
              onClick={quickAdd.onAddSibling}
              label="Sibling"
            />
          )}
        </>
      )}

      {/* Content */}
      <div className="p-2 flex flex-col items-center justify-center h-full">
        {/* Photo or initials */}
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={person.name}
            className="w-12 h-12 rounded-full object-cover mb-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-1">
            <span className="text-lg font-semibold text-gray-600">
              {person.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Name */}
        <div className="text-xs font-medium text-center line-clamp-2 px-1">
          {person.name}
        </div>

        {/* Birth year (if available) */}
        {person.birth_date && !person.birth_date_unknown && (
          <div className="text-[10px] text-gray-500 mt-0.5">
            {person.birth_date.slice(0, 4)}
            {person.is_deceased && person.death_date && (
              <span> - {person.death_date.slice(0, 4)}</span>
            )}
          </div>
        )}

        {/* Deceased indicator */}
        {person.is_deceased && (
          <div 
            className="absolute top-1 right-1 text-sm" 
            title="Deceased"
          >
            ✝️
          </div>
        )}

        {/* Adopted indicator */}
        {person.is_adopted && (
          <div className="absolute top-1 left-1 text-sm" title="Adopted">
            ❤️
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PersonNode);
