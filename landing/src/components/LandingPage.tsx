"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

const featureIcons = [
  "groups",
  "directions_car",
  "calendar_month",
  "payments",
  "schedule",
  "local_parking",
  "description",
  "north_east",
  "shield",
  "language",
];

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return value ? ([value] as T[]) : [];
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const language = i18n.resolvedLanguage || i18n.language || "en";

  useEffect(() => {
    const rtlLanguages = ["ur", "fa-IR"];
    document.documentElement.lang = language;
    document.documentElement.dir = rtlLanguages.includes(language) ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isMenuOpen]);

  const valueItems = toArray<string>(t("landing.value.items", { returnObjects: true }));
  const beforeItems = toArray<string>(t("landing.comparison.beforeItems", { returnObjects: true }));
  const afterItems = toArray<string>(t("landing.comparison.afterItems", { returnObjects: true }));
  const featureItems = toArray<{ title: string; description: string }>(
    t("landing.features.items", { returnObjects: true }),
  );
  const stepItems = toArray<{ title: string; description: string }>(
    t("landing.steps.items", { returnObjects: true }),
  );
  const benefitItems = toArray<string>(t("landing.benefits.items", { returnObjects: true }));
  const faqItems = toArray<{ question: string; answer: string }>(
    t("landing.faq.items", { returnObjects: true }),
  );

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <main className="landing-shell" id="top">
      <header className="landing-header">
        <div className="landing-nav">
          <a href="#top" className="brand" aria-label={t("app.name")}>
            <span className="brand-mark">EP</span>
            <span>{t("app.name")}</span>
          </a>

          <nav
            className={`nav-links ${isMenuOpen ? "is-open" : ""}`}
            aria-label={t("landing.nav.features")}
            id="primary-navigation"
          >
            <a href="#features" onClick={closeMenu}>{t("landing.nav.features")}</a>
            <a href="#how-it-works" onClick={closeMenu}>{t("landing.nav.howItWorks")}</a>
            <a href="#benefits" onClick={closeMenu}>{t("landing.nav.benefits")}</a>
            <a href="#faq" onClick={closeMenu}>{t("landing.nav.faq")}</a>
          </nav>

          <div className="nav-actions">
            <label className="language-selector" aria-label={t("app.name")}>
              <span className="material-symbols-rounded">language</span>
              <select
                value={language}
                onChange={(event) => {
                  const targetLanguage = event.target.value;
                  i18n.changeLanguage(targetLanguage);
                  setIsMenuOpen(false);
                }}
              >
                <option value="en">English</option>
                <option value="ur">اردو</option>
                <option value="ur-Latn">Roman Urdu</option>
                <option value="fa-IR">فارسی</option>
              </select>
            </label>
            <Link href="/privacy" className="text-link">{t("landing.footer.privacy")}</Link>
            <a href="#contact" className="primary-button small-button">
              {t("landing.nav.getStarted")}
            </a>
          </div>

          <button
            type="button"
            className="menu-toggle"
            aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="material-symbols-rounded">
              {isMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{t("landing.hero.eyebrow")}</p>
            <h1>{t("landing.hero.title")}</h1>
            <p className="hero-description">{t("landing.hero.description")}</p>

            <div className="hero-actions">
              <a href="#contact" className="primary-button">
                {t("landing.hero.primary")}
              </a>
              <a href="#features" className="secondary-button">
                {t("landing.hero.secondary")}
              </a>
            </div>

            <div className="trust-row">
              <span className="trust-mark material-symbols-rounded">check_circle</span>
              <span>{t("landing.value.eyebrow")}</span>
            </div>
          </div>

          <div className="hero-visual" aria-label={t("landing.hero.previewTitle")}>
            <div className="dashboard-shell">
              <div className="dashboard-head">
                <div className="window-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span>{t("landing.hero.previewTitle")}</span>
              </div>

              <div className="dashboard-body">
                <div className="dashboard-slab">
                  <div className="summary-box accent-box">
                    <span className="label">{t("landing.hero.members")}</span>
                    <strong dir="ltr">1,284</strong>
                    <small>{t("landing.hero.period")}</small>
                  </div>
                  <div className="summary-box soft-box">
                    <span className="label">{t("landing.hero.vehicles")}</span>
                    <strong dir="ltr">2,431</strong>
                    <small>{t("landing.hero.updated")}</small>
                  </div>
                </div>

                <div className="mini-grid">
                  <div className="mini-box">
                    <span className="label">{t("landing.hero.due")}</span>
                    <strong dir="ltr">Rs. 84.6k</strong>
                    <span className="mini-badge danger">{t("landing.showcase.pending")}</span>
                  </div>
                  <div className="mini-box muted-box">
                    <span className="label">{t("landing.hero.collection")}</span>
                    <strong dir="ltr">Rs. 1.42M</strong>
                    <span className="mini-badge success">{t("landing.hero.received")}</span>
                  </div>
                </div>

                <div className="activity-panel">
                  <div className="activity-head">
                    <span>{t("landing.hero.activity")}</span>
                    <em>{t("landing.hero.updated")}</em>
                  </div>
                  <ul>
                    <li>
                      <div>
                        <strong>{t("landing.hero.activityOne")}</strong>
                        <small>{t("landing.hero.received")}</small>
                      </div>
                      <time dir="ltr">09:46</time>
                    </li>
                    <li>
                      <div>
                        <strong>{t("landing.hero.activityTwo")}</strong>
                        <small>{t("landing.hero.updated")}</small>
                      </div>
                      <time dir="ltr">08:30</time>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="value-band" id="value">
        <div className="section-heading narrow-heading">
          <p className="eyebrow">{t("landing.value.eyebrow")}</p>
          <h2>{t("landing.value.title")}</h2>
        </div>
        <ul className="value-list">
          {valueItems.map((item, index) => (
            <li key={item}>
              <span className="value-index">0{index + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="comparison-section section-block">
        <div className="section-heading">
          <p className="eyebrow">{t("landing.comparison.eyebrow")}</p>
          <h2>{t("landing.comparison.title")}</h2>
        </div>
        <div className="comparison-layout">
          <article className="comparison-column before-column">
            <div className="comparison-title">
              <span className="comparison-icon material-symbols-rounded">close</span>
              <h3>{t("landing.comparison.before")}</h3>
            </div>
            <ul>
              {beforeItems.map((item) => (
                <li key={item}>
                  <span className="material-symbols-rounded">close</span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
          <div className="comparison-arrow material-symbols-rounded" aria-hidden="true">
            arrow_right_alt
          </div>
          <article className="comparison-column after-column">
            <div className="comparison-title">
              <span className="comparison-icon material-symbols-rounded">check_circle</span>
              <h3>{t("landing.comparison.after")}</h3>
            </div>
            <ul>
              {afterItems.map((item) => (
                <li key={item}>
                  <span className="material-symbols-rounded">check</span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="features-section section-block" id="features">
        <div className="section-heading section-heading-wide">
          <div>
            <p className="eyebrow">{t("landing.features.eyebrow")}</p>
            <h2>{t("landing.features.title")}</h2>
          </div>
          <p>{t("landing.features.description")}</p>
        </div>

        <div className="features-grid">
          {featureItems.map((feature, index) => (
            <article
              key={feature.title}
              className={index === 0 ? "feature-item feature-item-featured" : "feature-item"}
            >
              <div className="feature-meta">
                <span className="feature-index">0{index + 1}</span>
                <span className="material-symbols-rounded">{featureIcons[index]}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="showcase-section section-block">
        <div className="section-heading">
          <p className="eyebrow">{t("landing.showcase.eyebrow")}</p>
          <h2>{t("landing.showcase.title")}</h2>
          <p>{t("landing.showcase.description")}</p>
        </div>
        <div className="showcase-grid">
          <article className="showcase-card showcase-member">
            <div className="showcase-card-header">
              <span className="showcase-icon material-symbols-rounded">groups</span>
              <span>{t("landing.showcase.member")}</span>
              <span className="showcase-tag">{t("landing.showcase.previewLabel")}</span>
            </div>
            <div className="member-card">
              <div className="member-row">
                <span className="member-avatar">024</span>
                <div>
                  <strong>{t("landing.showcase.memberName")}</strong>
                  <small>{t("landing.hero.members")}</small>
                </div>
              </div>
              <span className="member-status">
                <span className="material-symbols-rounded">check_circle</span>
                {t("app.parkingManagement")}
              </span>
            </div>
            <div className="mini-vehicle-row">
              <span className="material-symbols-rounded">directions_car</span>
              <span>{t("landing.showcase.vehicleNumber")}</span>
              <small>{t("landing.showcase.vehicle")}</small>
            </div>
          </article>

          <article className="showcase-card showcase-dues">
            <div className="showcase-card-header">
              <span className="showcase-icon material-symbols-rounded">wallet</span>
              <span>{t("landing.showcase.dues")}</span>
              <span className="showcase-tag">{t("landing.showcase.previewLabel")}</span>
            </div>
            <div className="due-card">
              <div>
                <span>{t("landing.showcase.periodLabel")}</span>
                <strong dir="ltr">01 Oct — 31 Oct</strong>
              </div>
              <strong className="due-amount" dir="ltr">Rs. 1,500</strong>
              <span className="badge warning">
                <span className="material-symbols-rounded">schedule</span>
                {t("landing.showcase.pending")}
              </span>
            </div>
            <div className="due-card due-card-paid">
              <div>
                <span>{t("landing.showcase.periodLabel")}</span>
                <strong dir="ltr">01 Sep — 30 Sep</strong>
              </div>
              <strong className="due-amount" dir="ltr">Rs. 1,500</strong>
              <span className="badge success">
                <span className="material-symbols-rounded">check_circle</span>
                {t("landing.showcase.paid")}
              </span>
            </div>
          </article>

          <article className="showcase-card showcase-payment">
            <div className="showcase-card-header">
              <span className="showcase-icon material-symbols-rounded">payments</span>
              <span>{t("landing.showcase.payment")}</span>
              <span className="showcase-tag">{t("landing.showcase.previewLabel")}</span>
            </div>
            <div className="payment-card">
              <span>{t("landing.showcase.paymentLabel")}</span>
              <strong dir="ltr">Rs. 1,000</strong>
              <div className="payment-progress">
                <span />
              </div>
              <div className="payment-footer">
                <span>{t("landing.showcase.periodLabel")}</span>
                <span dir="ltr">Rs. 1,500</span>
              </div>
              <span className="badge success">
                <span className="material-symbols-rounded">check_circle</span>
                {t("landing.showcase.paid")}
              </span>
            </div>
          </article>
        </div>
      </section>

      <section className="steps-section section-block" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">{t("landing.steps.eyebrow")}</p>
          <h2>{t("landing.steps.title")}</h2>
        </div>

        <ol className="steps-grid">
          {stepItems.map((step, index) => (
            <li className="step-item" key={step.title}>
              <span className="step-number">0{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="benefits-section section-block" id="benefits">
        <div className="benefits-panel">
          <div className="benefits-heading">
            <p className="eyebrow eyebrow-light">{t("landing.benefits.eyebrow")}</p>
            <h2>{t("landing.benefits.title")}</h2>
          </div>
          <ul className="benefits-list">
            {benefitItems.map((benefit) => (
              <li key={benefit}>
                <span className="material-symbols-rounded">check_circle</span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="faq-section section-block" id="faq">
        <div className="faq-intro">
          <p className="eyebrow">{t("landing.faq.eyebrow")}</p>
          <h2>{t("landing.faq.title")}</h2>
        </div>
        <div className="faq-list">
          {faqItems.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>
                {item.question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-cta" id="contact">
        <div className="cta-copy">
          <p className="eyebrow">{t("app.name")}</p>
          <h2>{t("landing.cta.title")}</h2>
          <p>{t("landing.cta.description")}</p>
        </div>
        <a href="#top" className="primary-button button-light">
          {t("landing.cta.button")}
        </a>
      </section>

      <footer className="landing-footer">
        <div className="footer-main">
          <div className="footer-brand-block">
            <a href="#top" className="brand footer-brand" aria-label={t("app.name")}>
              <span className="brand-mark">EP</span>
              <span>{t("app.name")}</span>
            </a>
            <p>{t("landing.footer.description")}</p>
          </div>

          <div className="footer-links">
            <strong>{t("landing.footer.navigation")}</strong>
            <a href="#features">{t("landing.nav.features")}</a>
            <a href="#how-it-works">{t("landing.nav.howItWorks")}</a>
            <a href="#benefits">{t("landing.nav.benefits")}</a>
          </div>

          <div className="footer-links">
            <strong>{t("landing.nav.getStarted")}</strong>
            <Link href="/privacy">{t("landing.footer.privacy")}</Link>
            <Link href="/terms">{t("landing.footer.terms")}</Link>
            <a href="#faq">{t("landing.nav.faq")}</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t("landing.footer.copyright")}</span>
          <span>{t("app.parkingManagement")}</span>
        </div>
      </footer>
    </main>
  );
}
