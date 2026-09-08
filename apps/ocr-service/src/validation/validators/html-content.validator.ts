/* eslint-disable @typescript-eslint/require-await -- implements an intentionally
   async contract; this rule is a pure text check */
import { Injectable } from '@nestjs/common';

import { BaseDocumentValidator } from '../base-document-validator';

import type { ValidationInput } from '../base-document-validator';
import type { ValidationIssue } from '@app/contracts';

/**
 * Rejects extracted content that contains HTML.
 *
 * Markup in a document destined for text processing means the wrong thing was
 * uploaded, or an extractor produced markup instead of text. Either way the output
 * would be wrong, and it is also the shape most likely to carry a script payload
 * into whatever renders the result.
 *
 * The pattern deliberately looks for a tag-like structure rather than any angle
 * bracket, so prose containing "a < b" is not rejected.
 */
@Injectable()
export class HtmlContentValidator extends BaseDocumentValidator {
  readonly name = 'html-content';

  // No whitespace is allowed between `<` and the tag name, so arithmetic such as
  // "a < b and c > d" is not mistaken for markup.
  private static readonly TAG_PATTERN = /<\/?[a-z][a-z0-9-]*(\s[^<>]*)?\/?>/iu;

  private static readonly DOCTYPE_PATTERN = /<!doctype\s+html/iu;

  supports(): boolean {
    return true;
  }

  async validate({ ocr }: ValidationInput): Promise<ValidationIssue[]> {
    const containsMarkup =
      HtmlContentValidator.DOCTYPE_PATTERN.test(ocr.text) ||
      HtmlContentValidator.TAG_PATTERN.test(ocr.text);

    return containsMarkup
      ? [
          {
            validator: this.name,
            code: 'HTML_CONTENT',
            message: 'Document content contains HTML markup, which is not accepted',
          },
        ]
      : [];
  }
}
