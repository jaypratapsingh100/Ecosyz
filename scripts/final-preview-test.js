/**
 * Final comprehensive test of preview generation
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalTest() {
  try {
    const project = await prisma.appProject.findFirst({
      where: { title: 'test' },
      include: { files: { orderBy: { path: 'asc' } } },
    });

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log(`\n🎯 Final Preview Test: ${project.title}\n`);

    const htmlFiles = project.files.filter(f => f.path.endsWith('.html'));
    const jsFiles = project.files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
    const cssFiles = project.files.filter(f => f.path.endsWith('.css'));

    // Check HTML detection
    const isCompleteReactHTML = htmlFiles.length > 0 && htmlFiles.some((html) => {
      const content = html.content.toLowerCase();
      return content.includes('react') && 
             (content.includes('unpkg.com/react') || content.includes('cdn.jsdelivr.net/react') || content.includes('root')) &&
             content.includes('script') &&
             content.includes('babel');
    });

    console.log(`📊 Files:`);
    console.log(`   HTML: ${htmlFiles.length} (complete React: ${isCompleteReactHTML})`);
    console.log(`   JS: ${jsFiles.length}`);
    console.log(`   CSS: ${cssFiles.length}`);
    console.log(`   Will build from JS: ${jsFiles.length > 0}\n`);

    if (jsFiles.length > 0) {
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

      console.log(`✅ App file: ${appFile.path}\n`);

      // Process components
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

      console.log(`📦 Components (${componentFiles.length}):`);
      componentFiles.forEach(c => console.log(`   - ${c.path}`));

      // Process components
      let combinedJs = '';
      componentFiles.forEach(file => {
        let fileContent = file.content;
        fileContent = fileContent.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
        fileContent = fileContent.replace(/import\s+React[^;]*;?\s*/g, '');
        
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

      // Process App
      let appContent = appFile.content;
      appContent = appContent.replace(/import\s+.*?from\s+['"]react-router-dom['"];?\s*/g, '');
      appContent = appContent.replace(/import\s+['"].*?\.css['"];?\s*/g, '');
      appContent = appContent.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
      appContent = appContent.replace(/import\s+React[^;]*;?\s*/g, '');

      if (appContent.includes('export default')) {
        const funcMatch = appContent.match(/export\s+default\s+function\s+(\w+)\s*\(/);
        if (funcMatch) {
          const funcName = funcMatch[1];
          appContent = appContent.replace(/export\s+default\s+function\s+(\w+)/, 'function $1');
          combinedJs += `\n// ${appFile.path} - App component\n${appContent}\nconst App = ${funcName};\n`;
        } else {
          const constMatch = appContent.match(/export\s+default\s+const\s+(\w+)\s*=/);
          if (constMatch) {
            const constName = constMatch[1];
            appContent = appContent.replace(/export\s+default\s+const\s+(\w+)/, 'const $1');
            combinedJs += `\n// ${appFile.path} - App component\n${appContent}\nconst App = ${constName};\n`;
          } else {
            const exportRefMatch = appContent.match(/export\s+default\s+(\w+)\s*;/);
            if (exportRefMatch) {
              appContent = appContent.replace(/export\s+default\s+\w+\s*;?\s*/g, '');
              const componentMatch = appContent.match(/(?:function|const|class)\s+(\w+)/);
              if (componentMatch) {
                combinedJs += `\n// ${appFile.path} - App component\n${appContent}\nconst App = ${componentMatch[1]};\n`;
              } else {
                combinedJs += `\n// ${appFile.path} - App component\n${appContent}\n`;
              }
            } else {
              appContent = appContent.replace(/export\s+default\s+/, '');
              const anonMatch = appContent.match(/(?:function|const|class)\s+(\w+)/);
              if (anonMatch) {
                combinedJs += `\n// ${appFile.path} - App component\n${appContent}\nconst App = ${anonMatch[1]};\n`;
              } else {
                combinedJs += `\n// ${appFile.path} - App component\nconst AppComponent = ${appContent.trim()};\nconst App = AppComponent;\n`;
              }
            }
          }
        }
      } else if (appContent.match(/(?:function|const)\s+App\s*[=(]/)) {
        appContent = appContent.replace(/export\s+default\s+/, '');
        appContent = appContent.replace(/export\s+/, '');
        combinedJs += `\n// ${appFile.path} - App component\n${appContent}\n`;
      }

      // Validation
      console.log(`\n✅ Validation:`);
      const hasApp = combinedJs.includes('const App') || combinedJs.includes('function App');
      console.log(`   App defined: ${hasApp}`);
      
      const componentNames = ['Introduction', 'ContactInfo', 'Resources', 'Analytics'];
      const allDefined = componentNames.every(name => 
        combinedJs.includes(`function ${name}`) || combinedJs.includes(`const ${name}`)
      );
      console.log(`   All components defined: ${allDefined}`);
      
      const appUsesAll = componentNames.every(name => 
        combinedJs.includes(`<${name}`) || combinedJs.includes(`<${name} `)
      );
      console.log(`   App uses all components: ${appUsesAll}`);
      
      const noOrphanExports = !combinedJs.match(/\w+\s*;\s*$/m);
      console.log(`   No orphan exports: ${noOrphanExports}`);
      
      const noCssImports = !combinedJs.includes("import './App.css'") && !combinedJs.includes('import "./App.css"');
      console.log(`   No CSS imports: ${noCssImports}`);

      if (hasApp && allDefined && appUsesAll && noOrphanExports && noCssImports) {
        console.log(`\n🎉 SUCCESS! Preview should render correctly.\n`);
      } else {
        console.log(`\n⚠️  Some issues detected. Check above.\n`);
        console.log('Generated code preview:');
        console.log(combinedJs.substring(0, 500));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalTest();






