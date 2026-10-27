/**
 * Legal pages and contact of the Mythweld site (blocker B7). Every value is
 * `null` until the owner approves the document, its address and who answers
 * the contact; the footer shows only the addresses that exist.
 *
 * `legal.mythweld.com` hosts the TalentForge app documents (privacy.html,
 * terms.html, checked 2026-10-27). They describe the Android app, not this
 * site, so they are not reused here. Drafts for this site live in
 * `docs/legal-drafts/` and are not published.
 */
export interface LegalLinks {
  privacy: string | null;
  terms: string | null;
  /** A page or a `mailto:` address approved by the owner. */
  contact: string | null;
}

export const LEGAL: LegalLinks = {
  privacy: null,
  terms: null,
  contact: null,
};
