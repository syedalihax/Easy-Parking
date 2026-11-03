const stats = [
  { value: "4.2k+", label: "Drivers onboarded" },
  { value: "96%", label: "On-time entries" },
  { value: "12 min", label: "Average billing cycle" },
  { value: "24/7", label: "Monitoring and alerts" },
];

const features = [
  {
    title: "Smart member management",
    description:
      "Track vehicles, residents, and guest access in one place with automatic status updates and role-based permissions.",
  },
  {
    title: "Live parking control",
    description:
      "Monitor occupancy, spot availability, and peak demand with insights your team can act on right away.",
  },
  {
    title: "Automated billing",
    description:
      "Generate due notices, collect payments, and reconcile balances without spreadsheet chasing or delayed follow-ups.",
  },
  {
    title: "Cashflow visibility",
    description:
      "See revenue trends, unpaid dues, and monthly collections at a glance with a clean dashboard built for operations.",
  },
  {
    title: "Daily parking operations",
    description:
      "Capture entry and exit activity, update records in real time, and keep staff aligned on daily park availability.",
  },
  {
    title: "Trust-first reporting",
    description:
      "Export clear reports for owners, accountants, and management teams with transparent audit trails and status history.",
  },
];

const steps = [
  {
    title: "Create your parking profile",
    description: "Set up your site, owners, vehicles, and policy settings in a few guided steps.",
  },
  {
    title: "Automate member and payment workflows",
    description: "Sync billing rules, membership plans, and daily records so staff spend less time on admin.",
  },
  {
    title: "Track performance and grow",
    description: "Monitor occupancy, cashflow, and compliance signals to scale each lot with confidence.",
  },
];

const faqs = [
  {
    question: "Who is EasyParking built for?",
    answer:
      "EasyParking is designed for parking operators, residential communities, building managers, and commercial lots that need a cleaner way to run daily operations and collections.",
  },
  {
    question: "Can I manage multiple parking locations?",
    answer:
      "Yes. The platform is structured to support a central operations view across multiple sites, with role-based access and consolidated reporting.",
  },
  {
    question: "Is billing fully automated?",
    answer:
      "The platform supports recurring dues, payment allocation, and status monitoring so your team can reduce missed collections and monthly reconciliation work.",
  },
  {
    question: "Does it work on mobile devices?",
    answer:
      "Yes. The system is optimized for on-the-go staff and managers with responsive workflows for daily checks, member updates, and operations reporting.",
  },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <header className="landing-header">
        <div className="landing-nav">
          <a href="#top" className="brand" aria-label="EasyParking home">
            <span className="brand-mark">EP</span>
            <span>EasyParking</span>
          </a>

          <nav className="nav-links" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#ops">Operations</a>
            <a href="#benefits">Benefits</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="nav-actions">
            <a href="#contact" className="text-link">
              Book a demo
            </a>
            <a href="#contact" className="primary-button small-button">
              Get started
            </a>
          </div>
        </div>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              Smarter parking operations for growing lots
            </p>
            <h1>Run your parking business with less friction and more clarity.</h1>
            <p className="hero-description">
              EasyParking brings member management, daily parking tracking, automated billing,
              and cashflow visibility into a single workflow built for operations teams.
            </p>

            <div className="hero-actions">
              <a href="#contact" className="primary-button">
                Book a free demo
              </a>
              <a href="#features" className="secondary-button">
                Explore platform
              </a>
            </div>

            <div className="trust-row">
              <span className="shield-badge">✓</span>
              Trusted by 4,200+ drivers and site operators worldwide
            </div>
          </div>

          <div className="hero-visual" aria-label="EasyParking dashboard preview">
            <div className="dashboard-shell">
              <div className="dashboard-topbar">
                <div className="window-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span>Operations dashboard</span>
              </div>

              <div className="dashboard-body">
                <div className="metric-row">
                  <div className="metric-card highlight">
                    <span>Monthly revenue</span>
                    <strong>PKR 1.42M</strong>
                    <small>+18.4% vs last month</small>
                  </div>
                  <div className="metric-card">
                    <span>Occupied slots</span>
                    <strong>76%</strong>
                    <small>+42 today</small>
                  </div>
                </div>

                <div className="mini-grid">
                  <div className="mini-panel">
                    <label>Active members</label>
                    <strong>1,284</strong>
                    <div className="sparkline">
                      <span />
                    </div>
                  </div>
                  <div className="mini-panel accent">
                    <label>Due collections</label>
                    <strong>PKR 84.6k</strong>
                    <small>12 pending</small>
                  </div>
                </div>

                <div className="activity-panel">
                  <div className="activity-head">
                    <span>Recent activity</span>
                    <em>Live</em>
                  </div>

                  <ul>
                    <li>
                      <div>
                        <strong>BA-581</strong>
                        <small>Entry confirmed</small>
                      </div>
                      <time>09:46</time>
                    </li>
                    <li>
                      <div>
                        <strong>Monthly dues</strong>
                        <small>3 payments received</small>
                      </div>
                      <time>08:30</time>
                    </li>
                    <li>
                      <div>
                        <strong>Lot occupancy</strong>
                        <small>Peak window at 11:00 AM</small>
                      </div>
                      <time>07:15</time>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-band" aria-label="Platform highlight stats">
        {stats.map((stat) => (
          <div className="stat-item" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="comparison-section section-block" id="ops">
        <div className="section-heading">
          <p className="eyebrow dark-eyebrow">
            <span className="eyebrow-dot" />
            Why teams switch
          </p>
          <h2>From scattered admin to a system that stays in sync.</h2>
        </div>

        <div className="comparison-grid">
          <article className="comparison-card before-card">
            <div className="card-label">
              <span className="mini-icon red">✕</span>
              Traditional workflow
            </div>
            <ul>
              <li>Manual spreadsheets for vehicle and billing records</li>
              <li>Delayed payment reminders and unclear due dates</li>
              <li>Daily parking updates scattered across calls and notes</li>
              <li>Slow reporting for owners and finance teams</li>
            </ul>
          </article>

          <div className="comparison-arrow" aria-hidden="true">
            →
          </div>

          <article className="comparison-card after-card">
            <div className="card-label">
              <span className="mini-icon green">✓</span>
              EasyParking workflow
            </div>
            <ul>
              <li>Unified member, vehicle, and booking records</li>
              <li>Automated billing, due generation, and status tracking</li>
              <li>Live monitoring for occupancy, payments, and operations</li>
              <li>Clear insights that reduce churn and improve cashflow</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="features-section section-block" id="features">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow dark-eyebrow">
              <span className="eyebrow-dot" />
              Platform features
            </p>
            <h2>Everything your team needs to operate with confidence.</h2>
          </div>
          <p>
            Designed for parking operators who want speed, transparency, and better service without adding complexity.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature, index) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-head">
                <span className="feature-index">0{index + 1}</span>
                <span className="feature-icon">✦</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="steps-section section-block" id="benefits">
        <div className="section-heading centered-heading">
          <p className="eyebrow dark-eyebrow">
            <span className="eyebrow-dot" />
            How it works
          </p>
          <h2>Launch smarter operations in three simple steps.</h2>
        </div>

        <div className="steps-grid">
          {steps.map((step, index) => (
            <article className="step-card" key={step.title}>
              <span className="step-number">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="benefits-panel section-block" aria-labelledby="benefits-heading">
        <div className="benefits-copy">
          <p className="eyebrow light-eyebrow">
            <span className="eyebrow-dot" />
            Built for real operations
          </p>
          <h2 id="benefits-heading">A calmer workflow for owners, managers, and parking staff.</h2>
        </div>

        <ul className="benefits-list">
          <li>Reduce admin time with automated due generation and payment tasks.</li>
          <li>Improve occupancy planning with real-time usage and demand visibility.</li>
          <li>Keep all stakeholders aligned with transparent records and audit-friendly logs.</li>
          <li>Create a more premium driver experience through cleaner service and faster resolution.</li>
        </ul>
      </section>

      <section className="faq-section section-block" id="faq">
        <div className="faq-intro">
          <p className="eyebrow dark-eyebrow">
            <span className="eyebrow-dot" />
            FAQ
          </p>
          <h2>Answers for teams evaluating operational improvements.</h2>
        </div>

        <div className="faq-list">
          {faqs.map((faq) => (
            <details className="faq-item" key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="cta-section" id="contact">
        <div className="cta-inner">
          <div>
            <p className="eyebrow light-eyebrow">
              <span className="eyebrow-dot" />
              Ready to modernize parking operations?
            </p>
            <h2>Build a more reliable parking experience from day one.</h2>
          </div>

          <a href="mailto:hello@easyparking.example.com" className="primary-button light-button">
            Talk to sales
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">
          <a href="#top" className="brand footer-brand-link" aria-label="EasyParking home">
            <span className="brand-mark">EP</span>
            <span>EasyParking</span>
          </a>
          <p>Parking operations designed for cleaner workflows, stronger collections, and happier customers.</p>
        </div>

        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#ops">Operations</a>
          <a href="#faq">FAQ</a>
        </div>
      </footer>
    </main>
  );
}
