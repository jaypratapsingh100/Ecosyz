/**
 * Sample portfolio project: config and file contents for the "Sample Project" in Studio.
 * Keeps studio page.tsx lean and makes it easy to change the sample later.
 */

export const SAMPLE_PORTFOLIO_PROJECT = {
  title: 'Portfolio Website',
  description: 'A simple, modern portfolio website with clean design',
  type: 'web' as const,
  framework: 'html',
  appType: 'portfolio',
  previewVersion: 'v2' as const,
};

const PORTFOLIO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Portfolio</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Navigation -->
  <nav class="navbar">
    <div class="container">
      <div class="logo">Portfolio</div>
      <ul class="nav-links">
        <li><a href="#home">Home</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#skills">Skills</a></li>
        <li><a href="#projects">Projects</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </div>
  </nav>

  <!-- Hero Section -->
  <section id="home" class="hero">
    <div class="container">
      <h1 class="hero-title">Hi, I'm <span class="highlight">John Doe</span></h1>
      <p class="hero-subtitle">Web Developer & Designer</p>
      <p class="hero-description">I create beautiful and functional websites</p>
      <a href="#contact" class="btn-primary">Get In Touch</a>
    </div>
  </section>

  <!-- About Section -->
  <section id="about" class="about">
    <div class="container">
      <h2 class="section-title">About Me</h2>
      <div class="about-content">
        <div class="about-text">
          <p>I'm a passionate web developer with over 5 years of experience creating modern, responsive websites and web applications.</p>
          <p>I specialize in front-end development and love turning complex problems into simple, beautiful, and intuitive designs.</p>
          <p>When I'm not coding, you can find me exploring new technologies, contributing to open-source projects, or enjoying a good cup of coffee.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Skills Section -->
  <section id="skills" class="skills">
    <div class="container">
      <h2 class="section-title">Skills</h2>
      <div class="skills-grid">
        <div class="skill-card">
          <div class="skill-icon">💻</div>
          <h3>Frontend</h3>
          <p>HTML, CSS, JavaScript, React</p>
        </div>
        <div class="skill-card">
          <div class="skill-icon">🎨</div>
          <h3>Design</h3>
          <p>UI/UX, Figma, Adobe XD</p>
        </div>
        <div class="skill-card">
          <div class="skill-icon">⚙️</div>
          <h3>Backend</h3>
          <p>Node.js, Python, Databases</p>
        </div>
        <div class="skill-card">
          <div class="skill-icon">🚀</div>
          <h3>Tools</h3>
          <p>Git, Docker, AWS, CI/CD</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Projects Section -->
  <section id="projects" class="projects">
    <div class="container">
      <h2 class="section-title">Projects</h2>
      <div class="projects-grid">
        <div class="project-card">
          <div class="project-image">📱</div>
          <h3>Web Application</h3>
          <p>A responsive web app with modern UI and clear user flows.</p>
          <a href="#" class="project-link">View Project →</a>
        </div>
        <div class="project-card">
          <div class="project-image">📊</div>
          <h3>Dashboard Analytics</h3>
          <p>Real-time analytics dashboard with interactive charts and data visualization.</p>
          <a href="#" class="project-link">View Project →</a>
        </div>
        <div class="project-card">
          <div class="project-image">🌐</div>
          <h3>Portfolio Website</h3>
          <p>A modern, responsive portfolio website showcasing my work and skills.</p>
          <a href="#" class="project-link">View Project →</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Contact Section -->
  <section id="contact" class="contact">
    <div class="container">
      <h2 class="section-title">Get In Touch</h2>
      <div class="contact-content">
        <p>I'm always open to discussing new projects, creative ideas, or opportunities to be part of your visions.</p>
        <div class="contact-info">
          <div class="contact-item">
            <strong>Email:</strong> john.doe@example.com
          </div>
          <div class="contact-item">
            <strong>Phone:</strong> +1 (555) 123-4567
          </div>
          <div class="contact-item">
            <strong>Location:</strong> San Francisco, CA
          </div>
        </div>
        <div class="social-links">
          <a href="#" class="social-link">LinkedIn</a>
          <a href="#" class="social-link">GitHub</a>
          <a href="#" class="social-link">Twitter</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <p>&copy; 2024 John Doe. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;

const PORTFOLIO_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  line-height: 1.6;
  color: #333;
  scroll-behavior: smooth;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Navigation */
.navbar {
  background: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 20px;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
}

.nav-links {
  display: flex;
  list-style: none;
  gap: 2rem;
}

.nav-links a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: #667eea;
}

/* Hero Section */
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 120px 0;
  text-align: center;
}

.hero-title {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.highlight {
  color: #ffd700;
}

.hero-subtitle {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  opacity: 0.9;
}

.hero-description {
  font-size: 1.1rem;
  margin-bottom: 2rem;
  opacity: 0.8;
}

.btn-primary {
  display: inline-block;
  padding: 12px 30px;
  background: white;
  color: #667eea;
  text-decoration: none;
  border-radius: 30px;
  font-weight: 600;
  transition: transform 0.3s, box-shadow 0.3s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(0,0,0,0.2);
}

/* Section Styles */
section {
  padding: 80px 0;
}

.section-title {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 3rem;
  color: #333;
}

/* About Section */
.about {
  background: #f8f9fa;
}

.about-text {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.about-text p {
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  color: #666;
  line-height: 1.8;
}

/* Skills Section */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.skill-card {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.skill-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.skill-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.skill-card h3 {
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
  color: #333;
}

.skill-card p {
  color: #666;
}

/* Projects Section */
.projects {
  background: #f8f9fa;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.project-card {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.project-image {
  font-size: 4rem;
  text-align: center;
  margin-bottom: 1rem;
}

.project-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #333;
}

.project-card p {
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.project-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s;
}

.project-link:hover {
  color: #764ba2;
}

/* Contact Section */
.contact-content {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.contact-content > p {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 2rem;
}

.contact-info {
  margin-bottom: 2rem;
}

.contact-item {
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: #333;
}

.contact-item strong {
  color: #667eea;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
}

.social-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  padding: 10px 20px;
  border: 2px solid #667eea;
  border-radius: 25px;
  transition: all 0.3s;
}

.social-link:hover {
  background: #667eea;
  color: white;
}

/* Footer */
.footer {
  background: #333;
  color: white;
  text-align: center;
  padding: 2rem 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .nav-links {
    flex-direction: column;
    gap: 1rem;
  }

  .skills-grid,
  .projects-grid {
    grid-template-columns: 1fr;
  }

  .social-links {
    flex-direction: column;
    align-items: center;
  }
}`;

export interface SampleProjectFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isMain: boolean;
}

export const SAMPLE_PORTFOLIO_FILES: SampleProjectFile[] = [
  {
    path: 'index.html',
    name: 'index.html',
    content: PORTFOLIO_HTML,
    language: 'html',
    isMain: true,
  },
  {
    path: 'styles.css',
    name: 'styles.css',
    content: PORTFOLIO_CSS,
    language: 'css',
    isMain: false,
  },
];
