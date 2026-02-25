export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      photos: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          size_bytes: number;
          width: number;
          height: number;
          taken_at: string;
          device: string | null;
          location: string | null;
          backed_up: boolean;
          s3_key_original: string;
          s3_key_preview: string;
          s3_key_thumb: string;
          created_at: string;
          updated_at: string;
          processing_status: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          size_bytes: number;
          width: number;
          height: number;
          taken_at?: string;
          device?: string | null;
          location?: string | null;
          backed_up?: boolean;
          s3_key_original: string;
          s3_key_preview: string;
          s3_key_thumb: string;
          created_at?: string;
          updated_at?: string;
          processing_status?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          size_bytes?: number;
          width?: number;
          height?: number;
          taken_at?: string;
          device?: string | null;
          location?: string | null;
          backed_up?: boolean;
          s3_key_original?: string;
          s3_key_preview?: string;
          s3_key_thumb?: string;
          created_at?: string;
          updated_at?: string;
          processing_status?: string | null;
        };
      };
      albums: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      album_photos: {
        Row: {
          album_id: string;
          photo_id: string;
          added_at: string;
        };
        Insert: {
          album_id: string;
          photo_id: string;
          added_at?: string;
        };
        Update: {
          album_id?: string;
          photo_id?: string;
          added_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for use in the app
export type Photo = Database["public"]["Tables"]["photos"]["Row"];
export type Album = Database["public"]["Tables"]["albums"]["Row"];
export type AlbumPhoto = Database["public"]["Tables"]["album_photos"]["Row"];
