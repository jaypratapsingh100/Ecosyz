/**
 * Test the preview API endpoint directly
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPreview() {
  try {
    // Get the Grok project
    const project = await prisma.appProject.findFirst({
      where: { title: 'test' },
      include: {
        files: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log(`\n🧪 Testing Preview for Project: ${project.title}`);
    console.log(`   ID: ${project.id}\n`);

    // Simulate the preview route logic
    const htmlFiles = project.files.filter(f => f.path.endsWith('.html'));
    const jsFiles = project.files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
    const cssFiles = project.files.filter(f => f.path.endsWith('.css'));

    console.log('📊 Files:');
    console.log(`   HTML: ${htmlFiles.length}`);
    console.log(`   JS: ${jsFiles.length}`);
    console.log(`   CSS: ${cssFiles.length}\n`);

    if (jsFiles.length > 0) {
      const cssContent = cssFiles.map(f => f.content).join('\n\n');
      
      // Find App file
      const appFileCandidates = jsFiles.filter(f => 
        (f.path.includes('App') || f.name.includes('App')) && 
        !f.path.includes('index')
      );
      
      const appFile = appFileCandidates.find(f => f.isMain && (f.name === 'App.js' || f.path.includes('App.js'))) ||
                     appFileCandidates.find(f => f.name === 'App.js' || f.path.includes('App.js')) ||
                     appFileCandidates.find(f => f.isMain) ||
                     appFileCandidates[0];

      console.log(`✅ Selected App file: ${appFile?.path || 'NOT FOUND'}\n`);

      if (!appFile) {
        console.log('❌ No App file found!');
        return;
      }

      // Get component files
      const componentFiles = jsFiles.filter(f => {
        if (f.id === appFile.id) return false;
        if (f.path.includes('index')) return false;
        // Exclude duplicate App files
        if (appFile && (f.path.includes('App') || f.name.includes('App'))) {
          const appPath = appFile.path.toLowerCase();
          const filePath = f.path.toLowerCase();
          if (appPath.includes('app.js') && filePath.includes('app.jsx')) return false;
          if (appPath.includes('app.jsx') && filePath.includes('app.js')) return false;
        }
        return true;
      });

      console.log(`📦 Component files (${componentFiles.length}):`);
      componentFiles.forEach(c => console.log(`   - ${c.path}`));

      // Build combined JS
      let combinedJs = '';
      
      // Add component files first
      componentFiles.forEach(file => {
        let fileContent = file.content;
        fileContent = fileContent.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
        fileContent = fileContent.replace(/import\s+React[^;]*;?\s*/g, '');
        fileContent = fileContent.replace(/export\s+default\s+/, '');
        fileContent = fileContent.replace(/export\s+/, '');
        combinedJs += `\n// ${file.path}\n${fileContent}\n`;
      });

      // Process App file
      let appContent = appFile.content;
      
      // Remove imports
      appContent = appContent.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
      appContent = appContent.replace(/import\s+React[^;]*;?\s*/g, '');
      
      // Handle export default
      if (appContent.includes('export default')) {
        const funcMatch = appContent.match(/export\s+default\s+function\s+(\w+)\s*\(/);
        if (funcMatch) {
          const funcName = funcMatch[1];
          appContent = appContent.replace(/export\s+default\s+function\s+(\w+)/, 'function $1');
          combinedJs += `\n// ${appFile.path} - App component\n${appContent}\nconst App = ${funcName};\n`;
        } else {
          appContent = appContent.replace(/export\s+default\s+/, '');
          const anonMatch = appContent.match(/(?:function|const|class)\s+(\w+)/);
          if (anonMatch) {
            combinedJs += `\n// ${appFile.path} - App component\n${appContent}\nconst App = ${anonMatch[1]};\n`;
          } else {
            combinedJs += `\n// ${appFile.path} - App component\nconst AppComponent = ${appContent.trim()};\nconst App = AppComponent;\n`;
          }
        }
      } else if (appContent.match(/(?:function|const)\s+App\s*[=(]/)) {
        appContent = appContent.replace(/export\s+default\s+/, '');
        appContent = appContent.replace(/export\s+/, '');
        combinedJs += `\n// ${appFile.path} - App component\n${appContent}\n`;
      } else {
        const componentMatch = appContent.match(/(?:function|const|class)\s+(\w+)/);
        if (componentMatch) {
          appContent = appContent.replace(/export\s+default\s+/, '');
          appContent = appContent.replace(/export\s+/, '');
          combinedJs += `\n// ${appFile.path} - App component\n${appContent}\nconst App = ${componentMatch[1]};\n`;
        }
      }

      console.log(`\n📝 Generated Combined JS (first 1000 chars):`);
      console.log(`${'─'.repeat(70)}`);
      console.log(combinedJs.substring(0, 1000));
      console.log(`${'─'.repeat(70)}\n`);

      // Check if App will be defined
      const willHaveApp = combinedJs.includes('const App') || combinedJs.includes('function App') || combinedJs.includes('const AppComponent');
      console.log(`✅ Will have App defined: ${willHaveApp}`);

      if (!willHaveApp) {
        console.log(`\n❌ PROBLEM: App will not be defined in the generated code!`);
        console.log(`\nFull combined JS:`);
        console.log(combinedJs);
      }

      // Check component imports in App.js
      const appImports = appFile.content.match(/import\s+(\w+)\s+from\s+['"](.+?)['"]/g);
      if (appImports) {
        console.log(`\n📥 App.js imports:`);
        appImports.forEach(imp => {
          const match = imp.match(/import\s+(\w+)\s+from\s+['"](.+?)['"]/);
          if (match) {
            const [, compName, path] = match;
            const compFile = componentFiles.find(f => 
              f.name === `${compName}.js` || 
              f.name === `${compName}.jsx` ||
              f.path.includes(`/${compName}.`) ||
              f.path.includes(`\\${compName}.`)
            );
            console.log(`   ${compName} from ${path} - ${compFile ? '✅ Found' : '❌ NOT FOUND'}`);
          }
        });
      }

    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPreview();


