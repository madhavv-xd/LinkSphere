import { Link } from "react-router-dom";
import styles from "./Landing.module.css";

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* ── Navbar ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoIcon}>◈</span>
            <span className={styles.logoText}>LinkSphere</span>
          </Link>
          <nav className={styles.nav}>
            <Link to="#features" className={styles.navLink}>Features</Link>
            <Link to="#about" className={styles.navLink}>About</Link>
            <Link to="#contact" className={styles.navLink}>Contact</Link>
          </nav>
          <div className={styles.navActions}>
            <Link to="/login" className={styles.loginBtn}>Log In</Link>
            <Link to="/signup" className={styles.signupBtn}>Sign Up</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.badge}>Launching 2025</p>
          <h1 className={styles.heading}>
            Connect, Communicate,<br />Collaborate
          </h1>
          <p className={styles.sub}>
            LinkSphere brings your community together in real time.
            Create servers, manage channels, and stay in sync — always.
          </p>
          <div className={styles.heroActions}>
            <Link to="/signup" className={styles.primaryBtn}>Get Started Free</Link>
            <Link to="/login" className={styles.ghostBtn}>Log In</Link>
          </div>
        </div>

        {/* Decorative grid dots */}
        <div className={styles.gridOverlay} aria-hidden="true" />
      </main>

      {/* ── Features ── */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Why LinkSphere?</h2>
        <p className={styles.sectionSub}>Built for communities that need speed, reliability, and control.</p>
        <div className={styles.cards}>
          {[
            { icon: "⚡", title: "Real-Time Messaging", desc: "Instant delivery with WebSocket-powered channels. No refresh needed." },
            { icon: "🔒", title: "Secure Auth", desc: "JWT-based authentication keeps your account and data protected." },
            { icon: "📡", title: "Custom Servers", desc: "Create your own servers, set channels, and invite your community." },
            { icon: "🌐", title: "Always Online", desc: "Cloud-hosted infrastructure designed for 99.9% uptime." },
          ].map((f) => (
            <div className={styles.card} key={f.title}>
              <div className={styles.cardIcon}>{f.icon}</div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className={styles.about}>
        <div className={styles.aboutInner}>
          <div className={styles.aboutText}>
            <h2 className={styles.sectionTitle}>About LinkSphere</h2>
            <p className={styles.aboutDesc}>
              LinkSphere is a scalable real-time communication platform inspired by Discord,
              built with Node.js, Express, and React. It was created as a learning project
              to demonstrate full-stack development with authentication, routing, and live messaging.
            </p>
            <p className={styles.aboutDesc}>
              From the backend REST API to the React frontend, every part is handcrafted
              to show how modern web applications are structured and deployed.
            </p>
          </div>
          <div className={styles.aboutStats}>
            {[
              { val: "100%", label: "Open Source" },
              { val: "JWT", label: "Auth Standard" },
              { val: "WS", label: "Real-Time Protocol" },
            ].map((s) => (
              <div className={styles.stat} key={s.label}>
                <span className={styles.statVal}>{s.val}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.logoIcon}>◈</span>
            <span className={styles.logoText}>LinkSphere</span>
            <p className={styles.footerTagline}>Real-time communication platform</p>
          </div>

          <div className={styles.footerContact}>
            <h4 className={styles.footerHeading}>Contact Us</h4>
            <ul className={styles.contactList}>
              <li>📧 <a href="mailto:vanshdhot2544@gmail.com">vanshdhot2544@gmail.com</a></li>
              <li>📍 Patiala, Punjab, India</li>
              <li>🐙 <a href="https://github.com/MasterXCoder/LinkSphere" target="_blank" rel="noreferrer">github.com/linksphere</a></li>
            </ul>
          </div>

          <div className={styles.footerLinks}>
            <h4 className={styles.footerHeading}>Quick Links</h4>
            <ul className={styles.linkList}>
              <li><Link to="/signup">Create Account</Link></li>
              <li><Link to="/login">Log In</Link></li>
              <li><Link to="#features">Features</Link></li>
              <li><Link to="#about">About</Link></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2025 LinkSphere. Built with Node.js & React.</p>
        </div>
      </footer>
    </div>
  );
}