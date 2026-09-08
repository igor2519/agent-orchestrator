import { PermanentError } from '@app/messaging';

import { LinePrefixProcessor } from './line-prefix.processor';

import type { ProcessingInput } from '../base-document-processor';

const input = (text: string, documentType = 'text'): ProcessingInput => ({
  documentId: '00000000-0000-0000-0000-000000000001',
  documentReference: 'DOC-1',
  documentType,
  ocr: { engine: 'plain-text', text, confidence: 1, pageCount: 1 },
  attempt: 1,
});

describe('LinePrefixProcessor', () => {
  const processor = new LinePrefixProcessor();

  it('claims uploaded file types', () => {
    for (const type of ['text', 'pdf', 'word', 'image']) {
      expect(processor.supports(type)).toBe(true);
    }
  });

  it('leaves synthetic types to the fallback processor', () => {
    expect(processor.supports('invoice')).toBe(false);
  });

  it('prefixes every line', async () => {
    const { resultText } = await processor.process(input('one\ntwo'));

    expect(resultText).toBe('++one\n++two');
  });

  it('preserves blank lines, which are part of the document shape', async () => {
    const { resultText } = await processor.process(input('one\n\nthree'));

    expect(resultText).toBe('++one\n++\n++three');
  });

  it('normalises Windows line endings so no stray carriage returns survive', async () => {
    const { resultText } = await processor.process(input('one\r\ntwo'));

    expect(resultText).toBe('++one\n++two');
  });

  it('reports the original line count', async () => {
    const { result } = await processor.process(input('a\nb\nc'));

    expect(result.lineCount).toBe(3);
  });

  it('fails permanently on empty content rather than producing an empty file', async () => {
    await expect(processor.process(input('   \n  '))).rejects.toBeInstanceOf(PermanentError);
  });
});
