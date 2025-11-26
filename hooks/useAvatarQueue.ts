import { useEffect, useState, useCallback } from 'react';
import { AvatarJob } from '../types';
import { avatarQueueService } from '../services/avatarQueueService';

export const useAvatarQueue = () => {
  const [activeJobs, setActiveJobs] = useState<AvatarJob[]>(() =>
    avatarQueueService.getActiveJobs()
  );

  useEffect(() => {
    const unsubscribe = avatarQueueService.subscribe((job) => {
      setActiveJobs(avatarQueueService.getActiveJobs());
    });
    return unsubscribe;
  }, []);

  const startGeneration = useCallback(
    (playerId: string, nickname: string, sourceImage: string): string => {
      return avatarQueueService.enqueue(playerId, nickname, sourceImage);
    },
    []
  );

  const isGenerating = useCallback((playerId: string): boolean => {
    return avatarQueueService.isGeneratingForPlayer(playerId);
  }, []);

  const getJobStatus = useCallback((playerId: string): AvatarJob | null => {
    return avatarQueueService.getJobForPlayer(playerId);
  }, []);

  const cancelGeneration = useCallback((playerId: string): boolean => {
    const job = avatarQueueService.getJobForPlayer(playerId);
    if (job) {
      return avatarQueueService.cancelJob(job.id);
    }
    return false;
  }, []);

  return {
    activeJobs,
    startGeneration,
    isGenerating,
    getJobStatus,
    cancelGeneration,
  };
};
