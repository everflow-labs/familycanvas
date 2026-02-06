// components/forms/PersonForm.tsx
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { RelationshipType } from '@/types/database';
import PhotoUpload from './PhotoUpload';

// Country list (common countries first, then alphabetical)
const COUNTRIES = [
  // Common countries at top
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'India',
  'Germany',
  'France',
  'Brazil',
  'Mexico',
  'China',
  'Japan',
  'South Korea',
  'Philippines',
  'Nigeria',
  'South Africa',
  '---', // Separator
  // Alphabetical list
  'Afghanistan',
  'Albania',
  'Algeria',
  'Argentina',
  'Armenia',
  'Austria',
  'Azerbaijan',
  'Bahrain',
  'Bangladesh',
  'Belarus',
  'Belgium',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Bulgaria',
  'Cambodia',
  'Cameroon',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Czech Republic',
  'Denmark',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Estonia',
  'Ethiopia',
  'Finland',
  'Georgia',
  'Ghana',
  'Greece',
  'Guatemala',
  'Haiti',
  'Honduras',
  'Hong Kong',
  'Hungary',
  'Iceland',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kuwait',
  'Latvia',
  'Lebanon',
  'Libya',
  'Lithuania',
  'Malaysia',
  'Morocco',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Norway',
  'Oman',
  'Pakistan',
  'Palestine',
  'Panama',
  'Paraguay',
  'Peru',
  'Poland',
  'Portugal',
  'Puerto Rico',
  'Qatar',
  'Romania',
  'Russia',
  'Saudi Arabia',
  'Serbia',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Somalia',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Thailand',
  'Tunisia',
  'Turkey',
  'Ukraine',
  'United Arab Emirates',
  'Uruguay',
  'Uzbekistan',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zimbabwe',
];

const MONTHS = [
  { value: '', label: 'Month' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Generate year options (current year down to 1900)
const currentYear = new Date().getFullYear();
const YEARS = [
  { value: '', label: 'Year' },
  ...Array.from({ length: currentYear - 1899 }, (_, i) => {
    const year = currentYear - i;
    return { value: year.toString(), label: year.toString() };
  }),
];

// Generate day options
const DAYS = [
  { value: '', label: 'Day' },
  ...Array.from({ length: 31 }, (_, i) => {
    const day = (i + 1).toString().padStart(2, '0');
    return { value: day, label: (i + 1).toString() };
  }),
];

export type PersonFormData = {
  name: string;
  native_script_name?: string;
  gender?: 'male' | 'female' | 'other' | '';
  birth_date?: string;
  birth_date_unknown?: boolean;
  location?: string;
  notes?: string;
  is_adopted?: boolean;
  is_deceased?: boolean;
  death_date?: string;
  photo_url?: string | null;
};

// Internal form state includes separate date fields
type FormState = {
  name: string;
  native_script_name: string;
  gender: 'male' | 'female' | 'other' | '';
  birth_month: string;
  birth_day: string;
  birth_year: string;
  birth_date_unknown: boolean;
  city: string;
  country: string;
  notes: string;
  is_adopted: boolean;
  is_deceased: boolean;
  death_month: string;
  death_day: string;
  death_year: string;
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

// Parse existing birth_date into components
function parseBirthDate(dateStr?: string): { month: string; day: string; year: string } {
  if (!dateStr) return { month: '', day: '', year: '' };
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { month: '', day: '', year: '' };
  
  const [year, month, day] = parts;
  
  // If day is '01', assume it might be partial - don't pre-fill day
  // If month is also '01', assume year-only - don't pre-fill month either
  const dayValue = day === '01' ? '' : day;
  const monthValue = (day === '01' && month === '01') ? '' : month;
  
  return {
    year: year || '',
    month: monthValue || '',
    day: dayValue || '',
  };
}

// Parse existing location into city/country
function parseLocation(location?: string): { city: string; country: string } {
  if (!location) return { city: '', country: '' };
  
  const parts = location.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    const country = parts[parts.length - 1];
    const city = parts.slice(0, -1).join(', ');
    return { city, country };
  }
  
  // Check if it matches a country name
  if (COUNTRIES.includes(location)) {
    return { city: '', country: location };
  }
  
  return { city: location, country: '' };
}

export default function PersonForm({
  onSubmit,
  onCancel,
  relationshipContext,
  initialData,
  submitLabel = 'Add Person',
}: PersonFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialData?.photo_url || null);

  // Parse initial data
  const parsedBirthDate = parseBirthDate(initialData?.birth_date);
  const parsedDeathDate = parseBirthDate(initialData?.death_date); // Reuse same parser
  const parsedLocation = parseLocation(initialData?.location);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormState>({
    defaultValues: {
      name: initialData?.name || '',
      native_script_name: initialData?.native_script_name || '',
      gender: initialData?.gender || '',
      birth_month: parsedBirthDate.month,
      birth_day: parsedBirthDate.day,
      birth_year: parsedBirthDate.year,
      birth_date_unknown: initialData?.birth_date_unknown || false,
      city: parsedLocation.city,
      country: parsedLocation.country,
      notes: initialData?.notes || '',
      is_adopted: initialData?.is_adopted || false,
      is_deceased: initialData?.is_deceased || false,
      death_month: parsedDeathDate.month,
      death_day: parsedDeathDate.day,
      death_year: parsedDeathDate.year,
    },
  });

  const birthDateUnknown = watch('birth_date_unknown');
  const birthYear = watch('birth_year');
  const birthMonth = watch('birth_month');
  const isDeceased = watch('is_deceased');
  const deathYear = watch('death_year');
  const deathMonth = watch('death_month');

  // Compute valid days based on month/year
  const validDays = useMemo(() => {
    if (!birthMonth || !birthYear) return DAYS;
    
    const month = parseInt(birthMonth);
    const year = parseInt(birthYear);
    let maxDay = 31;
    
    if ([4, 6, 9, 11].includes(month)) {
      maxDay = 30;
    } else if (month === 2) {
      // Check for leap year
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      maxDay = isLeap ? 29 : 28;
    }
    
    return DAYS.filter((d, i) => i === 0 || parseInt(d.value) <= maxDay);
  }, [birthMonth, birthYear]);

  // Compute valid days for death date
  const validDeathDays = useMemo(() => {
    if (!deathMonth || !deathYear) return DAYS;
    
    const month = parseInt(deathMonth);
    const year = parseInt(deathYear);
    let maxDay = 31;
    
    if ([4, 6, 9, 11].includes(month)) {
      maxDay = 30;
    } else if (month === 2) {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      maxDay = isLeap ? 29 : 28;
    }
    
    return DAYS.filter((d, i) => i === 0 || parseInt(d.value) <= maxDay);
  }, [deathMonth, deathYear]);

  const onFormSubmit = async (data: FormState) => {
    setSubmitting(true);
    setError(null);

    try {
      // Construct birth_date from components
      let birth_date: string | undefined;
      
      if (data.birth_year) {
        const year = data.birth_year;
        const month = data.birth_month || '01';
        const day = data.birth_day || '01';
        birth_date = `${year}-${month}-${day}`;
      }

      // Construct death_date from components
      let death_date: string | undefined;
      
      if (data.is_deceased && data.death_year) {
        const year = data.death_year;
        const month = data.death_month || '01';
        const day = data.death_day || '01';
        death_date = `${year}-${month}-${day}`;
      }

      // Construct location from city/country
      let location: string | undefined;
      if (data.city && data.country) {
        location = `${data.city}, ${data.country}`;
      } else if (data.city) {
        location = data.city;
      } else if (data.country) {
        location = data.country;
      }

      const formData: PersonFormData = {
        name: data.name,
        native_script_name: data.native_script_name || undefined,
        gender: data.gender || undefined,
        birth_date,
        birth_date_unknown: data.birth_date_unknown,
        location,
        notes: data.notes || undefined,
        is_adopted: data.is_adopted,
        is_deceased: data.is_deceased,
        death_date,
        photo_url: photoUrl,
      };

      await onSubmit(formData);
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
          <option value="other">Non-binary / Other</option>
        </select>
      </div>

      {/* Birth Date - Month/Day/Year dropdowns */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Birth Date
        </label>
        <div className="mt-1 flex items-center gap-2">
          <select
            disabled={birthDateUnknown}
            className={`block w-32 rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              birthDateUnknown ? 'bg-gray-100 text-gray-400' : ''
            }`}
            {...register('birth_month')}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            disabled={birthDateUnknown}
            className={`block w-20 rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              birthDateUnknown ? 'bg-gray-100 text-gray-400' : ''
            }`}
            {...register('birth_day')}
          >
            {validDays.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          <select
            disabled={birthDateUnknown}
            className={`block w-24 rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              birthDateUnknown ? 'bg-gray-100 text-gray-400' : ''
            }`}
            {...register('birth_year')}
          >
            {YEARS.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
        
        <label className="flex items-center gap-1.5 text-sm text-gray-600 mt-2">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            {...register('birth_date_unknown')}
          />
          Birth date unknown
        </label>
        
        <p className="text-xs text-gray-500 mt-1">
          You can enter just the year, or month and year if the exact date is unknown.
        </p>
      </div>

      {/* Location - City + Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <div className="mt-1 space-y-2">
          <input
            type="text"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="City"
            {...register('city')}
          />
          <select
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            {...register('country')}
          >
            <option value="">Select country</option>
            {COUNTRIES.map((country, idx) => (
              country === '---' ? (
                <option key={`separator-${idx}`} disabled>──────────</option>
              ) : (
                <option key={country} value={country}>
                  {country}
                </option>
              )
            ))}
          </select>
        </div>
      </div>

      {/* Status checkboxes */}
      <div className="space-y-3">
        {/* Adopted checkbox */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            {...register('is_adopted')}
          />
          This person is adopted
        </label>

        {/* Deceased checkbox */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            {...register('is_deceased')}
          />
          This person is deceased
        </label>
      </div>

      {/* Death Date - only show if deceased */}
      {isDeceased && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date of Death
          </label>
          <div className="mt-1 flex items-center gap-2">
            <select
              className="block w-32 rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('death_month')}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              className="block w-20 rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('death_day')}
            >
              {validDeathDays.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>

            <select
              className="block w-24 rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('death_year')}
            >
              {YEARS.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Leave blank if unknown.
          </p>
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

      {/* Photo upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
        <PhotoUpload
          currentPhotoUrl={photoUrl}
          onPhotoChange={setPhotoUrl}
          disabled={submitting}
        />
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
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
