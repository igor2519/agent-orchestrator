import { PermanentError, TransientError } from '@app/messaging';

/** Fetches referenced content, classifying failures so retries are not wasted. */
export const fetchContent = async (uri: string, timeoutMs: number): Promise<Buffer> => {
  let response: Response;

  try {
    response = await fetch(uri, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new TransientError(`Could not fetch ${uri}`, 'OCR_FETCH_FAILED', error);
  }

  if (!response.ok) {
    // A 4xx will not change on retry; a 5xx might.
    const message = `Fetching ${uri} returned HTTP ${response.status}`;

    throw response.status >= 400 && response.status < 500
      ? new PermanentError(message, 'OCR_FETCH_REJECTED')
      : new TransientError(message, 'OCR_FETCH_FAILED');
  }

  return Buffer.from(await response.arrayBuffer());
};
