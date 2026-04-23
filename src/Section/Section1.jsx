import React from 'react'
import { Link } from 'react-router-dom'
import heroImg from '../assets/hero.png'
import './Section1.css'

const Section1 = () => {
  return (
    <>
      {/* ── HERO ── */}
      <section className="hero-section" id="hero">
        <img src={heroImg} alt="Healthy food background" className="hero-bg" />
        <div className="hero-overlay" />

        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span className="hero-badge-text">Your Health, Your Way</span>
          </div>

          <h1 className="hero-heading">
            Eat Smart, Live{' '}
            <span className="highlight">Better</span> Every Day.
          </h1>

          <p className="hero-subtext">
            Discover personalized diet plans, explore detailed food nutrition facts,
            and take control of your wellness journey with NutriGuide — your
            all-in-one nutrition companion.
          </p>

          <div className="hero-cta-row">
            {/* ✅ Get Started now navigates to /login */}
            <Link to="/login" className="hero-btn-primary">
              Get Started
              <svg viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>

            <Link to="/about" className="hero-btn-secondary">
              About Us
              <svg viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-number">500+</span>
              <span className="hero-stat-label">Diet Plans</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">10K+</span>
              <span className="hero-stat-label">Food Items</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">50K+</span>
              <span className="hero-stat-label">Happy Users</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section" id="features">
        <div className="features-container">
          <div className="section-eyebrow">Why NutriGuide?</div>
          <h2 className="section-title">
            Everything you need for a <span className="title-accent">healthier life</span>
          </h2>
          <p className="section-subtitle">
            From personalised meal planning to real-time nutrition tracking — we've got every step covered.
          </p>

          <div className="features-grid">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                    <path d="M9 12h6M9 16h4" />
                  </svg>
                ),
                title: 'Personalised Diet Plans',
                desc: 'AI-crafted meal plans tailored to your goals, allergies, and taste preferences.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                    <path d="M11 8v6M8 11h6" />
                  </svg>
                ),
                title: 'Deep Nutrition Database',
                desc: 'Search 10,000+ foods with macro & micronutrient breakdowns at a glance.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                ),
                title: 'Progress Tracking',
                desc: 'Visual dashboards to monitor calories, weight, and health milestones over time.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
                title: 'Expert-Backed Guidance',
                desc: 'Every recommendation is grounded in verified nutritional science and dietitian reviews.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                ),
                title: 'Mobile-First Design',
                desc: 'Log meals on the go — our app works beautifully on every device, anytime.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
                title: 'Community Support',
                desc: 'Join 50,000+ members sharing recipes, challenges, and motivation daily.',
              },
            ].map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-section" id="how">
        <div className="how-container">
          <div className="section-eyebrow light">How It Works</div>
          <h2 className="section-title white">
            Start your journey in <span className="title-accent">3 simple steps</span>
          </h2>

          <div className="steps-row">
            {[
              { num: '01', title: 'Create Your Profile', desc: 'Tell us about your age, weight, goals, and dietary preferences.' },
              { num: '02', title: 'Get Your Plan', desc: 'Our AI generates a custom meal plan and nutrition targets just for you.' },
              { num: '03', title: 'Track & Thrive', desc: 'Log meals daily, monitor progress, and hit your health milestones.' },
            ].map((s, i) => (
              <div className="step-card" key={i}>
                <span className="step-num">{s.num}</span>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
                {i < 2 && <div className="step-connector" />}
              </div>
            ))}
          </div>

          <div className="how-cta">
            <Link to="/login" className="hero-btn-primary">
              Start For Free
              <svg viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testimonials-section">
        <div className="features-container">
          <div className="section-eyebrow">Real Stories</div>
          <h2 className="section-title">
            Loved by <span className="title-accent">50,000+ users</span>
          </h2>

          <div className="testimonials-grid">
            {[
              { name: 'Priya S.', role: 'Lost 12 kg in 3 months', text: 'NutriGuide completely changed how I think about food. The personalised plans are spot-on and the app is a joy to use every day.', avatar: 'P' },
              { name: 'Rahul M.', role: 'Fitness Enthusiast', text: 'The nutrition database is incredible. I can scan literally any food and get all the macros instantly. Highly recommend!', avatar: 'R' },
              { name: 'Sneha K.', role: 'Diabetes Management', text: 'As someone managing diabetes, having a trusted nutrition guide has been life-changing. The expert-backed advice gives me real confidence.', avatar: 'S' },
            ].map((t, i) => (
              <div className="testimonial-card" key={i}>
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.avatar}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-top">
            {/* Brand */}
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="footer-logo-nutri">Nutri</span>
                <span className="footer-logo-guide">Guide</span>
              </div>
              <p className="footer-tagline">Your Health, Your Way — trusted by 50,000+ users worldwide.</p>
              <div className="footer-socials">
                {['f', 'in', 'tw', 'yt'].map((s) => (
                  <a key={s} href="#" className="footer-social-btn" aria-label={s}>{s}</a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="footer-links-group">
              <h4 className="footer-links-heading">Product</h4>
              <ul>
                <li><Link to="/diet-plan">Diet Plans</Link></li>
                <li><Link to="/food-info">Food Info</Link></li>
                <li><Link to="/tracker">Tracker</Link></li>
                <li><Link to="/recipes">Recipes</Link></li>
              </ul>
            </div>

            <div className="footer-links-group">
              <h4 className="footer-links-heading">Company</h4>
              <ul>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/blog">Blog</Link></li>
                <li><Link to="/careers">Careers</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>

            <div className="footer-links-group">
              <h4 className="footer-links-heading">Support</h4>
              <ul>
                <li><Link to="/faq">FAQ</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><Link to="/help">Help Center</Link></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="footer-newsletter">
              <h4 className="footer-links-heading">Stay Updated</h4>
              <p>Get weekly nutrition tips straight to your inbox.</p>
              <div className="newsletter-row">
                <input type="email" placeholder="your@email.com" className="newsletter-input" />
                <button className="newsletter-btn">→</button>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2024 NutriGuide. All rights reserved.</span>
            <span className="footer-24hr">
              <span className="footer-24hr-dot" />
              Available 24/7 — anytime, anywhere
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}

export default Section1
