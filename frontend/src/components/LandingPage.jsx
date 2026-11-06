import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GoogleIcon from './GoogleIcon';
import '../landing.css';
import './LandingPage.css';

const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, '');
const contactEmail = 'hello@easyparking.pk';
const currentYear = new Date().getFullYear();

const roles = [
  {
    title: 'The owner behind the counter',
    body:
      'You know most members by their vehicle. The register is for the rest of it: who paid half in August, whose bike is still on last year’s rate, and which car left without clearing September.',
  },
  {
    title: 'The manager on the gate',
    body:
      'Enters a walk-in, marks the exit, records a Cash or Easypaisa payment before the shift ends. Corrections go to the owner for approval, so the day’s cash stays checkable.',
  },
  {
    title: 'Whoever keeps the books',
    body:
      'Wants October’s collections, the outstanding dues and the walk-in total in one spreadsheet — not a shoebox of slips and three WhatsApp threads.',
  },
];

const features = [
  {
    title: 'Member ledger',
    body:
      'One record per member: contact details, notes, and every vehicle they park — each vehicle carrying its own monthly rate, start date and billing history.',
  },
  {
    title: 'Monthly dues, one per period',
    body:
      'A due stores its billing period, due date, amount and balance. Anything unpaid stays visible on the member’s ledger instead of quietly rolling into a new month.',
  },
  {
    title: 'Walk-ins priced by vehicle type',
    body:
      'A rickshaw at Rs. 50, a motorcycle at Rs. 40, a car at Rs. 100, a water tanker at Rs. 300 — each vehicle type draws its own rate card instead of one flat fee.',
  },
  {
    title: 'Part payments and allocation',
    body:
      'Cash, Easypaisa or JazzCash. A payment posts against the oldest open due first, unless you set the order yourself because the member is paying a specific month.',
  },
  {
    title: 'Reports you can hand over',
    body:
      'Pending dues, payment history, daily parking and per-member statements, each exportable to CSV at any point in the month.',
  },
];

const plans = [
  {
    name: 'Free',
    note: 'One lot, while you try it',
    amount: 'Rs. 0',
    unit: 'no card, no expiry date',
    included: [
      'One lot, up to 25 vehicles',
      'Member ledger, monthly dues, walk-ins',
      'One Owner login',
      'CSV export',
    ],
    cta: 'Start free',
    to: '/signup',
  },
  {
    name: 'Standard',
    note: 'The daily working plan',
    amount: 'Rs. 2,500',
    unit: 'per lot, per month',
    included: [
      'Unlimited vehicles and members',
      'Owner and Manager seats',
      'Part payments and allocations',
      'Correction approvals and audit trail',
      'Every report, CSV export',
    ],
    cta: 'Start free',
    to: '/signup',
  },
  {
    name: 'Chains',
    note: 'Five lots or more',
    amount: 'Call us',
    unit: 'priced on lot count',
    included: [
      'Several lots under one owner',
      'Import of your existing register',
      'Invoicing on PO, annual terms',
      'A named person to call',
    ],
    cta: 'Book a call',
    href: `mailto:${contactEmail}?subject=EasyParking%20for%20multiple%20lots`,
  },
];

const faqs = [
  {
    q: 'When is a monthly bill raised?',
    a: 'A due is created per vehicle, per billing period, from that vehicle’s subscription — carrying the period start and end, the due date, the amount and the balance. Nothing is generated behind your back: the current period’s due is raised when you raise it, so a vehicle that has left never gets an invoice.',
  },
  {
    q: 'A member pays half now and half next month. What does the ledger show?',
    a: 'Two separate things: the part-paid due with its remaining balance, and the next period’s due alongside it. The payment record shows which rupees went to which month, so “I already paid that” can be answered by opening the member, not by memory.',
  },
  {
    q: 'Can one member hold two vehicles at different rates?',
    a: 'Yes. The subscription sits on the vehicle, not on the member. A car at Rs. 1,500 and a motorcycle at Rs. 600 are two subscriptions under one member record, with separate dues, separate due dates and one combined balance.',
  },
  {
    q: 'Which languages does the interface support?',
    a: 'English, Urdu, Roman Urdu and Iranian Persian. Urdu and Persian switch the layout to right-to-left, and each account remembers the language it was set to last.',
  },
  {
    q: 'Can I get my records out?',
    a: 'Every report exports to CSV — pending dues, payment history, daily parking and member statements. Take the files with you at any time; nothing is held in a format that only EasyParking can read.',
  },
  {
    q: 'What if a manager records the wrong payment?',
    a: 'Managers request a correction on a recorded payment. The Owner approves or rejects it, and the change is written to the audit log with who changed what and when — so the cash figure and the history stay honest.',
  },
];

const ledgerRows = [
  { id: '024', name: 'Imran Qureshi', plate: 'QTA 2048', type: 'Car', billed: '1,500', paid: '1,500', balance: '—', state: 'paid', label: 'Paid' },
  { id: '031', name: 'Sana Malik', plate: 'QTA 1180', type: 'Car', billed: '1,500', paid: '—', balance: '1,500', state: 'due', label: 'Due' },
  { id: '018', name: 'Naeem Bhatti', plate: 'LEB 7721', type: 'Motorcycle', billed: '600', paid: '300', balance: '300', state: 'part', label: 'Part paid' },
  { id: '009', name: 'Rafiq & Sons', plate: 'JZ 4477', type: 'Water tanker', billed: '4,000', paid: '2,000', balance: '2,000', state: 'part', label: 'Part paid' },
  { id: '012', name: 'Adnan Shah', plate: 'QTA 0932', type: 'Rickshaw', billed: '800', paid: '800', balance: '—', state: 'paid', label: 'Paid' },
];

const railItems = ['Overview', 'Members', 'Monthly dues', 'Daily parking', 'Payments', 'Reports'];

function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const description =
      'EasyParking keeps monthly members, walk-in parking, dues and payments in one ledger for parking lots in Pakistan. Free for one lot up to 25 vehicles.';
    document.title = 'EasyParking — one ledger for your parking lot';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index,follow');
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'EasyParking — one ledger for your parking lot');
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', 'EasyParking — one ledger for your parking lot');
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
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncView = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      const mobile = window.matchMedia('(max-width: 900px)').matches || window.matchMedia('(pointer: coarse)').matches;
      setIsStandalone(standalone);
      if (mobile && !standalone) setShowInstall(true);
      else setShowInstall(false);
    };

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowInstall(false);
    };

    syncView();
    window.addEventListener('resize', syncView);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('resize', syncView);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMenuOpen]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setShowInstall(false);
    setInstallPrompt(null);
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <main className="landing-v2" id="landing-content" lang="en" dir="ltr">
      <a className="v2-skip" href="#v2-start">
        Skip to content
      </a>

      <header className="v2-header">
        <div className="v2-header-inner">
          <Link className="v2-brand" to="/" aria-label="EasyParking — home">
            <img className="v2-mark" src="/favicon.svg" width="30" height="30" alt="" />
            <span className="v2-brand-word">EasyParking</span>
          </Link>

          <nav className="v2-nav" aria-label="Sections">
            <a href="#product">What it does</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="v2-header-actions">
            <Link className="v2-login" to="/login">
              Log in
            </Link>
            <Link className="v2-btn v2-btn--solid v2-btn--small" to="/signup">
              Start free
            </Link>
            <button
              type="button"
              className="v2-menu-btn"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls="v2-mobile-nav"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span />
            </button>
          </div>

          {isMenuOpen && (
            <div className="v2-mobile-nav" id="v2-mobile-nav">
              <a href="#product" onClick={closeMenu}>
                What it does
              </a>
              <a href="#pricing" onClick={closeMenu}>
                Pricing
              </a>
              <a href="#faq" onClick={closeMenu}>
                FAQ
              </a>
              <Link to="/login" onClick={closeMenu}>
                Log in
              </Link>
              <Link className="v2-mobile-cta" to="/signup" onClick={closeMenu}>
                Start free
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="v2-shell" id="v2-start">
        <section className="v2-hero">
          <p className="v2-kicker">Parking management · Pakistan</p>
          <h1>
            Every vehicle in your lot.
            <span>Every rupee on the books.</span>
          </h1>

          <div className="v2-hero-base">
            <p className="v2-lede">
              EasyParking is the register behind the counter: monthly members, walk-in parking and
              unpaid dues, kept one row per vehicle and one line per rupee.
            </p>

            <div className="v2-cta-col">
              <Link className="v2-btn v2-btn--solid" to="/signup">
                Start free
              </Link>
              <a className="v2-btn v2-btn--ghost" href="#pricing">
                See pricing
              </a>
              <p className="v2-micro">Free for one lot, up to 25 vehicles. No card.</p>
            </div>

            <aside className="v2-note">
              <p className="v2-label">How billing works</p>
              <p className="v2-note-body">
                Each vehicle carries its own monthly rate. A due is raised per billing period and
                stays on the member’s ledger until it clears — part payments leave a balance rather
                than closing the month.
              </p>
            </aside>
          </div>
        </section>

        <figure className="v2-figure">
          <div className="v2-fig-caption">
            <span>
              <b>Fig. 1</b> — Monthly dues · October 2026
            </span>
            <span>Example records · not live data</span>
          </div>

          <div className="v2-screen">
            <div className="v2-screen-bar">
              <div className="v2-screen-bar-left">
                <b>EasyParking</b>
                <span className="v2-slash">/</span>
                <span>Monthly dues</span>
              </div>
              <span className="v2-screen-bar-right">Lot 01 · 40 spaces</span>
            </div>

            <div className="v2-screen-body">
              <aside className="v2-rail" aria-hidden="true">
                <p className="v2-rail-title">Workspace</p>
                <ul>
                  {railItems.map((item) => (
                    <li key={item} data-active={item === 'Monthly dues'}>
                      {item}
                    </li>
                  ))}
                </ul>
              </aside>

              <div className="v2-pane">
                <div className="v2-pane-head">
                  <span className="v2-pane-title">Monthly dues</span>
                  <span className="v2-pane-meta">01 Oct — 31 Oct 2026 · 3 with balance</span>
                </div>

                <div className="v2-table-scroll">
                  <table className="v2-ledger">
                    <thead>
                      <tr>
                        <th scope="col">Member</th>
                        <th scope="col">Vehicle</th>
                        <th scope="col" className="num">
                          Billed
                        </th>
                        <th scope="col" className="num">
                          Paid
                        </th>
                        <th scope="col" className="num">
                          Balance
                        </th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <span className="v2-member">
                              {row.name}
                              <small>#{row.id}</small>
                            </span>
                          </td>
                          <td>
                            {row.plate}
                            <span className="v2-pane-meta v2-veh-type"> · {row.type}</span>
                          </td>
                          <td className="num">{row.billed}</td>
                          <td className="num">{row.paid}</td>
                          <td className="num">{row.balance}</td>
                          <td>
                            <span className="v2-status" data-state={row.state}>
                              {row.label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="v2-pane-foot">
                  <span>
                    Outstanding on this lot — <b>Rs. 3,800</b> across 3 members
                  </span>
                  <span className="v2-export">Export CSV</span>
                </div>
              </div>
            </div>
          </div>
        </figure>

        <dl className="v2-facts">
          <div>
            <dt>Built for</dt>
            <dd>Monthly members and walk-in parking, in the same lot</dd>
          </div>
          <div>
            <dt>Priced by</dt>
            <dd>Vehicle type — rickshaw, bike, car, tanker, tractor</dd>
          </div>
          <div>
            <dt>Languages</dt>
            <dd>English, Urdu, Roman Urdu, Persian</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>CSV export from every report</dd>
          </div>
        </dl>

        <section className="v2-section" id="who">
          <header className="v2-section-head">
            <span className="v2-index">01</span>
            <h2>Who it is for</h2>
            <p className="v2-section-note">
              Three people run most parking lots. EasyParking is written for what each of them
              actually does on a Tuesday.
            </p>
          </header>

          <div className="v2-roles">
            {roles.map((role, index) => (
              <article className="v2-role" key={role.title}>
                <span className="v2-role-index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{role.title}</h3>
                <p>{role.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="v2-section" id="product">
          <header className="v2-section-head">
            <span className="v2-index">02</span>
            <h2>What it does</h2>
            <p className="v2-section-note">
              Five jobs, done properly. No dashboard you have to interpret, no metric that only
              exists to fill a screen.
            </p>
          </header>

          <div className="v2-features">
            {features.map((feature, index) => (
              <article className="v2-feature" key={feature.title}>
                <span className="v2-feature-num">{String(index + 1).padStart(2, '0')}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="v2-section" id="pricing">
          <header className="v2-section-head">
            <span className="v2-index">03</span>
            <h2>Pricing</h2>
            <p className="v2-section-note">
              Charged per lot, not per vehicle. The number of cars you park is your business, not a
              billing lever.
            </p>
          </header>

          <table className="v2-price-table">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Price</th>
                <th scope="col">Included</th>
                <th scope="col">
                  <span className="v2-sr">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.name}>
                  <td data-label="Plan">
                    <span className="v2-plan">{plan.name}</span>
                    <span className="v2-plan-note">{plan.note}</span>
                  </td>
                  <td data-label="Price">
                    <span className="v2-amount">{plan.amount}</span>
                    <span className="v2-amount-unit">{plan.unit}</span>
                  </td>
                  <td data-label="Included">
                    <ul className="v2-included">
                      {plan.included.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </td>
                  <td data-label="">
                    {plan.to ? (
                      <Link className="v2-price-cta" to={plan.to}>
                        {plan.cta} →
                      </Link>
                    ) : (
                      <a className="v2-price-cta" href={plan.href}>
                        {plan.cta} →
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="v2-price-foot">
            <p className="v2-fineprint">
              Prices in PKR, per lot, billed monthly. No per-vehicle charge and no setup fee. Leave
              whenever you like and export your records on the way out.
            </p>
          </div>
        </section>

        <section className="v2-section" id="faq">
          <div className="v2-faq-grid">
            <div className="v2-faq-intro">
              <span className="v2-index">04</span>
              <h2>Questions we get asked</h2>
              <p className="v2-section-note">
                The ones about money, months and moving in. If yours is not here, write to us and
                we will answer plainly.
              </p>
              <p className="v2-faq-contact">
                <a href={`mailto:${contactEmail}?subject=Question%20about%20EasyParking`}>
                  Ask us directly →
                </a>
              </p>
            </div>

            <div className="v2-faq-list">
              {faqs.map((item) => (
                <details className="v2-faq-item" key={item.q}>
                  <summary>
                    {item.q}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="v2-closing">
          <div>
            <h2>Take the notebook out of the equation.</h2>
            <p>Start with one lot. Set up the first ten members tonight, add the rest as they renew.</p>
          </div>
          <Link className="v2-btn v2-btn--solid" to="/signup">
            Start free
          </Link>
        </section>

        {showInstall && !isStandalone && (
          <section className="v2-install" aria-label="Install on Android">
            <div>
              <p className="v2-label">Android</p>
              <h2>Keep it on the home screen.</h2>
              <p>Opens without the address bar. Records still need a connection to reach the database.</p>
            </div>
            <ol className="v2-install-steps">
              <li>
                <b>1</b> Open the browser menu
              </li>
              <li>
                <b>2</b> Choose “Install app” or “Add to Home screen”
              </li>
              <li>
                <b>3</b> Confirm — it behaves like an installed app
              </li>
            </ol>
            <button type="button" className="v2-btn v2-btn--ghost" onClick={handleInstall} disabled={!installPrompt}>
              {installPrompt ? 'Install now' : 'Use browser menu'}
            </button>
          </section>
        )}
      </div>

      <footer className="v2-footer">
        <div className="v2-shell">
          <div className="v2-footer-grid">
            <div className="v2-footer-brand">
              <Link className="v2-brand" to="/" aria-label="EasyParking — home">
                <img className="v2-mark" src="/favicon.svg" width="26" height="26" alt="" />
                <span className="v2-brand-word">EasyParking</span>
              </Link>
              <p>Parking records for lots in Pakistan. Members, dues, walk-ins and payments on one ledger.</p>
              <p className="v2-footer-contact">
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </p>
            </div>

            <dl className="v2-footer-col">
              <dt>Product</dt>
              <dd>
                <a href="#product">What it does</a>
              </dd>
              <dd>
                <a href="#pricing">Pricing</a>
              </dd>
              <dd>
                <a href="#faq">FAQ</a>
              </dd>
            </dl>

            <dl className="v2-footer-col">
              <dt>Account</dt>
              <dd>
                <Link to="/login">Log in</Link>
              </dd>
              <dd>
                <Link to="/signup">Start free</Link>
              </dd>
            </dl>

            <dl className="v2-footer-col">
              <dt>Legal</dt>
              <dd>
                <Link to="/privacy-policy">Privacy</Link>
              </dd>
              <dd>
                <Link to="/terms">Terms of use</Link>
              </dd>
            </dl>
          </div>

          <div className="v2-footer-bottom">
            <span>© {currentYear} EasyParking · Pakistan</span>
            <span>Prices in PKR · Set in Newsreader and Inter</span>
          </div>
        </div>
      </footer>
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
        <Link className="button-primary legal-home-link" to="/" aria-label={t('landing.nav.getStarted')}>
          {t('landing.nav.getStarted')}
          <GoogleIcon name="arrow_right_alt" size={18} />
        </Link>
      </article>
      <footer className="legal-footer"><span>{t('landing.footer.copyright')}</span><Link to="/">{t('app.name')}</Link></footer>
    </main>
  );
}

export { LandingLegalPage };
export default LandingPage;
