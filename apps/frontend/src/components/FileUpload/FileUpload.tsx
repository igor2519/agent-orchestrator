'use client';

import { useState } from 'react';

import { PRIMARY_BUTTON } from 'src/components/buttons';

import type { ChangeEvent, FormEvent } from 'react';

interface UploadResult {
  id: string;
  status: string;
  duplicate: boolean;
  deduplicatedBy?: string;
}

interface Props {
  customerId: string;
}

/**
 * Accepted formats, mirrored from the API purely to drive the file picker and give
 * immediate feedback. The API performs the authoritative check - this is a
 * convenience, never the gate.
 */
const ACCEPTED = ['.pdf', '.txt', '.doc', '.docx'];
const MAX_BYTES = 10 * 1024 * 1024;

export function FileUpload({ customerId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [uploading, setUploading] = useState(false);

  const onSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;

    setResult(null);
    setErrors(null);
    setLocalError(null);

    if (selected && !ACCEPTED.some((ext) => selected.name.toLowerCase().endsWith(ext))) {
      setLocalError(`Only ${ACCEPTED.join(', ')} files are accepted`);
      setFile(null);

      return;
    }

    if (selected && selected.size > MAX_BYTES) {
      setLocalError('File exceeds the 10MB limit');
      setFile(null);

      return;
    }

    setFile(selected);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!file) {
      setLocalError('Choose a file first');

      return;
    }

    setUploading(true);
    setResult(null);
    setErrors(null);

    const form = new FormData();

    form.append('file', file);
    form.append('customerId', customerId);
    form.append('documentReference', file.name);

    try {
      const response = await fetch('/api/documents/upload', { method: 'POST', body: form });
      const body: unknown = await response.json();

      if (response.ok) {
        setResult(body as UploadResult);
      } else {
        const failure = body as { errors?: Record<string, string>; message?: string };

        setErrors(failure.errors ?? { file: failure.message ?? 'Upload failed' });
      }
    } catch {
      setErrors({ file: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="flex max-w-xl flex-col gap-4 p-6" onSubmit={onSubmit}>
      <div>
        <h2 className="text-lg font-semibold">Upload a document</h2>
        <p className="text-sm text-stone-600">
          PDF, TXT or Word. The file is read, checked, and every line prefixed with <code>++</code>.
          Progress appears under Live events.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">File</span>
        <input
          accept={ACCEPTED.join(',')}
          className="w-full cursor-pointer rounded-lg border border-dashed border-stone-300 bg-stone-50/60 p-3 text-sm text-stone-600 transition-colors hover:border-[#1f53a6]/40 hover:bg-stone-50 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 file:shadow-sm"
          onChange={onSelect}
          type="file"
        />
        {file ? (
          <span className="text-xs text-stone-500">
            {file.name} · {(file.size / 1024).toFixed(1)} KB
          </span>
        ) : null}
      </label>

      <button
        className={`${PRIMARY_BUTTON} self-start`}
        disabled={uploading || !file}
        type="submit"
      >
        {uploading ? 'Uploading…' : 'Upload'}
      </button>

      {localError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {localError}
        </p>
      ) : null}

      {errors ? (
        <ul className="list-inside list-disc rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {Object.entries(errors).map(([field, message]) => (
            <li key={field}>
              <strong>{field}</strong>: {message}
            </li>
          ))}
        </ul>
      ) : null}

      {result ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div>
            Accepted as <code>{result.id}</code> ({result.status})
          </div>
          {result.duplicate ? (
            <div className="mt-1 text-amber-700">
              This file was already processed — matched by {result.deduplicatedBy}. You will still
              be notified, but it is not processed twice.
            </div>
          ) : null}
          <a
            className="mt-2 inline-block underline"
            href={`/api/documents/${result.id}/result`}
            rel="noreferrer"
            target="_blank"
          >
            Download processed result
          </a>
        </div>
      ) : null}
    </form>
  );
}
