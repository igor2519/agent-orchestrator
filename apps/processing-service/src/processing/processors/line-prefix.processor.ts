/* eslint-disable @typescript-eslint/require-await -- implements an intentionally
   async contract; prefixing lines needs no I/O */
import { PermanentError } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { BaseDocumentProcessor } from '../base-document-processor';

import type { ProcessingInput, ProcessingOutcome } from '../base-document-processor';

/** Document types that arrive as uploaded files. */
const FILE_TYPES = new Set(['text', 'pdf', 'word', 'image', 'scan', 'scanned-document']);

const PREFIX = '++';

/**
 * The default processing for uploaded documents: prefix every line with `++`.
 *
 * Line endings are normalised first so a file authored on Windows does not produce
 * stray carriage returns in the middle of the output, and the original line count
 * is preserved - including blank lines, which are part of the document's shape.
 */
@Injectable()
export class LinePrefixProcessor extends BaseDocumentProcessor {
  readonly name = 'line-prefix';

  supports(documentType: string): boolean {
    return FILE_TYPES.has(documentType.toLowerCase());
  }

  async process(input: ProcessingInput): Promise<ProcessingOutcome> {
    const text = input.ocr.text;

    if (text.trim().length === 0) {
      throw new PermanentError('Nothing to process: extracted text is empty', 'EMPTY_CONTENT');
    }

    const lines = text.replace(/\r\n?/gu, '\n').split('\n');
    const processed = lines.map((line) => `${PREFIX}${line}`).join('\n');

    return {
      result: {
        processor: this.name,
        lineCount: lines.length,
        characterCount: processed.length,
        prefix: PREFIX,
      },
      resultText: processed,
    };
  }
}
