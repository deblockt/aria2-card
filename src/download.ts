export interface File {
    path: string;
    completed_length: number;
    index: number;
    length: number;
}

export interface BaseDownload {
  status: 'complete' | 'paused' | 'removed' | 'active';
  total_length: number;
  completed_length: number;
  download_speed: number;
  name: string;
  gid: string;
  files: File[];
}

export interface TorrentDownload extends BaseDownload {
  is_torrent: true;
  seeder: boolean;
  upload_length: number;
  upload_speed: number;
}

export interface NonTorrentDownload extends BaseDownload {
  is_torrent: false;
}

export type Download = TorrentDownload | NonTorrentDownload;

export function remainingDurationInSeconds(download: Download, completed_length: number, speed: number): number {
    const remainingSize = download.total_length - completed_length;
    const currentSpeed = speed;

    return remainingSize / currentSpeed;
}

export function downloadedPercent(download: Download, completed_length: number): number {
    return completed_length * 100 / download.total_length;
}