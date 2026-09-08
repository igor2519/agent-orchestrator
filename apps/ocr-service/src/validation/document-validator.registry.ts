import { Inject, Injectable } from '@nestjs/common';

import { BaseDocumentValidator } from './base-document-validator';
import { DOCUMENT_VALIDATORS } from './validation.tokens';

import type { ValidationInput } from './base-document-validator';
import type { ValidationIssue } from '@app/contracts';

/** Runs every validator that claims the document type and pools their findings. */
@Injectable()
export class DocumentValidatorRegistry {
  constructor(@Inject(DOCUMENT_VALIDATORS) private readonly validators: BaseDocumentValidator[]) {}

  applicableTo(documentType: string): BaseDocumentValidator[] {
    return this.validators.filter((validator) => validator.supports(documentType));
  }

  async validate(
    input: ValidationInput,
  ): Promise<{ issues: ValidationIssue[]; executed: string[] }> {
    const applicable = this.applicableTo(input.documentType);
    const results = await Promise.all(applicable.map((validator) => validator.validate(input)));

    return {
      issues: results.flat(),
      executed: applicable.map((validator) => validator.name),
    };
  }
}
