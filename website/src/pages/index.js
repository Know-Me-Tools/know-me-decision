import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const OUTCOMES = [
  {name: 'Act', tone: 'act', text: 'One option, calibrated and safe to automate.'},
  {name: 'Review', tone: 'review', text: 'A person confirms from a small prediction set.'},
  {name: 'Escalate', tone: 'escalate', text: 'A tripwire or escalation class fired. Always logged; no model can override it.'},
];

const READ = [
  {to: '/docs/', title: 'Overview', text: 'What the decision layer answers, where it runs and what it will never do.'},
  {to: '/docs/playbook', title: 'Build playbook', text: 'Invariants I-1…I-10, the core contracts, and milestones M0–M10 with exit gates.'},
  {href: 'pathname:///architecture/knowme-decision-layer.html', title: 'Architecture report', text: 'Crates, the cascade, the MCP tool surface and every host integration.'},
  {to: '/docs/research/open-decision-models-2026-09', title: 'Research', text: 'The open, self-hostable models that replace Jev, per use case.'},
];

export default function Home() {
  return (
    <Layout title="Self-hosted decision models" description="Self-hosted decision models for KnowMe, as a Rust crate family and MCP sidecar.">
      <main>
        <section className={styles.hero}>
          <div className="container">
            <p className={styles.eyebrow}>KnowMe · decision layer</p>
            <h1 className={styles.title}>
              Decisions you can calibrate, audit and keep on the device.
            </h1>
            <p className={styles.lede}>
              <code>know-me-decision</code> replaces hosted decision APIs with open-weight models that run locally.
              Tripwires run first, recall floors are set before automation, and every answer is written to a hash-chained audit log.
            </p>
            <div className={styles.actions}>
              <Link className="button button--primary button--lg" to="/docs/">
                Read the documentation
              </Link>
              <Link className="button button--secondary button--lg" to="/docs/playbook">
                Build playbook
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.band} aria-labelledby="outcomes-heading">
          <div className="container">
            <h2 id="outcomes-heading" className={styles.sectionTitle}>Every answer is an outcome the host can act on</h2>
            <ul className={styles.outcomes}>
              {OUTCOMES.map((o) => (
                <li key={o.name} className={`${styles.outcome} ${styles[o.tone]}`}>
                  <span className={styles.outcomeName}>{o.name}</span>
                  <span>{o.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.read} aria-labelledby="read-heading">
          <div className="container">
            <h2 id="read-heading" className={styles.sectionTitle}>Start here</h2>
            <ul className={styles.cards}>
              {READ.map((r) => (
                <li key={r.title}>
                  <Link className={styles.card} {...(r.href ? {href: r.href} : {to: r.to})}>
                    <span className={styles.cardTitle}>{r.title}</span>
                    <span className={styles.cardText}>{r.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </Layout>
  );
}
