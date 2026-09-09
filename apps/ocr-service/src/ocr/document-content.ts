import { PermanentError } from '@app/messaging';

import type { OcrInput } from './base-ocr-processor';

const DATA_URL_PATTERN = /^data:[^;]+;base64,/iu;
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Resolves the bytes an engine should read.
 *
 * Uploads arrive inline as base64 (`payload.contentBase64`); references are
 * fetched. Absence of both is a caller error and will never become valid on retry,
 * so it is permanent rather than something to burn attempts on.
 */
export const resolveContent = async (input: OcrInput): Promise<Buffer> => {
  const inline = input.payload?.contentBase64 ?? input.payload?.imageBase64;

  if (typeof inline === 'string' && inline.length > 0) {
    return Buffer.from(inline.replace(DATA_URL_PATTERN, ''), 'base64');
  }

  if (input.payloadUri) {
    const { fetchContent } = await import('./fetch-content.js');

    return fetchContent(input.payloadUri, FETCH_TIMEOUT_MS);
  }

  throw new PermanentError(
    'Document has neither inline content nor a payload reference to read from',
    'OCR_NO_CONTENT',
  );
};
