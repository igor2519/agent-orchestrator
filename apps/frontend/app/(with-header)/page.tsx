import { redirect } from 'next/navigation';

// Documents are the only surface this app exposes, so the root sends people
// straight there rather than showing a landing page they would click through.
export default function HomePage() {
  redirect('/documents');
}
