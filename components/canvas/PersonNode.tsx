// components/canvas/PersonNode.tsx
'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { Person } from '@/types/database';

export type PersonNodeData = {
  person: Person;
  isSelected?: boolean;
  onClick?: (personId: string) => void;
};

function PersonNode({ data, selected }: NodeProps<PersonNodeData>) {
  const { person, onClick } = data;

  const handleClick = () => {
    if (onClick) onClick(person.id);
  };

  // Determine border color based on selection and gender
  const getBorderColor = () => {
    if (selected) return 'border-blue-500';
    if (person.is_deceased) return 'border-gray-400';
    if (person.gender === 'male') return 'border-blue-300';
    if (person.gender === 'female') return 'border-pink-300';
    return 'border-gray-300';
  };

  return (
    <div
      className={`
        relative bg-white rounded-lg shadow-md
        w-30 min-h-20
        border-2 ${getBorderColor()}
        cursor-pointer hover:shadow-lg transition-shadow
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
      `}
      onClick={handleClick}
    >
      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="source" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />

      {/* Content */}
      <div className="p-2 flex flex-col items-center justify-center h-full">
        {/* Photo or initials */}
        {person.photo_url ? (
          <img
            src={person.photo_url}
            alt={person.name}
            className="w-10 h-10 rounded-full object-cover mb-1"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mb-1">
            <span className="text-sm font-semibold text-gray-600">
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
          </div>
        )}

        {/* Deceased indicator */}
        {person.is_deceased && (
          <div className="absolute top-1 right-1 w-3 h-3 bg-black rounded-full" title="Deceased" />
        )}

        {/* Adopted indicator */}
        {person.is_adopted && (
          <div className="absolute top-1 left-1 text-xs" title="Adopted">
            ❤️
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PersonNode);
