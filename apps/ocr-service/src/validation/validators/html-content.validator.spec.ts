import { HtmlContentValidator } from './html-content.validator';

import type { ValidationInput } from '../base-document-validator';

const input = (text: string): ValidationInput => ({
  documentId: '00000000-0000-0000-0000-000000000001',
  documentReference: 'DOC-1',
  documentType: 'text',
  ocr: { engine: 'plain-text', text, confidence: 1, pageCount: 1 },
});

describe('HtmlContentValidator', () => {
  const validator = new HtmlContentValidator();

  const codesFor = async (text: string) =>
    (await validator.validate(input(text))).map((issue) => issue.code);

  it('accepts plain prose', async () => {
    expect(await codesFor('First line\nSecond line')).toStrictEqual([]);
  });

  it('rejects an HTML tag', async () => {
    expect(await codesFor('Hello <b>world</b>')).toStrictEqual(['HTML_CONTENT']);
  });

  it('rejects a closing tag on its own', async () => {
    expect(await codesFor('text </div> more')).toStrictEqual(['HTML_CONTENT']);
  });

  it('rejects a self-closing tag', async () => {
    expect(await codesFor('line<br/>line')).toStrictEqual(['HTML_CONTENT']);
  });

  it('rejects a doctype even without tags', async () => {
    expect(await codesFor('<!DOCTYPE html>')).toStrictEqual(['HTML_CONTENT']);
  });

  it('rejects a tag carrying attributes', async () => {
    expect(await codesFor('<a href="https://x.test">link</a>')).toStrictEqual(['HTML_CONTENT']);
  });

  it('does not reject prose that merely uses angle brackets', async () => {
    // "a < b" is arithmetic, not markup; rejecting it would fail valid documents.
    expect(await codesFor('if a < b and c > d then')).toStrictEqual([]);
  });

  it('does not reject an email address in angle brackets', async () => {
    expect(await codesFor('Contact <admin@test.com> for access')).toStrictEqual([]);
  });

  it('applies to every document type', () => {
    expect(validator.supports()).toBe(true);
  });
});
