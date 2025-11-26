import { AvatarJob } from '../types';
import { generateAvatar } from './geminiService';
import { resizeImage } from './imageService';

const STORAGE_KEY = 'foosball_avatar_queue';

type JobCallback = (job: AvatarJob) => void;

class AvatarQueueService {
  private queue: AvatarJob[] = [];
  private subscribers: Set<JobCallback> = new Set();
  private isProcessing = false;

  constructor() {
    this.restoreQueue();
  }

  // Persist queue to localStorage
  private persistQueue() {
    const toSave = this.queue.filter(
      (j) => j.status === 'pending' || j.status === 'generating'
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to persist avatar queue:', e);
    }
  }

  // Restore queue from localStorage on startup
  private restoreQueue() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const jobs: AvatarJob[] = JSON.parse(saved);
        // Reset any 'generating' status to 'pending' (they were interrupted)
        this.queue = jobs.map((j) =>
          j.status === 'generating' ? { ...j, status: 'pending' as const } : j
        );
        // Start processing if there are pending jobs
        if (this.queue.some((j) => j.status === 'pending')) {
          this.processNext();
        }
      }
    } catch (e) {
      console.error('Failed to restore avatar queue:', e);
    }
  }

  // Notify all subscribers of job updates
  private notifySubscribers(job: AvatarJob) {
    this.subscribers.forEach((callback) => callback(job));
  }

  // Process the next pending job
  private async processNext() {
    if (this.isProcessing) return;

    const pendingJob = this.queue.find((j) => j.status === 'pending');
    if (!pendingJob) return;

    this.isProcessing = true;
    pendingJob.status = 'generating';
    this.persistQueue();
    this.notifySubscribers(pendingJob);

    try {
      // Strip data URL prefix if present
      const base64Data = pendingJob.sourceImage.includes(',')
        ? pendingJob.sourceImage.split(',')[1]
        : pendingJob.sourceImage;

      const result = await generateAvatar(base64Data, pendingJob.nickname);

      // Resize the generated avatar for storage
      const resizedResult = await resizeImage(result);

      pendingJob.status = 'completed';
      pendingJob.result = resizedResult;
    } catch (error) {
      pendingJob.status = 'failed';
      pendingJob.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.persistQueue();
    this.notifySubscribers(pendingJob);
    this.isProcessing = false;

    // Process next job after a short delay
    setTimeout(() => this.processNext(), 100);
  }

  // Add a new job to the queue
  enqueue(playerId: string, nickname: string, sourceImage: string): string {
    // Cancel any existing job for this player
    const existingJob = this.queue.find(
      (j) => j.playerId === playerId && (j.status === 'pending' || j.status === 'generating')
    );
    if (existingJob) {
      this.cancelJob(existingJob.id);
    }

    const job: AvatarJob = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      playerId,
      nickname,
      sourceImage,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.queue.push(job);
    this.persistQueue();
    this.notifySubscribers(job);

    // Start processing
    this.processNext();

    return job.id;
  }

  // Get active job for a player
  getJobForPlayer(playerId: string): AvatarJob | null {
    return (
      this.queue.find(
        (j) =>
          j.playerId === playerId &&
          (j.status === 'pending' || j.status === 'generating')
      ) || null
    );
  }

  // Check if a player has an active generation
  isGeneratingForPlayer(playerId: string): boolean {
    return this.queue.some(
      (j) =>
        j.playerId === playerId &&
        (j.status === 'pending' || j.status === 'generating')
    );
  }

  // Cancel a job
  cancelJob(jobId: string): boolean {
    const job = this.queue.find((j) => j.id === jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    // Remove from queue
    this.queue = this.queue.filter((j) => j.id !== jobId);
    this.persistQueue();
    return true;
  }

  // Subscribe to job updates
  subscribe(callback: JobCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Get all active jobs
  getActiveJobs(): AvatarJob[] {
    return this.queue.filter(
      (j) => j.status === 'pending' || j.status === 'generating'
    );
  }

  // Acknowledge and remove a completed/failed job
  acknowledgeJob(jobId: string): void {
    this.queue = this.queue.filter((j) => j.id !== jobId);
    this.persistQueue();
  }
}

// Singleton instance
export const avatarQueueService = new AvatarQueueService();
