import { DocumentStatus } from '@app/contracts';
import { z } from 'zod';

import { paginationQuerySchema } from 'src/features/common/validations';

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .optional()
  .transform((value) => (value ? new Date(value) : undefined));

export const listDocumentsSchema = paginationQuerySchema.extend({
  customerId: z.string().min(1).max(128).optional(),
  status: z.enum(Object.values(DocumentStatus) as [DocumentStatus, ...DocumentStatus[]]).optional(),
  submittedFrom: optionalDate,
  submittedTo: optionalDate,
});

export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>;
