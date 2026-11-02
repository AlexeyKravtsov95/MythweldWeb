import type { PageMeta } from "./types";

export type LegalDocumentId = "privacy" | "terms" | "contact";

/** Plain text is escaped by Astro; no raw HTML or draft Markdown input. */
export type LegalInline =
  | string
  | {
      label: string;
      href: `/${string}` | `https://${string}` | `mailto:${string}`;
    };

export type LegalBlock =
  | { kind: "paragraph"; content: readonly LegalInline[] }
  | {
      kind: "list";
      ordered: boolean;
      items: readonly (readonly LegalInline[])[];
    };

export interface LegalSection {
  heading: string;
  blocks: readonly LegalBlock[];
}

interface LegalPageCopy {
  meta: PageMeta;
  heading: string;
  introduction: readonly LegalBlock[];
  sections: readonly LegalSection[];
}

export interface LegalDocumentCopy extends LegalPageCopy {
  /** Owner-approved ISO calendar date (YYYY-MM-DD); never defaults to today. */
  effectiveDate: string;
}

export interface LegalContactCopy extends LegalPageCopy {
  /** Owner-approved public email address; no form or backend. */
  email: string;
}

export interface LegalPagesCopy {
  privacy: LegalDocumentCopy | null;
  terms: LegalDocumentCopy | null;
  contact: LegalContactCopy | null;
}

export interface LegalCopy {
  ui: {
    contents: string;
    effectiveDate: string;
    email: string;
  };
  /** Populate only with the specific EN/RU texts approved in a separate issue. */
  pages: LegalPagesCopy;
}
