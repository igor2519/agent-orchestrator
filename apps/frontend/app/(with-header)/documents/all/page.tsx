import { DocumentsList } from 'src/components/DocumentsList';

export const metadata = {
  title: 'All documents',
};

export default function AllDocumentsPage() {
  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">All documents</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          Everything the API has stored, filterable by customer, status and submission date.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <DocumentsList />
      </div>
    </main>
  );
}
