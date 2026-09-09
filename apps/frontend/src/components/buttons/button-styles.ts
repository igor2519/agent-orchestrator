/**
 * Button styling as plain utilities.
 *
 * daisyUI is configured with `exclude: base`, which leaves its `btn` component
 * without the chrome it expects - `btn btn-primary` renders as bare text. These
 * constants keep every button consistent without depending on that.
 */
export const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f53a6] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1a4589] disabled:cursor-not-allowed disabled:opacity-50';

export const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50';
