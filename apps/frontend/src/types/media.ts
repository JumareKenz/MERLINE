export type MediaType = 'image' | 'audio' | 'video' | 'file' | 'signature';

export interface Media {
  id: string;
  submission_id?: string;
  question_id?: string;
  original_filename: string;
  mime_type: string;
  size: number;
  url?: string;
  thumbnail_url?: string;
  media_type: MediaType;
  is_processed: boolean;
  created_at: string;
}

export interface SyncStatusData {
  device_id: string;
  last_synced_at?: string;
  pending_upload: number;
  pending_download: number;
  status: 'online' | 'offline' | 'syncing' | 'error';
  errors?: number;
}

export interface SyncLogEntry {
  id: string;
  device_id: string;
  action: string;
  status: 'success' | 'error' | 'conflict';
  records_synced: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}
