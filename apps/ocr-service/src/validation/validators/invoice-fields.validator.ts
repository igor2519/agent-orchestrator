/* eslint-disable @typescript-eslint/require-await -- these implement an
   intentionally async contract; the deterministic stand-ins perform no I/O */
import { Injectable } from '@nestjs/common';

import { BaseDocumentValidator } from '../base-document-validator';

import type { ValidationInput } from '../base-document-validator';
import type { ValidationIssue } from '@app/contracts';

/**
 * Type-specific rule, included to show that a validator can narrow itself to one
 * document type without the handler knowing it exists.
 */
@Injectable()
export class InvoiceFieldsValidator extends BaseDocumentValidator {
  readonly name = 'invoice-fields';

  private static readonly REQUIRED_FIELDS = ['amount', 'currency'];

  supports(documentType: string): boolean {
    return documentType === 'invoice';
  }

  async validate({ payload }: ValidationInput): Promise<ValidationIssue[]> {
    return InvoiceFieldsValidator.REQUIRED_FIELDS.filter(
      (field) => payload?.[field] === undefined,
    ).map((field) => ({
      validator: this.name,
      code: 'MISSING_FIELD',
      message: `Invoice payload is missing required field "${field}"`,
    }));
  }
}
