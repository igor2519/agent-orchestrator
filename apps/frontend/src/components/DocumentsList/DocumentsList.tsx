'use client';

import { useEffect, useState } from 'react';

import type { Document, DocumentStatus } from 'api-client';

const STATUSES: DocumentStatus[] = ['RECEIVED', 'VALIDATED', 'PROCESSING', 'COMPLETED', 'FAILED'];

const STATUS_STYLES: Record<DocumentStatus, { badge: string; dot: string }> = {
  RECEIVED: { badge: 'bg-stone-100 text-stone-700 ring-stone-200', dot: 'bg-stone-400' },
  VALIDATED: { badge: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
  PROCESSING: { badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  COMPLETED: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  FAILED: { badge: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
};

const FIELD =
  'rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm shadow-sm transition-colors hover:border-stone-400';
const LABEL = 'mb-1 text-xs font-medium uppercase tracking-wide text-stone-500';

const PAGE_SIZE = 20;

interface Filters {
  customerId: string;
  status: string;
  submittedFrom: string;
  submittedTo: string;
}

const EMPTY_FILTERS: Filters = {
  customerId: '',
  status: '',
  submittedFrom: '',
  submittedTo: '',
};

const formatBytes = (bytes: number | null | undefined): string => {
  if (typeof bytes !== 'number') {
    return '—';
  }

  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} kB`;
};

const formatWhen = (iso: string): string => new Date(iso).toLocaleString();

/**
 * Every document the API has stored, not just the ones submitted in this session.
 *
 * The live feed on the workspace page only shows events that arrived while the tab
 * was open; this reads the persisted rows, so it survives a reload and shows work
 * submitted by other clients too.
 */
export function DocumentsList() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [offset, setOffset] = useState(0);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });

      // Blank inputs must not become `?status=`, which the API would reject.
      for (const key of Object.keys(applied) as (keyof Filters)[]) {
        const value = applied[key];

        if (value) {
          query.set(key, value);
        }
      }

      try {
        const response = await fetch(`/api/documents?${query.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          // Prefer whatever the API or the proxy explained; the bare status code
          // tells a reader nothing about what to do next.
          const detail = (await response.json().catch(() => null)) as { message?: string } | null;

          throw new Error(detail?.message ?? `Request failed with ${response.status}`);
        }

        const body = (await response.json()) as { data: Document[]; total: number };

        setDocuments(body.data);
        setTotal(body.total);
        setError(null);
      } catch (cause) {
        // An aborted request is a superseded one, not a failure to report.
        if (controller.signal.aborted) {
          return;
        }

        setError(cause instanceof Error ? cause.message : 'Could not load documents');
        setDocuments([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => controller.abort();
  }, [applied, offset]);

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setOffset(0);
    setApplied(filters);
  };

  const onReset = () => {
    setLoading(true);
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setOffset(0);
  };

  const shown = documents.length;
  const rangeStart = total === 0 ? 0 : offset + 1;

  return (
    <div>
      <form
        className="flex flex-wrap items-end gap-3 border-b border-stone-200 bg-stone-50/60 px-5 py-4"
        onSubmit={onSearch}
      >
        <label className="flex flex-col text-sm">
          <span className={LABEL}>Customer</span>
          <input
            className={FIELD}
            onChange={(event) => setFilters({ ...filters, customerId: event.target.value })}
            placeholder="customer-alpha"
            value={filters.customerId}
          />
        </label>

        <label className="flex flex-col text-sm">
          <span className={LABEL}>Status</span>
          <select
            className={FIELD}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            value={filters.status}
          >
            <option value="">Any</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          <span className={LABEL}>Submitted from</span>
          <input
            className={FIELD}
            onChange={(event) => setFilters({ ...filters, submittedFrom: event.target.value })}
            type="date"
            value={filters.submittedFrom}
          />
        </label>

        <label className="flex flex-col text-sm">
          <span className={LABEL}>Submitted to</span>
          <input
            className={FIELD}
            onChange={(event) => setFilters({ ...filters, submittedTo: event.target.value })}
            type="date"
            value={filters.submittedTo}
          />
        </label>

        <button
          className="rounded-lg bg-[#1f53a6] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1a4589] disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          Search
        </button>
        <button
          className="rounded-lg border border-stone-300 bg-white px-4 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </form>

      {error ? (
        <div className="m-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <span aria-hidden className="mt-0.5 text-red-500">
            ⚠
          </span>
          <div>
            <p className="text-sm font-medium text-red-900">Could not load documents</p>
            <p className="mt-0.5 text-sm text-red-700">{error}</p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2 p-5" role="status">
          <span className="sr-only">Loading documents</span>
          {Array.from({ length: 5 }, (_, index) => (
            <div className="h-11 animate-pulse rounded-lg bg-stone-100" key={index} />
          ))}
        </div>
      ) : null}

      {!loading && !error && shown === 0 ? (
        <div className="px-5 py-16 text-center">
          <p className="text-sm font-medium text-stone-700">No documents match</p>
          <p className="mt-1 text-sm text-stone-500">
            Adjust the filters, or upload one from the workspace.
          </p>
        </div>
      ) : null}

      {shown > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="py-2.5 pl-5 pr-4 font-medium">Reference</th>
                <th className="py-2.5 pr-4 font-medium">Type</th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 pr-4 font-medium">Customer</th>
                <th className="py-2.5 pr-4 text-right font-medium">Size</th>
                <th className="py-2.5 pr-4 text-right font-medium">Attempts</th>
                <th className="py-2.5 pr-4 font-medium">Notification</th>
                <th className="py-2.5 pr-4 font-medium">Submitted</th>
                <th className="py-2.5 pr-5 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr
                  className="border-t border-stone-100 align-top transition-colors hover:bg-stone-50/70"
                  key={document.id}
                >
                  <td className="py-3 pl-5 pr-4">
                    <div className="font-medium text-stone-900">{document.documentReference}</div>
                    <div className="mt-0.5 font-mono text-xs text-stone-400">{document.id}</div>
                  </td>
                  <td className="py-3 pr-4 text-stone-700">{document.documentType}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[document.status].badge}`}
                    >
                      <span
                        aria-hidden
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[document.status].dot}`}
                      />
                      {document.status}
                    </span>
                    {document.errorMessage ? (
                      <div className="mt-1.5 max-w-[22rem] text-xs leading-relaxed text-red-600">
                        {document.errorMessage}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-stone-700">
                    {document.customerId}
                  </td>
                  <td className="py-3 pr-4 text-right whitespace-nowrap tabular-nums text-stone-700">
                    {formatBytes(document.fileSizeBytes)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-stone-700">
                    {document.attempts}
                  </td>
                  <td className="py-3 pr-4 text-stone-700">
                    {document.notificationStatus ?? '—'}
                    {document.notificationAttempts > 0 ? (
                      <span className="text-stone-500"> ({document.notificationAttempts})</span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-stone-600">
                    {formatWhen(document.createdAt)}
                  </td>
                  <td className="py-3 pr-5">
                    {document.status === 'COMPLETED' ? (
                      <a
                        className="font-medium text-[#1f53a6] no-underline hover:underline"
                        href={`/api/documents/${document.id}/result`}
                      >
                        Download
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-stone-200 bg-stone-50/60 px-5 py-3 text-sm">
        <button
          className="rounded-lg border border-stone-300 bg-white px-3 py-1 font-medium shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-white"
          disabled={offset === 0 || loading}
          onClick={() => {
            setLoading(true);
            setOffset(Math.max(0, offset - PAGE_SIZE));
          }}
          type="button"
        >
          Previous
        </button>
        <span className="tabular-nums text-stone-600">
          {rangeStart}–{offset + shown} of {total}
        </span>
        <button
          className="rounded-lg border border-stone-300 bg-white px-3 py-1 font-medium shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-white"
          disabled={offset + shown >= total || loading}
          onClick={() => {
            setLoading(true);
            setOffset(offset + PAGE_SIZE);
          }}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
