import { lazy, Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GoogleIcon from './GoogleIcon';
import LanguageSelector from './LanguageSelector';
import './LandingPage.css';

const ProductPreview = lazy(() => import('./ProductPreview'));

const featureIcons = [
  'groups',
  'directions_car',
  'calendar_month',
  'payments',
  'schedule',
  'local_parking',
  'description',
  'north_east',
  'shield',
  'language',
];

const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, '');

function LandingPage({ onChangeLanguage }) {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const language = i18n.resolvedLanguage || i18n.language || 'en';

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateMobileState = () => {
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      const touchQuery = window.matchMedia('(pointer: coarse)');
      const standaloneQuery = window.matchMedia('(display-mode: standalone)');
      const isMobile = mobileQuery.matches || touchQuery.matches;
      const isStandalone = standaloneQuery.matches || window.navigator.standalone === true;

      setIsMobileView(isMobile);
      setIsStandaloneApp(isStandalone);

      if (!isMobile || isStandalone) {
        setShowInstallPrompt(false);
      }
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);

      const isMobile = window.matchMedia('(max-width: 768px)').matches || window.matchMedia('(pointer: coarse)').matches;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

      if (isMobile && !isStandalone) {
        setShowInstallPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setShowInstallPrompt(false);
    };

    updateMobileState();
    window.addEventListener('resize', updateMobileState);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('resize', updateMobileState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    setInstallPrompt(null);
  };

  useEffect(() => {
    const description = t('landing.seoDescription');
    document.title = t('landing.seoTitle');
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index,follow');
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', t('landing.seoTitle'));
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', t('landing.seoTitle'));
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      if (!siteUrl) canonical.remove();
      else canonical.setAttribute('href', `${siteUrl}/`);
    } else if (siteUrl) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = `${siteUrl}/`;
      document.head.append(canonical);
    }

    const openGraphUrl = document.querySelector('meta[property="og:url"]');
    if (openGraphUrl) {
      if (siteUrl) openGraphUrl.setAttribute('content', `${siteUrl}/`);
      else openGraphUrl.removeAttribute('content');
    }

    const openGraphImage = document.querySelector('meta[property="og:image"]');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (siteUrl) {
      openGraphImage?.setAttribute('content', `${siteUrl}/og-image.svg`);
      twitterImage?.setAttribute('content', `${siteUrl}/og-image.svg`);
    }
  }, [language, t]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);
  const valueItems = t('landing.value.items', { returnObjects: true });
  const beforeItems = t('landing.comparison.beforeItems', { returnObjects: true });
  const afterItems = t('landing.comparison.afterItems', { returnObjects: true });
  const features = t('landing.features.items', { returnObjects: true });
  const steps = t('landing.steps.items', { returnObjects: true });
  const benefits = t('landing.benefits.items', { returnObjects: true });
  const faqs = t('landing.faq.items', { returnObjects: true });
  const revealUp = {
    hidden: { opacity: 0, y: 26 },
    visible: (index = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut', delay: index * 0.08 },
    }),
  };

  return (
    <main className="landing-page" id="landing-content">
      <header className="landing-header">
        <div className="landing-nav-wrap">
          <Link className="landing-brand" to="/" aria-label={t('app.name')}>
            <img src="/favicon.svg" alt="" width="42" height="42" />
            <span>{t('app.name')}</span>
          </Link>
          <nav className={`landing-nav-links${isMenuOpen ? ' is-open' : ''}`} aria-label={t('nav.main')} id="landing-navigation">
            <a href="#features" onClick={closeMenu}>{t('landing.nav.features')}</a>
            <a href="#how-it-works" onClick={closeMenu}>{t('landing.nav.howItWorks')}</a>
            <a href="#benefits" onClick={closeMenu}>{t('landing.nav.benefits')}</a>
            <a href="#faq" onClick={closeMenu}>{t('landing.nav.faq')}</a>
            <Link className="landing-mobile-login" to="/login" onClick={closeMenu}>{t('landing.nav.login')}</Link>
            <Link className="landing-mobile-cta" to="/signup" onClick={closeMenu}>{t('landing.nav.getStarted')}</Link>
          </nav>
          <div className="landing-nav-actions">
            <LanguageSelector value={language} onChange={onChangeLanguage} />
            <Link className="landing-login-link" to="/login">{t('landing.nav.login')}</Link>
            <Link className="landing-nav-cta" to="/signup">{t('landing.nav.getStarted')}<GoogleIcon name="north_east" size={16} /></Link>
          </div>
          <button
            type="button"
            className="landing-menu-button"
            aria-label={isMenuOpen ? t('landing.nav.closeMenu') : t('landing.nav.openMenu')}
            aria-expanded={isMenuOpen}
            aria-controls="landing-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <GoogleIcon name="close" size={21} /> : <GoogleIcon name="menu" size={21} />}
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <motion.div
            className="hero-copy"
            initial="hidden"
            animate="visible"
            variants={revealUp}
            custom={0}
          >
            <p className="landing-eyebrow"><span className="eyebrow-mark" />{t('landing.hero.eyebrow')}</p>
            <h1>{t('landing.hero.title')}</h1>
            <p className="hero-description">{t('landing.hero.description')}</p>
            <div className="hero-actions">
              <Link className="button-primary" to="/signup">{t('landing.hero.primary')}<GoogleIcon name="arrow_right_alt" size={18} /></Link>
              <a className="button-text" href="#features">{t('landing.hero.secondary')}<GoogleIcon name="keyboard_arrow_down" size={16} /></a>
            </div>
            <div className="hero-proof"><GoogleIcon name="shield" size={17} /><span>{t('landing.value.eyebrow')}</span></div>
          </motion.div>
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, x: 30, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.12 }}
          >
            <div className="hero-visual-orbit" aria-hidden="true" />
            <Suspense fallback={<div className="product-preview product-preview-loading" aria-live="polite"><div className="preview-window-bar"><div className="preview-window-dots" aria-hidden="true"><i /><i /><i /></div><span>{t('landing.hero.previewTitle')}</span></div><div className="preview-content"><div className="preview-placeholder" /></div></div>}>
              <ProductPreview t={t} />
            </Suspense>
            
          </motion.div>
        </div>
        <a className="hero-scroll-cue" href="#value" aria-label={t('landing.nav.features')}><span /><GoogleIcon name="keyboard_arrow_down" size={15} /></a>
      </section>

      <section className="value-band" id="value">
        <div className="value-band-heading">
          <p className="landing-eyebrow">{t('landing.value.eyebrow')}</p>
          <h2>{t('landing.value.title')}</h2>
        </div>
        <ul className="value-list">
          {valueItems.map((item, index) => (
            <li key={item}><span className="value-index">0{index + 1}</span><span>{item}</span></li>
          ))}
        </ul>
      </section>

      <section className="comparison-section landing-section">
        <div className="section-heading">
          <p className="landing-eyebrow">{t('landing.comparison.eyebrow')}</p>
          <h2>{t('landing.comparison.title')}</h2>
        </div>
        <div className="comparison-layout">
          <article className="comparison-column comparison-before">
            <div className="comparison-heading"><span className="comparison-icon"><GoogleIcon name="cancel" size={20} /></span><h3>{t('landing.comparison.before')}</h3></div>
            <ul>
              {beforeItems.map((item) => <li key={item}><GoogleIcon name="close" size={16} />{item}</li>)}
            </ul>
          </article>
          <div className="comparison-connector" aria-hidden="true"><GoogleIcon name="arrow_right_alt" size={19} /></div>
          <article className="comparison-column comparison-after">
            <div className="comparison-heading"><span className="comparison-icon"><GoogleIcon name="check_circle" size={20} /></span><h3>{t('landing.comparison.after')}</h3></div>
            <ul>
              {afterItems.map((item) => <li key={item}><GoogleIcon name="check" size={16} />{item}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <section className="features-section landing-section" id="features">
        <div className="section-heading section-heading-wide">
          <div><p className="landing-eyebrow">{t('landing.features.eyebrow')}</p><h2>{t('landing.features.title')}</h2></div>
          <p>{t('landing.features.description')}</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <motion.article
                className="feature-item"
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.08 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                <div className="feature-item-top"><span className="feature-number">0{index + 1}</span><GoogleIcon name={Icon} size={20} /></div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="showcase-section landing-section">
        <div className="section-heading">
          <p className="landing-eyebrow">{t('landing.showcase.eyebrow')}</p>
          <h2>{t('landing.showcase.title')}</h2>
          <p>{t('landing.showcase.description')}</p>
        </div>
        <div className="showcase-grid">
          <article className="showcase-card showcase-member">
            <div className="showcase-card-heading"><span className="showcase-icon"><GoogleIcon name="groups" size={18} /></span><span>{t('landing.showcase.member')}</span><span className="showcase-demo">{t('landing.showcase.previewLabel')}</span></div>
            <div className="member-mockup">
              <span className="member-avatar">024</span>
              <div><strong>{t('landing.showcase.memberName')}</strong><small>{t('landing.hero.members')}</small></div>
              <span className="member-active"><GoogleIcon name="check_circle" size={14} />{t('app.active')}</span>
            </div>
            <div className="vehicle-mockup"><GoogleIcon name="directions_car" size={17} /><span>{t('landing.showcase.vehicleNumber')}</span><small>{t('landing.showcase.vehicle')}</small></div>
            <div className="showcase-caption"><strong>{t('landing.showcase.member')}</strong><p>{features[0].description}</p></div>
          </article>
          <article className="showcase-card showcase-dues">
            <div className="showcase-card-heading"><span className="showcase-icon showcase-icon-amber"><GoogleIcon name="wallet" size={18} /></span><span>{t('landing.showcase.dues')}</span><span className="showcase-demo">{t('landing.showcase.previewLabel')}</span></div>
            <div className="due-mockup">
              <div><span>{t('landing.showcase.periodLabel')}</span><strong dir="ltr">01 Oct — 31 Oct</strong></div>
              <strong className="due-mockup-amount" dir="ltr">Rs. 1,500</strong>
              <span className="mock-status mock-status-due"><GoogleIcon name="schedule" size={13} />{t('landing.showcase.pending')}</span>
            </div>
            <div className="due-mockup due-mockup-paid">
              <div><span>{t('landing.showcase.periodLabel')}</span><strong dir="ltr">01 Sep — 30 Sep</strong></div>
              <strong className="due-mockup-amount" dir="ltr">Rs. 1,500</strong>
              <span className="mock-status"><GoogleIcon name="check_circle" size={13} />{t('landing.showcase.paid')}</span>
            </div>
            <div className="showcase-caption"><strong>{t('landing.showcase.dues')}</strong><p>{features[4].description}</p></div>
          </article>
          <article className="showcase-card showcase-payment">
            <div className="showcase-card-heading"><span className="showcase-icon"><GoogleIcon name="payments" size={18} /></span><span>{t('landing.showcase.payment')}</span><span className="showcase-demo">{t('landing.showcase.previewLabel')}</span></div>
            <div className="payment-mockup">
              <span>{t('landing.showcase.paymentLabel')}</span>
              <strong dir="ltr">Rs. 1,000</strong>
              <div className="payment-meter"><span /></div>
              <div className="payment-mockup-footer"><span>{t('landing.showcase.periodLabel')}</span><span dir="ltr">Rs. 1,500</span></div>
              <span className="mock-status"><GoogleIcon name="check_circle" size={13} />{t('landing.showcase.paid')}</span>
            </div>
            <div className="showcase-caption"><strong>{t('landing.showcase.payment')}</strong><p>{features[3].description}</p></div>
          </article>
        </div>
      </section>

      <section className="steps-section landing-section" id="how-it-works">
        <div className="section-heading">
          <p className="landing-eyebrow">{t('landing.steps.eyebrow')}</p>
          <h2>{t('landing.steps.title')}</h2>
        </div>
        <ol className="steps-grid">
          {steps.map((step, index) => (
            <li className="step-item" key={step.title}>
              <span className="step-number">0{index + 1}</span>
              <div><h3>{step.title}</h3><p>{step.description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="benefits-section landing-section" id="benefits">
        <div className="benefits-panel">
          <div className="benefits-heading"><p className="landing-eyebrow">{t('landing.benefits.eyebrow')}</p><h2>{t('landing.benefits.title')}</h2></div>
          <ul className="benefits-list">
            {benefits.map((benefit) => <li key={benefit}><GoogleIcon name="check_circle" size={17} />{benefit}</li>)}
          </ul>
          <div className="benefits-mark" aria-hidden="true"><img src="/favicon.svg" alt="" /></div>
        </div>
      </section>

      <section className="faq-section landing-section" id="faq">
        <div className="faq-intro">
          <p className="landing-eyebrow"><GoogleIcon name="help" size={15} />{t('landing.faq.eyebrow')}</p>
          <h2>{t('landing.faq.title')}</h2>
        </div>
        <div className="faq-list">
          {faqs.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}<span aria-hidden="true">+</span></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {(isMobileView && !isStandaloneApp) || installPrompt ? (
        <section className="mobile-install-section">
          <div className="mobile-install-card">
            <div className="mobile-install-copy">
              <p className="landing-eyebrow"><GoogleIcon name="download" size={15} />Install app</p>
              <h2>Install Easy Parking on your Android</h2>
              <p>Open the browser menu and add this app to your home screen for faster access and a native app experience.</p>
            </div>
            <div className="mobile-install-steps" aria-label="Install app steps">
              <div className="install-step"><span>1</span><p>Tap the browser menu</p></div>
              <div className="install-step"><span>2</span><p>Select “Install app” or “Add to Home screen”</p></div>
              <div className="install-step"><span>3</span><p>Tap “Install” and use it like a normal app</p></div>
            </div>
            <button
              type="button"
              className="button-primary mobile-install-button"
              onClick={handleInstallClick}
              disabled={!installPrompt}
            >
              {installPrompt ? 'Install app now' : 'Install option not available'}
            </button>
          </div>
        </section>
      ) : null}

      <section className="landing-cta">
        <div className="landing-cta-copy"><p className="landing-eyebrow">{t('app.name')}</p><h2>{t('landing.cta.title')}</h2><p>{t('landing.cta.description')}</p></div>
        <Link className="button-primary button-primary-light" to="/signup">{t('landing.cta.button')}<GoogleIcon name="arrow_right_alt" size={18} /></Link>
      </section>

      <footer className="landing-footer">
        <div className="footer-main">
          <div className="footer-brand-block">
            <Link className="landing-brand landing-brand-footer" to="/">
              <img src="/favicon.svg" alt="" width="38" height="38" />
              <span>{t('app.name')}</span>
            </Link>
            <p>{t('landing.footer.description')}</p>
          </div>
          <div className="footer-link-group">
            <strong>{t('landing.footer.navigation')}</strong>
            <a href="#features">{t('landing.nav.features')}</a>
            <a href="#how-it-works">{t('landing.nav.howItWorks')}</a>
            <a href="#benefits">{t('landing.nav.benefits')}</a>
          </div>
          <div className="footer-link-group">
            <strong>{t('landing.nav.getStarted')}</strong>
            <Link to="/login">{t('landing.footer.login')}</Link>
            <Link to="/signup">{t('landing.nav.getStarted')}</Link>
            <Link to="/privacy-policy">{t('landing.footer.privacy')}</Link>
            <Link to="/terms">{t('landing.footer.terms')}</Link>
          </div>
        </div>
        <div className="footer-bottom"><span>{t('landing.footer.copyright')}</span><span>{t('app.parkingManagement')}</span></div>
      </footer>

      {showInstallPrompt && (
        <div className="pwa-install-banner" role="dialog" aria-live="polite" aria-label={t('landing.nav.getStarted')}>
          <div className="pwa-install-banner-card">
            <div>
              <p className="pwa-install-kicker">{t('app.name')}</p>
              <strong>{t('landing.nav.getStarted')}</strong>
            </div>
            <div className="pwa-install-actions">
              <button type="button" className="pwa-install-button" onClick={handleInstallClick}>
                Install
              </button>
              <button type="button" className="pwa-install-dismiss" onClick={() => setShowInstallPrompt(false)} aria-label="Dismiss install prompt">
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function LandingLegalPage({ page }) {
  const { t } = useTranslation();
  const isPrivacy = page === 'privacy';
  const sections = isPrivacy
    ? ['privacyData', 'privacyAccess', 'privacyLimits']
    : ['termsUse', 'termsRecords', 'termsLimits'];
  const titleKey = isPrivacy ? 'privacyTitle' : 'termsTitle';

  useEffect(() => {
    document.title = `${t(`landing.legal.${titleKey}`)} | ${t('app.name')}`;
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex,nofollow');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t(`landing.legal.${titleKey}`));
  }, [t, titleKey]);

  return (
    <main className="landing-legal-page">
      <header className="landing-header">
        <div className="landing-nav-wrap">
          <Link className="landing-brand" to="/">
            <img src="/favicon.svg" alt="" width="42" height="42" />
            <span>{t('app.name')}</span>
          </Link>
          <Link className="landing-nav-cta" to="/login">{t('landing.nav.login')}<GoogleIcon name="north_east" size={16} /></Link>
        </div>
      </header>
      <article className="legal-content">
        <Link to="/" className="legal-back"><GoogleIcon name="arrow_right_alt" size={16} />{t('app.name')}</Link>
        <p className="landing-eyebrow">{t('app.parkingManagement')}</p>
        <h1>{t(`landing.legal.${titleKey}`)}</h1>
        <p className="legal-intro">{t(`landing.legal.${isPrivacy ? 'privacyIntro' : 'termsIntro'}`)}</p>
        {sections.map((section) => (
          <section key={section}>
            <h2>{t(`landing.legal.${section}Title`)}</h2>
            <p>{t(`landing.legal.${section}`)}</p>
          </section>
        ))}
        <Link className="button-primary legal-home-link" to="/">{t('landing.nav.getStarted')}<GoogleIcon name="arrow_right_alt" size={18} /></Link>
      </article>
      <footer className="legal-footer"><span>{t('landing.footer.copyright')}</span><Link to="/">{t('app.name')}</Link></footer>
    </main>
  );
}

export { LandingLegalPage };
export default LandingPage;
