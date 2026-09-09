'use client';

import { useState } from 'react';

import { DocumentWatcher } from 'src/components/DocumentWatcher';
import { FileUpload } from 'src/components/FileUpload';
import { WebhookSettings } from 'src/components/WebhookSettings';

const TABS = [
  { id: 'upload', label: 'Upload' },
  { id: 'settings', label: 'Webhook settings' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface Props {
  customerId: string;
}

/**
 * Upload and settings, with the live event feed always visible.
 *
 * The feed sits outside the tabs on purpose: a document keeps progressing while a
 * customer edits their settings, and hiding that behind a tab would make the system
 * look idle when it is not.
 */
export function DocumentsWorkspace({ customerId }: Props) {
  const [tab, setTab] = useState<TabId>('upload');

  return (
    <div className="flex flex-col lg:flex-row">
      <section className="w-full lg:w-1/2">
        <div
          className="flex gap-1 border-b border-stone-200 bg-stone-50/60 px-5 py-2"
          role="tablist"
        >
          {TABS.map((option) => (
            <button
              aria-selected={tab === option.id}
              className={`rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
                tab === option.id
                  ? 'bg-white font-medium text-[#1f53a6] shadow-sm ring-1 ring-stone-200'
                  : 'text-stone-600 hover:bg-white/70 hover:text-stone-900'
              }`}
              key={option.id}
              onClick={() => setTab(option.id)}
              role="tab"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        {tab === 'upload' ? (
          <FileUpload customerId={customerId} />
        ) : (
          <WebhookSettings customerId={customerId} />
        )}
      </section>

      <section className="w-full border-t border-stone-200 bg-stone-50/30 lg:w-1/2 lg:border-l lg:border-t-0">
        <DocumentWatcher />
      </section>
    </div>
  );
}
