/**
 * Script to create a beautiful sample project
 * Run with: node scripts/create-sample-project.js
 */

const PROJECT_DATA = {
  title: 'Modern Portfolio Website',
  description: 'A beautiful, modern portfolio website with smooth animations and professional design',
  type: 'web',
  framework: 'react',
  files: [
    {
      path: 'src/App.js',
      name: 'App.js',
      content: `import React from 'react';
import Navigation from './Navigation';
import Hero from './Hero';
import Features from './Features';
import About from './About';
import Contact from './Contact';
import './App.css';

function App() {
  return (
    <div className="App">
      <Navigation />
      <Hero />
      <Features />
      <About />
      <Contact />
    </div>
  );
}

export default App;`,
      language: 'javascript',
      isMain: true,
    },
    {
      path: 'src/Navigation.js',
      name: 'Navigation.js',
      content: `import React, { useState, useEffect } from 'react';

function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className={\`navbar \${scrolled ? 'scrolled' : ''}\`}>
      <div className="nav-container">
        <div className="nav-logo">
          <span className="logo-text">Portfolio</span>
        </div>
        <ul className="nav-menu">
          <li><a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Home</a></li>
          <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a></li>
          <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About</a></li>
          <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact</a></li>
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;`,
      language: 'javascript',
      isMain: false,
    },
    {
      path: 'src/Hero.js',
      name: 'Hero.js',
      content: `import React from 'react';

function Hero() {
  return (
    <section id="home" className="hero">
      <div className="hero-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            <span className="gradient-text">Build Amazing</span>
            <br />
            <span>Digital Experiences</span>
          </h1>
          <p className="hero-description">
            Crafting beautiful, modern web applications with cutting-edge technology
            and exceptional user experience.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={() => {
              const element = document.getElementById('contact');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}>
              Get Started
            </button>
            <button className="btn btn-secondary" onClick={() => {
              const element = document.getElementById('features');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}>
              Learn More
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="floating-card card-1">
            <div className="card-content">
              <div className="card-icon">✨</div>
              <h3>Modern Design</h3>
            </div>
          </div>
          <div className="floating-card card-2">
            <div className="card-content">
              <div className="card-icon">⚡</div>
              <h3>Fast Performance</h3>
            </div>
          </div>
          <div className="floating-card card-3">
            <div className="card-content">
              <div className="card-icon">🎯</div>
              <h3>User Focused</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;`,
      language: 'javascript',
      isMain: false,
    },
    {
      path: 'src/Features.js',
      name: 'Features.js',
      content: `import React from 'react';

function Features() {
  const features = [
    {
      icon: '🚀',
      title: 'Lightning Fast',
      description: 'Optimized for performance with modern build tools and best practices.',
    },
    {
      icon: '🎨',
      title: 'Beautiful Design',
      description: 'Thoughtfully designed interfaces that delight users and drive engagement.',
    },
    {
      icon: '📱',
      title: 'Fully Responsive',
      description: 'Perfect experience across all devices, from mobile to desktop.',
    },
    {
      icon: '🔒',
      title: 'Secure & Safe',
      description: 'Built with security in mind, protecting user data and privacy.',
    },
    {
      icon: '⚙️',
      title: 'Easy to Customize',
      description: 'Flexible architecture that adapts to your specific needs.',
    },
    {
      icon: '🌐',
      title: 'Cross Platform',
      description: 'Works seamlessly across different browsers and operating systems.',
    },
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            <span className="gradient-text">Powerful Features</span>
          </h2>
          <p className="section-description">
            Everything you need to build and deploy amazing web applications
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;`,
      language: 'javascript',
      isMain: false,
    },
    {
      path: 'src/About.js',
      name: 'About.js',
      content: `import React from 'react';

function About() {
  return (
    <section id="about" className="about">
      <div className="container">
        <div className="about-content">
          <div className="about-text">
            <h2 className="section-title">
              <span className="gradient-text">About This Project</span>
            </h2>
            <p className="about-description">
              This is a modern, professional portfolio website built with React and modern web technologies.
              It showcases best practices in web development including responsive design, smooth animations,
              and beautiful UI/UX.
            </p>
            <p className="about-description">
              The design follows current trends while maintaining timeless elegance. Every component is
              carefully crafted to provide an exceptional user experience.
            </p>
            <div className="about-stats">
              <div className="stat-item">
                <div className="stat-number">100%</div>
                <div className="stat-label">Responsive</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">50+</div>
                <div className="stat-label">Components</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Support</div>
              </div>
            </div>
          </div>
          <div className="about-visual">
            <div className="visual-card">
              <div className="visual-content">
                <div className="visual-icon">💻</div>
                <h3>Modern Stack</h3>
                <p>Built with React, CSS3, and modern JavaScript</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;`,
      language: 'javascript',
      isMain: false,
    },
    {
      path: 'src/Contact.js',
      name: 'Contact.js',
      content: `import React, { useState } from 'react';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for your message! This is a demo form.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <section id="contact" className="contact">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            <span className="gradient-text">Get In Touch</span>
          </h2>
          <p className="section-description">
            Have a project in mind? Let's work together to bring your vision to life.
          </p>
        </div>
        <div className="contact-content">
          <div className="contact-info">
            <div className="info-item">
              <div className="info-icon">📧</div>
              <div>
                <h3>Email</h3>
                <p>hello@example.com</p>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon">📱</div>
              <div>
                <h3>Phone</h3>
                <p>+1 (555) 123-4567</p>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon">📍</div>
              <div>
                <h3>Location</h3>
                <p>San Francisco, CA</p>
              </div>
            </div>
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Your name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your.email@example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="5"
                placeholder="Tell us about your project..."
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Contact;`,
      language: 'javascript',
      isMain: false,
    },
    {
      path: 'src/App.css',
      name: 'App.css',
      content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --dark-bg: #0a0a0f;
  --dark-surface: #151520;
  --dark-surface-hover: #1a1a2e;
  --text-primary: #ffffff;
  --text-secondary: #a0a0b8;
  --border-color: rgba(255, 255, 255, 0.1);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--dark-bg);
  color: var(--text-primary);
  overflow-x: hidden;
}

.App {
  min-height: 100vh;
  position: relative;
}

/* Navigation */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 1.5rem 0;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.navbar.scrolled {
  padding: 1rem 0;
  background: rgba(10, 10, 15, 0.95);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo .logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-menu {
  display: flex;
  list-style: none;
  gap: 2rem;
}

.nav-menu a {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
  position: relative;
}

.nav-menu a:hover {
  color: var(--text-primary);
}

.nav-menu a::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary-gradient);
  transition: width 0.3s ease;
}

.nav-menu a:hover::after {
  width: 100%;
}

/* Hero Section */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 8rem 2rem 4rem;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: float 20s infinite ease-in-out;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: var(--primary-gradient);
  top: -200px;
  left: -200px;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: var(--secondary-gradient);
  bottom: -150px;
  right: -150px;
  animation-delay: 5s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: var(--accent-gradient);
  top: 50%;
  right: 10%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.hero-content {
  max-width: 1200px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-text {
  animation: fadeInUp 1s ease-out;
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.gradient-text {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 1.25rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 2rem;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.btn-secondary {
  background: var(--dark-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--dark-surface-hover);
  transform: translateY(-2px);
}

.btn-full {
  width: 100%;
}

.hero-visual {
  position: relative;
  height: 500px;
  animation: fadeInRight 1s ease-out;
}

.floating-card {
  position: absolute;
  background: var(--dark-surface);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: floatCard 6s infinite ease-in-out;
}

.card-1 {
  top: 0;
  left: 0;
  animation-delay: 0s;
}

.card-2 {
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  animation-delay: 2s;
}

.card-3 {
  bottom: 0;
  left: 20%;
  animation-delay: 4s;
}

@keyframes floatCard {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(2deg);
  }
}

.card-content {
  text-align: center;
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.card-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
}

/* Features Section */
.features {
  padding: 8rem 2rem;
  background: var(--dark-surface);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.section-description {
  font-size: 1.25rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: var(--dark-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 2.5rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-10px);
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.2);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1.5rem;
}

.feature-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.feature-description {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* About Section */
.about {
  padding: 8rem 2rem;
}

.about-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.about-description {
  font-size: 1.125rem;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 1.5rem;
}

.about-stats {
  display: flex;
  gap: 3rem;
  margin-top: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.about-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.visual-card {
  background: var(--dark-surface);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 3rem;
  text-align: center;
  max-width: 400px;
}

.visual-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

.visual-content h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.visual-content p {
  color: var(--text-secondary);
}

/* Contact Section */
.contact {
  padding: 8rem 2rem;
  background: var(--dark-surface);
}

.contact-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 4rem;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-item {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.info-icon {
  font-size: 2rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dark-bg);
  border-radius: 12px;
  flex-shrink: 0;
}

.info-item h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.info-item p {
  color: var(--text-secondary);
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--text-primary);
}

.form-group input,
.form-group textarea {
  padding: 1rem;
  background: var(--dark-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Responsive Design */
@media (max-width: 968px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-title {
    font-size: 3rem;
  }

  .about-content {
    grid-template-columns: 1fr;
  }

  .contact-content {
    grid-template-columns: 1fr;
  }

  .nav-menu {
    gap: 1rem;
  }

  .hero-visual {
    height: 400px;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .section-title {
    font-size: 2rem;
  }

  .nav-menu {
    flex-direction: column;
    gap: 0.5rem;
  }

  .hero-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}`,
      language: 'css',
      isMain: false,
    },
  ],
};

async function createSampleProject() {
  try {
    console.log('Creating sample project...');

    // Step 1: Create the project
    const projectResponse = await fetch('http://localhost:3000/api/app-projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: PROJECT_DATA.title,
        description: PROJECT_DATA.description,
        type: PROJECT_DATA.type,
        framework: PROJECT_DATA.framework,
      }),
    });

    if (!projectResponse.ok) {
      const error = await projectResponse.json();
      throw new Error(`Failed to create project: ${error.error || projectResponse.statusText}`);
    }

    const project = await projectResponse.json();
    console.log('✅ Project created:', project.id);

    // Step 2: Create all files
    console.log('Creating files...');
    for (const file of PROJECT_DATA.files) {
      const fileResponse = await fetch(`http://localhost:3000/api/app-projects/${project.id}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(file),
      });

      if (!fileResponse.ok) {
        const error = await fileResponse.json();
        console.error(`❌ Failed to create ${file.path}:`, error.error || fileResponse.statusText);
      } else {
        console.log(`✅ Created: ${file.path}`);
      }
    }

    console.log('\n🎉 Sample project created successfully!');
    console.log(`Project ID: ${project.id}`);
    console.log(`Project Title: ${project.title}`);
    console.log('\nYou can now view it in the App Builder.');
  } catch (error) {
    console.error('❌ Error creating sample project:', error.message);
    console.error('\nMake sure:');
    console.error('1. The development server is running (npm run dev)');
    console.error('2. You are authenticated (logged in)');
    console.error('3. The database is connected');
  }
}

// Run the script
createSampleProject();


