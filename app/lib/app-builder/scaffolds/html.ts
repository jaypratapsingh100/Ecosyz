/**
 * Plain HTML scaffold template files
 */

import type { ScaffoldFile } from './react';

export const htmlScaffold: ScaffoldFile[] = [
  {
    path: 'index.html',
    name: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Welcome to My Website</h1>
  </header>
  <main>
    <section>
      <h2>About</h2>
      <p>This is a simple HTML website.</p>
    </section>
  </main>
  <footer>
    <p>&copy; 2024 My Website</p>
  </footer>
  <script src="script.js"></script>
</body>
</html>`,
    language: 'html',
    isMain: true,
  },
  {
    path: 'styles.css',
    name: 'styles.css',
    content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}

header {
  background: #333;
  color: #fff;
  padding: 1rem;
  text-align: center;
}

main {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

footer {
  background: #333;
  color: #fff;
  text-align: center;
  padding: 1rem;
  margin-top: 2rem;
}`,
    language: 'css',
    isMain: false,
  },
  {
    path: 'script.js',
    name: 'script.js',
    content: `// Your JavaScript code here
console.log('Welcome to your website!');`,
    language: 'javascript',
    isMain: false,
  },
];
