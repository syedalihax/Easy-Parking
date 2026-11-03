const stats = [
  { value: "4.2k+", label: "active members" },
  { value: "96%", label: "entry accuracy" },
  { value: "12 min", label: "billing cycle" },
  { value: "24/7", label: "site visibility" },
];

const features = [
  {
    title: "Member access control",
    description:
      "Keep residents, vehicles, and site access records in one structured view without chasing updates in separate tools.",
  },
  {
    title: "Live lot intelligence",
    description:
      "Monitor occupancy patterns, turnaround times, and peak periods with reliable daily operational data.",
  },
  {
    title: "Recurring dues automation",
    description:
      "Generate payment schedules, flag pending balances, and keep collections moving without spreadsheet overhead.",
  },
  {
    title: "Cashflow visibility",
    description:
      "Track revenue, received payments, and overdue accounts in a format built for decisions, not just reports.",
  },
  {
    title: "Daily operational records",
    description:
      "Capture entries, exits, adjustments, and exceptions so staff can act quickly and keep site flow consistent.",
  },
  {
    title: "Owner-ready reporting",
    description:
      "Present clear summaries to managers and stakeholders with audit-friendly records and cleaner reporting cycles.",
  },
];

const steps = [
  {
    title: "Configure the site",
    description: "Add your parking profile, member records, rules, and vehicle details in a guided setup flow.",
  },
  {
    title: "Automate the routine",
    description: "Sync daily activity, dues, and access status so the team spends less time on admin and more on service.",
  },
  {
    title: "Operate with clarity",
    description: "Review occupancy, collections, and reporting in one place to guide smarter decisions every day.",
  },
];

const faqs = [
  {
    question: "Who is EasyParking built for?",
    answer:
      "It is designed for residential parking operators, property managers, and site teams who need a cleaner system for daily operations and billing.",
  },
  {
    question: "Can multiple parking sites be managed together?",
    answer:
      "Yes. The platform is structured to support a central operating view across multiple sites with consistent reporting and access control.",
  },
  {
    question: "Does it handle recurring dues automatically?",
    answer:
      "Yes. Due generation and payment tracking are built to reduce manual follow-up and improve collection visibility.",
  },
  {
    question: "Is it practical for day-to-day staff use?",
    answer:
      "Yes. The interface is responsive, straightforward, and built for quick checks on the move or at the desk.",
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
            <a href="#operations">Operations</a>
            <a href="#benefits">Benefits</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="nav-actions">
            <a href="#contact" className="text-link">Book demo</a>
            <a href="#contact" className="primary-button small-button">Get started</a>
          </div>
        </div>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Parking operations, simplified</p>
            <h1>Control the daily flow of your parking business.</h1>
            <p className="hero-description">
              EasyParking brings member records, lot activity, billing, and reporting into one disciplined workflow designed for busy operators.
            </p>

            <div className="hero-actions">
              <a href="#contact" className="primary-button">Book a free demo</a>
              <a href="#features" className="secondary-button">See the platform</a>
            </div>

            <div className="trust-row">
              <span className="trust-mark">✓</span>
              Trusted by operators managing more than 4,200 active accounts
            </div>
          </div>

          <div className="hero-visual" aria-label="EasyParking dashboard preview">
            <div className="dashboard-shell">
              <div className="dashboard-head">
                <div className="window-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span>Operations overview</span>
              </div>

              <div className="dashboard-body">
                <div className="dashboard-main">
                  <div className="summary-box accent-box">
                    <span className="label">Monthly revenue</span>
                    <strong>PKR 1.42M</strong>
                    <small>+18.4% vs last month</small>
                  </div>
                  <div className="summary-box">
                    <span className="label">Lot occupancy</span>
                    <strong>76%</strong>
                    <small>42 vehicles added today</small>
                  </div>
                </div>

                <div className="dashboard-subgrid">
                  <div className="mini-panel">
                    <span className="label">Active members</span>
                    <strong>1,284</strong>
                    <div className="chart-bars" aria-hidden="true">
                      <span />
                    </div>
                  </div>
                  <div className="mini-panel soft-panel">
                    <span className="label">Due collections</span>
                    <strong>PKR 84.6k</strong>
                    <small>12 pending approvals</small>
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
                        <small>3 collections received</small>
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

      <section className="stats-band" aria-label="Platform metrics">
        {stats.map((stat) => (
          <div className="stat-item" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="comparison-section section-block" id="operations">
        <div className="section-heading">
          <p className="eyebrow">Why teams switch</p>
          <h2>From scattered admin work to a single operating rhythm.</h2>
        </div>

        <div className="comparison-grid">
          <article className="comparison-card">
            <div className="card-label"><span className="mini-icon muted-icon">—</span> Traditional workflow</div>
            <ul>
              <li>Members, vehicles, and dues tracked across spreadsheets</li>
              <li>Payments follow-up happens late and inconsistently</li>
              <li>Daily updates get lost between calls, notes, and chats</li>
              <li>Reporting pulls teams away from real decision-making</li>
            </ul>
          </article>

          <div className="comparison-arrow" aria-hidden="true">→</div>

          <article className="comparison-card after-card">
            <div className="card-label"><span className="mini-icon success-icon">✓</span> EasyParking workflow</div>
            <ul>
              <li>Member and vehicle records remain in a single structured system</li>
              <li>Billing and payment status update without manual chasing</li>
              <li>Occupancy and lot activity are visible in real time</li>
              <li>Owners and managers work from cleaner, faster reports</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="features-section section-block" id="features">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Platform features</p>
            <h2>Everything your team needs to stay in control.</h2>
          </div>
          <p>
            Built for operators who want less admin, more visibility, and a smoother experience for both staff and drivers.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature, index) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-head">
                <span className="feature-index">0{index + 1}</span>
                <span className="feature-bullet" aria-hidden="true" />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="steps-section section-block" id="benefits">
        <div className="section-heading centered-heading">
          <p className="eyebrow">How it works</p>
          <h2>Three steps to a calmer parking operation.</h2>
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
          <p className="eyebrow eyebrow-light">Built for real operations</p>
          <h2 id="benefits-heading">A stronger routine for staff, owners, and drivers.</h2>
        </div>

        <ul className="benefits-list">
          <li>Reduce repetitive admin work with structured dues tracking and payment visibility.</li>
          <li>Improve occupancy planning with real-time daily activity and usage patterns.</li>
          <li>Keep owners and managers aligned through cleaner reporting and better records.</li>
          <li>Create a more premium driver experience with smoother service and fewer delays.</li>
        </ul>
      </section>

      <section className="faq-section section-block" id="faq">
        <div className="faq-intro">
          <p className="eyebrow">FAQ</p>
          <h2>Questions teams usually ask before switching.</h2>
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
            <p className="eyebrow eyebrow-light">Ready to modernize?</p>
            <h2>Build a parking operation that feels controlled from the first day.</h2>
          </div>

          <a href="mailto:hello@easyparking.example.com" className="primary-button light-button">Talk to sales</a>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">
          <a href="#top" className="brand footer-brand-link" aria-label="EasyParking home">
            <span className="brand-mark">EP</span>
            <span>EasyParking</span>
          </a>
          <p>Parking operations designed for cleaner workflows, stronger collections, and better day-to-day service.</p>
        </div>

        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#operations">Operations</a>
          <a href="#faq">FAQ</a>
        </div>
      </footer>
    </main>
  );
}
