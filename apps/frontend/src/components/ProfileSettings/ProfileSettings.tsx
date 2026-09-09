'use client';

import { useState } from 'react';

import { ChangeEmailModal } from '../modals/ChangeEmailModal';

import type { ProfileSettingsProps } from './types';

export default function ProfileSettings({ email }: ProfileSettingsProps) {
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState<boolean>(false);
  return (
    <div className="flex justify-center items-center gap-2 w-full ml-0">
      <button
        className="btn btn-primary "
        onClick={() => {
          setIsChangeEmailOpen((val) => !val);
        }}
        type="button"
      >
        Change email
      </button>
      <ChangeEmailModal
        email={email}
        isOpen={isChangeEmailOpen}
        onClose={() => {
          setIsChangeEmailOpen(false);
        }}
      />
    </div>
  );
}
