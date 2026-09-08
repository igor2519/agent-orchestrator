import { DocumentWatcher } from 'src/components/DocumentWatcher';

export const metadata = {
  title: 'Documents',
};

export default function DocumentsPage() {
  return (
    <main>
      <header className="border-b border-stone-200 px-6 py-4">
        <h1 className="text-xl font-semibold">Document processing</h1>
        <p className="text-sm text-stone-600">
          Submissions travel API → OCR → Processing → Notification. The events below arrive as each
          service publishes them.
        </p>
      </header>
      <DocumentWatcher />
    </main>
  );
}
