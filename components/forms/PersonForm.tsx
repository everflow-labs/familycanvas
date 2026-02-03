// components/forms/PersonForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Person, RelationshipType } from '@/types/database';

export type PersonFormData = {
  name: string;
  native_script_name?: string;
  gender?: 'male' | 'female' | 'nonbinary' | 'unknown' | '';
  birth_date?: string;
  birth_date_unknown?: boolean;
  location?: string;
  notes?: string;
  is_adopted?: boolean;
};

export type RelationshipContext = {
  type: RelationshipType;
  relatedPersonId: string;
  relatedPersonName: string;
} | null;

type PersonFormProps = {
  onSubmit: (data: PersonFormData) => Promise<void>;
  onCancel: () => void;
  relationshipContext?: RelationshipContext;
  initialData?: Partial<PersonFormData>;
  submitLabel?: string;
};

export default function PersonForm({
  onSubmit,
  onCancel,
  relationshipContext,
  initialData,
  submitLabel = 'Add Person',
}: PersonFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PersonFormData>({
    defaultValues: {
      name: '',
      native_script_name: '',
      gender: '',
      birth_date: '',
      birth_date_unknown: false,
      location: '',
      notes: '',
      is_adopted: false,
      ...initialData,
    },
  });

  const birthDateUnknown = watch('birth_date_unknown');

  const onFormSubmit = async (data: PersonFormData) => {
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(data);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
      setSubmitting(false);
    }
  };

  // Helper to describe the relationship being created
  const getRelationshipDescription = () => {
    if (!relationshipContext) return null;

    const { type, relatedPersonName } = relationshipContext;

    switch (type) {
      case 'partner':
        return `Adding partner of ${relatedPersonName}`;
      case 'parent_child':
        // Context will tell us direction via additional field if needed
        // For now, assume we're adding a child
        return `Adding child of ${relatedPersonName}`;
      case 'sibling':
        return `Adding sibling of ${relatedPersonName}`;
      default:
        return null;
    }
  };

  const relationshipDescription = getRelationshipDescription();

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Relationship context banner */}
      {relationshipDescription && (
        <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {relationshipDescription}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Name (required) */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Full name"
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Native script name (optional) */}
      <div>
        <label htmlFor="native_script_name" className="block text-sm font-medium text-gray-700">
          Native Script Name
        </label>
        <input
          id="native_script_name"
          type="text"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Name in native script (e.g., 한국어, العربية)"
          {...register('native_script_name')}
        />
      </div>

      {/* Gender */}
      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
          Gender
        </label>
        <select
          id="gender"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          {...register('gender')}
        >
          <option value="">Not specified</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="nonbinary">Non-binary</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Birth date */}
      <div>
        <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700">
          Birth Date
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            id="birth_date"
            type="date"
            disabled={birthDateUnknown}
            className={`block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              birthDateUnknown ? 'bg-gray-100 text-gray-400' : ''
            }`}
            {...register('birth_date')}
          />
          <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              {...register('birth_date_unknown')}
            />
            Unknown
          </label>
        </div>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          id="location"
          type="text"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="City, Country"
          {...register('location')}
        />
      </div>

      {/* Adopted checkbox (show only if adding as child) */}
      {relationshipContext?.type === 'parent_child' && (
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              {...register('is_adopted')}
            />
            This person is adopted
          </label>
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Fun facts, stories, memories..."
          {...register('notes')}
        />
      </div>

      {/* Photo upload placeholder */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Photo</label>
        <div className="mt-1 flex items-center justify-center rounded-md border-2 border-dashed border-gray-300 px-6 py-4">
          <div className="text-center">
            <svg
              className="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-1 text-xs text-gray-500">Photo upload coming soon</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Adding...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
