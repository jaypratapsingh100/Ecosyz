/**
 * Diagnose a specific project - check files, preview, and rendering status
 * Usage: node scripts/diagnose-project.js "project-name"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseProject(projectName) {
  try {
    console.log(`\n🔍 Diagnosing project: "${projectName}"\n`);

    // Find project by name
    const project = await prisma.appProject.findFirst({
      where: {
        title: {
          contains: projectName,
          mode: 'insensitive'
        }
      },
      include: {
        files: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!project) {
      console.log(`❌ Project "${projectName}" not found`);
      console.log('\nAvailable projects:');
      const allProjects = await prisma.appProject.findMany({
        select: { id: true, title: true, _count: { select: { files: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 10
      });
      allProjects.forEach(p => {
        console.log(`  - ${p.title} (${p._count.files} files)`);
      });
      return;
    }

    console.log(`✅ Project found: ${project.title}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Type: ${project.type}`);
    console.log(`   Framework: ${project.framework || 'not set'}`);
    console.log(`   Files: ${project.files.length}\n`);

    // Check files
    const jsFiles = project.files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
    const cssFiles = project.files.filter(f => f.path.endsWith('.css'));
    const htmlFiles = project.files.filter(f => f.path.endsWith('.html'));

    console.log('📁 File Breakdown:');
    console.log(`   JS/JSX: ${jsFiles.length}`);
    console.log(`   CSS: ${cssFiles.length}`);
    console.log(`   HTML: ${htmlFiles.length}\n`);

    // Check for App file
    const appFile = jsFiles.find(f => 
      (f.path.includes('App') || f.name.includes('App')) && 
      !f.path.includes('index')
    );

    if (!appFile) {
      console.log('❌ No App.jsx/App.js file found!');
      console.log('   Available JS files:');
      jsFiles.forEach(f => console.log(`     - ${f.path}`));
    } else {
      console.log(`✅ App file found: ${appFile.path}`);
      console.log(`   Is Main: ${appFile.isMain}`);
      console.log(`   Content length: ${appFile.content.length} chars`);
      
      // Check App file structure
      const content = appFile.content;
      const hasFunction = content.includes('function');
      const hasConst = content.includes('const');
      const hasClass = content.includes('class');
      const hasReturn = content.includes('return');
      const hasExport = content.includes('export') || content.includes('module.exports');
      
      console.log(`\n   Structure check:`);
      console.log(`     Has function/const/class: ${hasFunction || hasConst || hasClass ? '✅' : '❌'}`);
      console.log(`     Has return: ${hasReturn ? '✅' : '❌'}`);
      console.log(`     Has export: ${hasExport ? '✅' : '❌'}`);
      
      // Check for syntax issues
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      
      console.log(`\n   Syntax check:`);
      console.log(`     Braces: ${openBraces} open, ${closeBraces} close ${openBraces === closeBraces ? '✅' : '❌'}`);
      console.log(`     Parentheses: ${openParens} open, ${closeParens} close ${openParens === closeParens ? '✅' : '❌'}`);
      
      if (openBraces !== closeBraces) {
        console.log(`     ⚠️  Unbalanced braces! This will cause rendering issues.`);
      }
      if (openParens !== closeParens) {
        console.log(`     ⚠️  Unbalanced parentheses! This will cause rendering issues.`);
      }
    }

    // Check for index.js
    const indexFile = jsFiles.find(f => f.path.includes('index'));
    if (!indexFile) {
      console.log('\n⚠️  No index.js file found');
    } else {
      console.log(`\n✅ Index file found: ${indexFile.path}`);
    }

    // Check component files
    const componentFiles = jsFiles.filter(f => {
      if (f.id === appFile?.id) return false;
      if (f.path.includes('index')) return false;
      return true;
    });

    console.log(`\n📦 Component files: ${componentFiles.length}`);
    if (componentFiles.length > 0) {
      componentFiles.slice(0, 5).forEach(f => {
        console.log(`   - ${f.path}`);
      });
      if (componentFiles.length > 5) {
        console.log(`   ... and ${componentFiles.length - 5} more`);
      }
    }

    // Check if App imports components
    if (appFile) {
      const imports = appFile.content.match(/import\s+(\w+)\s+from\s+['"](.+?)['"]/g) || [];
      console.log(`\n📥 App.jsx imports: ${imports.length}`);
      if (imports.length > 0) {
        imports.forEach(imp => {
          const match = imp.match(/import\s+(\w+)\s+from\s+['"](.+?)['"]/);
          if (match) {
            const [, compName, path] = match;
            const compFile = componentFiles.find(f => 
              f.name === `${compName}.js` || 
              f.name === `${compName}.jsx` ||
              f.path.includes(`/${compName}.`) ||
              f.path.includes(`\\${compName}.`)
            );
            console.log(`   ${compFile ? '✅' : '❌'} ${compName} from ${path}`);
          }
        });
      }
    }

    // Preview generation check
    console.log(`\n🔍 Preview Generation Check:`);
    if (jsFiles.length === 0) {
      console.log('   ❌ No JS files - preview cannot be generated');
    } else if (!appFile) {
      console.log('   ❌ No App file - preview cannot be generated');
    } else {
      console.log('   ✅ Has JS files and App file - preview should be generatable');
      
      // Check if preview would work
      const hasValidApp = appFile.content.includes('function') || 
                         appFile.content.includes('const') ||
                         appFile.content.includes('class');
      const hasValidReturn = appFile.content.includes('return');
      const hasValidExport = appFile.content.includes('export') || appFile.content.includes('module.exports');
      
      if (hasValidApp && hasValidReturn && hasValidExport) {
        console.log('   ✅ App file structure looks valid');
      } else {
        console.log('   ⚠️  App file may have issues:');
        console.log(`      - Component structure: ${hasValidApp ? '✅' : '❌'}`);
        console.log(`      - Return statement: ${hasValidReturn ? '✅' : '❌'}`);
        console.log(`      - Export statement: ${hasValidExport ? '✅' : '❌'}`);
      }
    }

    // Summary
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`Project: ${project.title}`);
    console.log(`Total Files: ${project.files.length}`);
    console.log(`JS Files: ${jsFiles.length}`);
    console.log(`CSS Files: ${cssFiles.length}`);
    console.log(`App File: ${appFile ? '✅ Found' : '❌ Missing'}`);
    console.log(`Index File: ${indexFile ? '✅ Found' : '❌ Missing'}`);
    console.log(`Components: ${componentFiles.length}`);
    
    if (appFile) {
      const isValid = (appFile.content.includes('function') || appFile.content.includes('const')) &&
                     appFile.content.includes('return') &&
                     (appFile.content.includes('export') || appFile.content.includes('module.exports'));
      console.log(`App File Valid: ${isValid ? '✅' : '❌'}`);
    }
    
    console.log(`\n💡 To test preview:`);
    console.log(`   curl -X POST http://localhost:3000/api/app-projects/${project.id}/preview`);
    console.log(`\n💡 To check files:`);
    console.log(`   curl http://localhost:3000/api/app-projects/${project.id}/files`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get project name from command line
const projectName = process.argv[2] || 'my court';
diagnoseProject(projectName);
