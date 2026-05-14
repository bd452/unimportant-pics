export type AIStatus = 'green' | 'yellow' | 'red';

export type AnalysisState =
  | 'not_queued'
  | 'queued'
  | 'analyzing'
  | 'analyzed'
  | 'error';

export type UserDecision = 'keep' | 'delete' | null;

export type AISignal =
  | 'blurry'
  | 'duplicate_like'
  | 'screenshot'
  | 'receipt'
  | 'low_light'
  | 'document'
  | 'pet'
  | 'person'
  | 'scenic'
  | 'memory_worthy'
  | 'pocket_shot'
  | 'text_heavy';

export interface AIResult {
  status: AIStatus;
  confidence: number;
  reason: string;
  signals: AISignal[];
  reviewPriority: number;
}

export interface PhotoRecord {
  id: string;
  uri: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
  createdAt?: number;
  analysisState: AnalysisState;
  analysis?: AIResult;
  analysisError?: string;
  userDecision: UserDecision;
  attempts: number;
}

export function effectiveStatus(p: PhotoRecord): AIStatus | 'pending' | 'unknown' {
  if (p.userDecision === 'keep') return 'green';
  if (p.userDecision === 'delete') return 'red';
  if (p.analysisState === 'analyzed' && p.analysis) return p.analysis.status;
  if (p.analysisState === 'queued' || p.analysisState === 'analyzing')
    return 'pending';
  return 'unknown';
}
