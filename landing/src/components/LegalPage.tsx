"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

export default function LegalPage({ variant }: { variant: "privacy" | "terms" }) {
  const { t } = useTranslation();

  if (variant === "privacy") {
    return (
      <main className="legal-page-shell">
        <div className="legal-wrap">
          <div className="legal-header">
            <Link href="/" className="brand">
              <span className="brand-mark">EP</span>
              <span>{t("app.name")}</span>
            </Link>
            <h1>{t("landing.legal.privacyTitle")}</h1>
          </div>
          <p className="legal-intro">{t("landing.legal.privacyIntro")}</p>

          <section>
            <h2>{t("landing.legal.privacyDataTitle")}</h2>
            <p>{t("landing.legal.privacyData")}</p>
          </section>

          <section>
            <h2>{t("landing.legal.privacyAccessTitle")}</h2>
            <p>{t("landing.legal.privacyAccess")}</p>
          </section>

          <section>
            <h2>{t("landing.legal.privacyLimitsTitle")}</h2>
            <p>{t("landing.legal.privacyLimits")}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="legal-page-shell">
      <div className="legal-wrap">
        <div className="legal-header">
          <Link href="/" className="brand">
            <span className="brand-mark">EP</span>
            <span>{t("app.name")}</span>
          </Link>
          <h1>{t("landing.legal.termsTitle")}</h1>
        </div>
        <p className="legal-intro">{t("landing.legal.termsIntro")}</p>

        <section>
          <h2>{t("landing.legal.termsUseTitle")}</h2>
          <p>{t("landing.legal.termsUse")}</p>
        </section>

        <section>
          <h2>{t("landing.legal.termsRecordsTitle")}</h2>
          <p>{t("landing.legal.termsRecords")}</p>
        </section>

        <section>
          <h2>{t("landing.legal.termsLimitsTitle")}</h2>
          <p>{t("landing.legal.termsLimits")}</p>
        </section>
      </div>
    </main>
  );
}
