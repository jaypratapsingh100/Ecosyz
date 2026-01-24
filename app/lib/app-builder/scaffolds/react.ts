/**
 * React scaffold template files
 */

export interface ScaffoldFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isMain: boolean;
}

export const reactScaffold: ScaffoldFile[] = [
  {
    path: 'src/App.jsx',
    name: 'App.jsx',
    content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Welcome to Your React App</h1>
      <p>Start building your application here.</p>
    </div>
  );
}

export default App;`,
    language: 'jsx',
    isMain: true,
  },
  {
    path: 'src/index.js',
    name: 'index.js',
    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    language: 'javascript',
    isMain: false,
  },
  {
    path: 'src/index.css',
    name: 'index.css',
    content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.App {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}`,
    language: 'css',
    isMain: false,
  },
  {
    path: 'index.html',
    name: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
    language: 'html',
    isMain: false,
  },
];
