import { ToastContainer } from 'react-toastify';

import Header from 'src/components/headers/Header';

import type { PropsWithChildren } from 'react';

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <>
      <Header />
      <div className="mx-auto w-full max-w-7xl px-6 py-8">{children}</div>
      <ToastContainer />
    </>
  );
}
