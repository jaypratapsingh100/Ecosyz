// Test script to create a simple app manually and test preview generation
const testResponse = `
I understand you want to create a portfolio app. Here's a complete, production-ready portfolio application:

\`\`\`file:src/App.jsx
import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>My Portfolio</h1>
        <p>Welcome to my portfolio website!</p>
      </header>
    </div>
  );
}

export default App;
\`\`\`

\`\`\`file:src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
\`\`\`

\`\`\`file:src/App.css
.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 40px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.App-header h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
}

.App-header p {
  font-size: 1.2rem;
}
\`\`\`

\`\`\`file:public/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My Portfolio</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
\`\`\`
`;

console.log('Test response format:');
console.log(testResponse);

// Test the regex parsing
const codeBlockRegex = /```(?:file:)?([^\n`]+)\n([\s\S]*?)```/g;
let match;
let files = [];

while ((match = codeBlockRegex.exec(testResponse)) !== null) {
  const filePath = match[1].trim().replace(/^file:/, '');
  const fileContent = match[2].trim();
  files.push({ path: filePath, content: fileContent });
  console.log(`Found file: ${filePath}`);
}

console.log(`Total files found: ${files.length}`);
files.forEach(f => console.log(`- ${f.path}`));