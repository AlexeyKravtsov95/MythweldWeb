import type { LegalDocumentCopy, LegalPagesCopy } from "../../src/i18n/legal";
import type { Locale } from "../../src/i18n";

// Synthetic UI data only. Never import into src/, public/ or a built route.
export const testEmail = `${"long-test-address-".repeat(8)}@example.invalid`;
export const testUrl: `https://${string}` = `https://example.invalid/${"long-test-path-".repeat(16)}`;

function fixture(locale: Locale): LegalPagesCopy {
  const ru = locale === "ru";
  const common = {
    meta: {
      title: ru ? "Тестовый документ | Mythweld" : "Test document | Mythweld",
      description: ru
        ? "Описание тестового компонента"
        : "Test component description",
    },
    heading: ru ? "Тестовый документ" : "Test document",
    introduction: [
      { kind: "paragraph" as const, content: ["<b>Test & escape</b>"] },
    ],
    sections: [
      {
        heading: ru ? "Тестовый раздел" : "Test section",
        blocks: [
          {
            kind: "paragraph" as const,
            content: [
              (ru
                ? "Длинный тестовый абзац. "
                : "Long test paragraph. "
              ).repeat(25),
            ],
          },
          {
            kind: "paragraph" as const,
            content: [
              { label: testUrl, href: testUrl },
              " / ",
              {
                label: ru ? "Внутренняя ссылка" : "Internal link",
                href: "/terms/#legal-section-1" as const,
              },
            ],
          },
          {
            kind: "list" as const,
            ordered: false,
            items: [
              [ru ? "Первый пункт" : "First item"],
              [ru ? "Второй пункт" : "Second item"],
            ],
          },
          { kind: "list" as const, ordered: true, items: [["One"], ["Two"]] },
        ],
      },
      {
        heading: ru ? "Ещё один раздел" : "Another section",
        blocks: [{ kind: "paragraph" as const, content: ["Test end."] }],
      },
    ],
  } satisfies Omit<LegalDocumentCopy, "effectiveDate">;
  return {
    privacy: { ...common, effectiveDate: "2000-01-02" },
    terms: { ...common, effectiveDate: "2000-01-02" },
    contact: { ...common, email: testEmail },
  };
}

export const legalFixtures: Record<Locale, LegalPagesCopy> = {
  en: fixture("en"),
  ru: fixture("ru"),
};
