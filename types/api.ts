// types/api.ts
import type { Person, Relationship, Tree, UUID } from "./database";

export interface ApiError {
  message: string;
  code?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

/** Trees */
export interface CreateTreeRequest {
  name: string;
  description?: string;
}
export type CreateTreeResponse = ApiResponse<Tree>;

/** People */
export interface CreatePersonRequest {
  tree_id: UUID;
  name: string;  // Match database.ts
  native_script_name?: string | null;
  gender?: Person["gender"];
  birth_date?: string | null;
  death_date?: string | null;
  location?: string | null;
  photo_url?: string | null;
  is_adopted?: boolean;
  is_deceased?: boolean;
  notes?: string | null;
}
export type CreatePersonResponse = ApiResponse<Person>;

export interface UpdatePersonRequest {
  id: UUID;
  patch: Partial<Omit<Person, "id" | "tree_id" | "created_at" | "updated_at">>;
}
export type UpdatePersonResponse = ApiResponse<Person>;

export type ListPeopleResponse = ApiResponse<Person[]>;

/** Relationships */
export interface CreateRelationshipRequest {
  tree_id: UUID;
  from_person_id: UUID;
  to_person_id: UUID;
  type: Relationship["relationship_type"];
}
export type CreateRelationshipResponse = ApiResponse<Relationship>;
export type ListRelationshipsResponse = ApiResponse<Relationship[]>;
