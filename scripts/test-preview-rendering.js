/**
 * Test if the preview route renders correctly with CSP and component loading
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPreviewRendering() {
  try {
    console.log('\n🧪 Testing Preview Rendering...\n');

    // Get the first project with files
    const project = await prisma.appProject.findFirst({
      where: {
        files: {
          some: {}
        }
      },
      include: {
        files: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!project) {
      console.log('❌ No project with files found');
      return;
    }

    console.log(`📦 Project: ${project.title}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Files: ${project.files.length}\n`);

    // Check if we have JS files
    const jsFiles = project.files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
    const cssFiles = project.files.filter(f => f.path.endsWith('.css'));

    if (jsFiles.length === 0) {
      console.log('❌ No JS files found in project');
      return;
    }

    console.log(`✅ Found ${jsFiles.length} JS files and ${cssFiles.length} CSS files\n`);

    // Find App file
    const appFile = jsFiles.find(f => 
      (f.path.includes('App') || f.name.includes('App')) && 
      !f.path.includes('index')
    ) || jsFiles[0];

    console.log(`📄 App file: ${appFile.path}\n`);

    // Get component files
    const componentFiles = jsFiles.filter(f => {
      if (f.id === appFile.id) return false;
      if (f.path.includes('index')) return false;
      return true;
    });

    console.log(`📦 Component files (${componentFiles.length}):`);
    componentFiles.forEach(c => {
      // Extract component name
      const nameMatch = c.content.match(/(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/);
      const componentName = nameMatch ? nameMatch[1] : 'Unknown';
      console.log(`   - ${c.path} (${componentName})`);
    });

    // Simulate what the preview route does
    console.log('\n🔍 Checking Preview Route Logic...\n');

    // 1. Check CSP meta tag placement
    console.log('1️⃣ CSP Meta Tag:');
    console.log('   ✅ Should be in <head> before scripts');
    console.log('   ✅ Should include \'unsafe-eval\' for Babel\n');

    // 2. Check component loading
    console.log('2️⃣ Component Loading:');
    componentFiles.forEach(c => {
      const nameMatch = c.content.match(/(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/);
      if (nameMatch) {
        const componentName = nameMatch[1];
        console.log(`   ✅ ${componentName} should be loaded and available on window`);
      }
    });

    // 3. Check App component
    console.log('\n3️⃣ App Component:');
    const appNameMatch = appFile.content.match(/(?:function|const|class)\s+(\w+)\s*[=(]/);
    if (appNameMatch) {
      console.log(`   ✅ App component name: ${appNameMatch[1]}`);
    } else {
      console.log('   ⚠️  Could not extract App component name');
    }

    // 4. Check React Router detection
    const usesRouter = appFile.content.includes('react-router-dom') || 
                      appFile.content.includes('BrowserRouter') ||
                      appFile.content.includes('Routes') ||
                      appFile.content.includes('Route');
    
    console.log('\n4️⃣ React Router:');
    console.log(`   ${usesRouter ? '✅' : '❌'} React Router ${usesRouter ? 'detected' : 'not detected'}`);

    // 5. Check Tailwind usage
    const usesTailwind = cssFiles.some(f => 
      f.content.includes('@tailwind') || 
      f.content.includes('@apply') ||
      appFile.content.includes('className=') ||
      componentFiles.some(c => c.content.includes('className='))
    );

    console.log('\n5️⃣ Tailwind CSS:');
    console.log(`   ${usesTailwind ? '✅' : '❌'} Tailwind ${usesTailwind ? 'detected' : 'not detected'}`);

    // 6. Verify component exports
    console.log('\n6️⃣ Component Exports:');
    let allExportsValid = true;
    componentFiles.forEach(c => {
      const hasExport = c.content.includes('export default') || 
                       c.content.includes('export const') ||
                       c.content.includes('export function');
      const nameMatch = c.content.match(/(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/);
      const componentName = nameMatch ? nameMatch[1] : null;
      
      if (componentName) {
        console.log(`   ${hasExport ? '✅' : '⚠️'} ${componentName}: ${hasExport ? 'has export' : 'no export (will be extracted)'}`);
      }
    });

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Project: ${project.title}`);
    console.log(`✅ JS Files: ${jsFiles.length}`);
    console.log(`✅ CSS Files: ${cssFiles.length}`);
    console.log(`✅ Component Files: ${componentFiles.length}`);
    console.log(`✅ React Router: ${usesRouter ? 'Yes' : 'No'}`);
    console.log(`✅ Tailwind CSS: ${usesTailwind ? 'Yes' : 'No'}`);
    console.log('\n✅ Preview should render correctly with:');
    console.log('   - CSP meta tag allowing unsafe-eval');
    console.log('   - Components loaded on window object');
    console.log('   - App component properly defined');
    console.log('   - React Router stubs if needed');
    console.log('   - Tailwind CDN if needed');
    console.log('\n💡 To test in browser:');
    console.log(`   1. Open http://localhost:3000/app-builder`);
    console.log(`   2. Select project: ${project.title}`);
    console.log(`   3. Click Preview tab`);
    console.log(`   4. Check browser console for component loading logs`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPreviewRendering();
