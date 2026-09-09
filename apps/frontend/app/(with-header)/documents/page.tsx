import { DocumentsWorkspace } from 'src/components/DocumentsWorkspace';

export const metadata = {
  title: 'Documents',
};

// Single-tenant demo surface; a real deployment takes this from the session.
const CUSTOMER_ID = 'customer-alpha';

const STAGES = ['API', 'OCR', 'Processing', 'Notification'];

export default function DocumentsPage() {
  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Workspace</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          Submit a document and watch it move through the pipeline. Results are delivered over
          WebSocket, and by webhook when a callback is configured.
        </p>

        <ol className="mt-4 flex flex-wrap items-center gap-2">
          {STAGES.map((stage, index) => (
            <li className="flex items-center gap-2" key={stage}>
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 shadow-sm">
                {stage}
              </span>
              {index < STAGES.length - 1 ? (
                <span aria-hidden className="text-stone-300">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <DocumentsWorkspace customerId={CUSTOMER_ID} />
      </div>
    </main>
  );
}
