/**
 * Test the full preview generation with the fixed logic
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFullPreview() {
  try {
    const project = await prisma.appProject.findFirst({
      where: { title: 'test' },
      include: { files: { orderBy: { path: 'asc' } } },
    });

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log(`\n🧪 Full Preview Test for: ${project.title}\n`);

    const htmlFiles = project.files.filter(f => f.path.endsWith('.html'));
    const jsFiles = project.files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
    const cssFiles = project.files.filter(f => f.path.endsWith('.css'));

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

      if (!appFile) {
        console.log('❌ No App file found');
        return;
      }

      // Get component files
      const componentFiles = jsFiles.filter(f => {
        if (f.id === appFile.id) return false;
        if (f.path.includes('index')) return false;
        if (appFile && (f.path.includes('App') || f.name.includes('App'))) {
          const appPath = appFile.path.toLowerCase();
          const filePath = f.path.toLowerCase();
          if (appPath.includes('app.js') && filePath.includes('app.jsx')) return false;
          if (appPath.includes('app.jsx') && filePath.includes('app.js')) return false;
        }
        return true;
      });

      // Build combined JS with FIXED logic
      let combinedJs = '';
      
      // Add component files first
      componentFiles.forEach(file => {
        let fileContent = file.content;
        fileContent = fileContent.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
        fileContent = fileContent.replace(/import\s+React[^;]*;?\s*/g, '');
        
        // Handle exports properly
        if (fileContent.match(/export\s+default\s+function\s+\w+\s*\(/)) {
          fileContent = fileContent.replace(/export\s+default\s+function\s+/, 'function ');
        } else if (fileContent.match(/export\s+default\s+const\s+\w+\s*=/)) {
          fileContent = fileContent.replace(/export\s+default\s+const\s+/, 'const ');
        } else if (fileContent.includes('export default')) {
          fileContent = fileContent.replace(/export\s+default\s+\w+\s*;?\s*/g, '');
          fileContent = fileContent.replace(/export\s+default\s+/g, '');
        } else if (fileContent.includes('export ')) {
          fileContent = fileContent.replace(/export\s+/g, '');
        }
        
        combinedJs += `\n// ${file.path}\n${fileContent}\n`;
      });

      // Process App file
      let appContent = appFile.content;
      appContent = appContent.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
      appContent = appContent.replace(/import\s+React[^;]*;?\s*/g, '');
      
      if (appContent.includes('export default')) {
        const funcMatch = appContent.match(/export\s+default\s+function\s+(\w+)\s*\(/);
        if (funcMatch) {
          const funcName = funcMatch[1];
          appContent = appContent.replace(/export\s+default\s+function\s+(\w+)/, 'function $1');
          combinedJs += `\n// ${appFile.path} - App component\n${appContent}\nconst App = ${funcName};\n`;
        } else {
          appContent = appContent.replace(/export\s+default\s+\w+\s*;?\s*/g, '');
          appContent = appContent.replace(/export\s+default\s+/g, '');
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
          appContent = appContent.replace(/export\s+default\s+\w+\s*;?\s*/g, '');
          appContent = appContent.replace(/export\s+default\s+/g, '');
          appContent = appContent.replace(/export\s+/g, '');
          combinedJs += `\n// ${appFile.path} - App component\n${appContent}\nconst App = ${componentMatch[1]};\n`;
        }
      }

      console.log('✅ Generated Combined JS:');
      console.log(`${'─'.repeat(70)}`);
      console.log(combinedJs);
      console.log(`${'─'.repeat(70)}\n`);

      // Check if components are defined
      const componentNames = componentFiles.map(f => {
        const match = f.content.match(/(?:function|const)\s+(\w+)\s*[=(]/);
        return match ? match[1] : null;
      }).filter(Boolean);

      console.log('📦 Component names found:', componentNames);
      
      // Check if App uses these components
      const appUsesComponents = componentNames.filter(name => 
        combinedJs.includes(`<${name}`) || combinedJs.includes(`<${name} `)
      );
      console.log('✅ App uses components:', appUsesComponents);
      
      // Check if App is defined
      const hasApp = combinedJs.includes('const App') || combinedJs.includes('function App');
      console.log(`✅ App defined: ${hasApp}`);
      
      if (!hasApp) {
        console.log('\n❌ ERROR: App is not defined!');
      }

      // Check if all components are defined
      const missingComponents = componentNames.filter(name => !combinedJs.includes(`function ${name}`) && !combinedJs.includes(`const ${name}`));
      if (missingComponents.length > 0) {
        console.log(`\n⚠️  Missing components: ${missingComponents.join(', ')}`);
      } else {
        console.log('\n✅ All components are defined');
      }

    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullPreview();

