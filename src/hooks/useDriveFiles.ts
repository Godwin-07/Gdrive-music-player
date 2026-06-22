import { useQuery } from '@tanstack/react-query';
import { listAllAudioFiles } from '../services/driveService';

export function useDriveFiles() {
  return useQuery({
    queryKey: ['driveFiles'],
    queryFn: async () => {
      console.log('[Drive Sync] Fetching audio files...');
      const files = await listAllAudioFiles();
      console.log(`[Drive Sync] Found ${files.length} files`);
      return files;
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: 1000,
  });
}
