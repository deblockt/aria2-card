export interface Download {
    status: 'complete' | 'paused';
    total_length: number;
    completed_length: number;
    download_speed: number;
    name: string;
    gid: string;
}

export function remainingDurationInSecond(download: Download): number {
    const remainingSize = download.total_length - download.completed_length
    const currentSpeed = download.download_speed

    return remainingSize / currentSpeed
}