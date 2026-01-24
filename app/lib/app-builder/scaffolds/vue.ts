/**
 * Vue.js scaffold template files
 */

import type { ScaffoldFile } from './react';

export const vueScaffold: ScaffoldFile[] = [
  {
    path: 'index.html',
    name: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="main.js"></script>
</body>
</html>`,
    language: 'html',
    isMain: true,
  },
  {
    path: 'main.js',
    name: 'main.js',
    content: `const { createApp } = Vue;

createApp({
  data() {
    return {
      title: 'Welcome to Your Vue App',
      subtitle: 'Start building your application here.',
    };
  },
  template: \`
    <div class="app">
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
    </div>
  \`,
}).mount('#app');`,
    language: 'javascript',
    isMain: false,
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
  font-family: Avenir, Helvetica, Arial, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
}

p {
  color: #94a3b8;
}`,
    language: 'css',
    isMain: false,
  },
];
