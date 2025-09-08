export interface BusinessCard {
  id?: number;
  company_name: string;
  person_name: string;
  person_name_kana?: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  postal_code?: string;
  address?: string;
  website?: string;
  notes?: string;
  image_url?: string;
  image_filename?: string;
  registered_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyCategory {
  id?: number;
  name: string;
  color: string;
  created_at?: string;
}

export interface BusinessCardWithCategories extends BusinessCard {
  categories?: CompanyCategory[];
}

export interface BusinessCardSearchParams {
  q?: string;
  company_name?: string;
  person_name?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

export type Bindings = {
  DB: D1Database;
  R2?: R2Bucket;
};

export interface ImageUploadResponse {
  success: boolean;
  image_url?: string;
  image_filename?: string;
  error?: string;
}

export interface BusinessCardImage {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
}