/**
 * What happened, in the trail's own vocabulary.
 *
 * These are deliberately not the same strings as the domain `EventType`. Domain
 * events describe what a service announced; audit actions describe what the
 * system did about it. Keeping them separate means renaming an internal event
 * never rewrites recorded history.
 */
export const AuditAction = {
  /** A submission was accepted and the pipeline started. */
  DocumentSubmitted: 'DOCUMENT_SUBMITTED',
  /** A submission matched an existing document and was not processed again. */
  DuplicateDetected: 'DUPLICATE_DETECTED',
  /** The document moved between lifecycle statuses. */
  StatusChanged: 'STATUS_CHANGED',
  /** An operator asked for a failed document to run again. */
  RetryRequested: 'RETRY_REQUESTED',
  /** The customer's completion/failure notification reached them. */
  NotificationDelivered: 'NOTIFICATION_DELIVERED',
  /** Notification attempts were exhausted or permanently rejected. */
  NotificationFailed: 'NOTIFICATION_FAILED',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

/** Who or what caused an entry. */
export const AuditActor = {
  /** A customer-facing API call. */
  Api: 'API',
  /** An operator-initiated action, such as a retry. */
  Operator: 'OPERATOR',
  /** A downstream service's event, applied by the projection. */
  Pipeline: 'PIPELINE',
} as const;

export type AuditActor = (typeof AuditActor)[keyof typeof AuditActor];
