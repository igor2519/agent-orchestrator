// Next.js 15+ passes `params` and `searchParams` as promises, so pages must
// await them before use.
export interface PageProps<TSearchParams = never, TParams = never> {
  params: Promise<TParams>;
  searchParams: Promise<TSearchParams>;
}
