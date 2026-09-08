import { DocumentsWorkspace } from 'src/components/DocumentsWorkspace';

export const metadata = {
  title: 'Documents',
};

// Single-tenant demo surface; a real deployment takes this from the session.
const CUSTOMER_ID = 'customer-alpha';

export default function DocumentsPage() {
  return (
    <main>
      <header className="border-b border-stone-200 px-6 py-4">
        <h1 className="text-xl font-semibold">Document processing</h1>
        <p className="text-sm text-stone-600">
          Uploads travel API → OCR → Processing → Notification. Results are delivered over
          WebSocket, and by webhook when configured.
        </p>
      </header>
      <DocumentsWorkspace customerId={CUSTOMER_ID} />
    </main>
  );
}
