/**
 * The parts of a Multer upload this application relies on.
 *
 * Replaces `Express.Multer.File`, which is an *ambient global* contributed by
 * `@types/multer` and so only exists when that package happens to be discovered
 * through TypeScript's automatic `@types` walk-up. Any editor or build that
 * resolves types differently loses the name entirely, reporting an error far from
 * the real cause.
 *
 * Declaring the shape here makes it an ordinary importable type: resolution no
 * longer depends on ambient discovery, and the contract is explicit about the four
 * fields actually used. A real Multer file carries more, and satisfies this
 * structurally.
 *
 * Assumes memory storage, which is what `FileInterceptor` uses by default - disk
 * storage would provide `path` instead of `buffer`.
 */
export interface MulterFile {
  /** Form field the file arrived under. */
  fieldname: string;
  /** Client-supplied name; untrusted, and used only for display and extension checks. */
  originalname: string;
  encoding: string;
  /** Client-supplied, so corroborated against the extension before it is trusted. */
  mimetype: string;
  size: number;
  buffer: Buffer;
}
