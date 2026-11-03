/**
 * Legal routes of this site. Issue #34 prepares Privacy for owner review;
 * Terms and Contact remain absent. Merge and publication are owner decisions.
 * The footer shows only addresses backed by existing pages.
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
  privacy: "/privacy/",
  terms: null,
  contact: null,
};
