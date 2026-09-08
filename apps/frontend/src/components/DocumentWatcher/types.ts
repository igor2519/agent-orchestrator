export interface SubmitResponse {
  id: string;
  status: string;
  correlationId: string;
  duplicate: boolean;
  deduplicatedBy?: 'IDEMPOTENCY_KEY' | 'CONTENT_HASH';
}

export interface SubmitError {
  message: string;
  errors?: Record<string, string>;
}
