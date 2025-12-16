/**
 * Script to compare sample projects vs Grok-created projects
 * Run with: node scripts/compare-projects.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareProjects() {
  try {
    console.log('🔍 Comparing projects...\n');

    // Get all projects
    const projects = await prisma.appProject.findMany({
      include: {
        files: {
          orderBy: { path: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (projects.length === 0) {
      console.log('❌ No projects found in database');
      return;
    }

    console.log(`Found ${projects.length} project(s)\n`);

    // Analyze each project
    for (const project of projects) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📁 Project: ${project.title}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Type: ${project.type}`);
      console.log(`   Framework: ${project.framework || 'N/A'}`);
      console.log(`   Created: ${project.createdAt}`);
      console.log(`   Files: ${project.files.length}`);

      if (project.files.length === 0) {
        console.log('   ⚠️  No files found!');
        continue;
      }

      // File analysis
      console.log(`\n   📄 Files:`);
      const htmlFiles = project.files.filter(f => f.path.endsWith('.html'));
      const jsFiles = project.files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
      const cssFiles = project.files.filter(f => f.path.endsWith('.css'));
      const mainFiles = project.files.filter(f => f.isMain);

      console.log(`      - HTML: ${htmlFiles.length}`);
      console.log(`      - JS/JSX: ${jsFiles.length}`);
      console.log(`      - CSS: ${cssFiles.length}`);
      console.log(`      - Main files: ${mainFiles.length}`);

      // List all files
      console.log(`\n   📋 File List:`);
      project.files.forEach((file, idx) => {
        const mainFlag = file.isMain ? '⭐ MAIN' : '';
        const lang = file.language || 'unknown';
        console.log(`      ${idx + 1}. ${file.path} (${lang}) ${mainFlag}`);
      });

      // Check for App.js
      const appFile = project.files.find(f => 
        f.path.includes('App.js') || 
        f.path.includes('App.jsx') ||
        f.name === 'App.js' ||
        f.name === 'App.jsx'
      );

      if (appFile) {
        console.log(`\n   ✅ App.js found: ${appFile.path}`);
        console.log(`      - isMain: ${appFile.isMain}`);
        console.log(`      - Content preview (first 200 chars):`);
        console.log(`        ${appFile.content.substring(0, 200).replace(/\n/g, ' ')}...`);
        
        // Check if App.js imports components
        const hasImports = appFile.content.includes('import');
        const hasExports = appFile.content.includes('export');
        const hasReturn = appFile.content.includes('return');
        
        console.log(`      - Has imports: ${hasImports}`);
        console.log(`      - Has exports: ${hasExports}`);
        console.log(`      - Has return: ${hasReturn}`);
        
        // Extract component imports
        const importMatches = appFile.content.match(/import\s+(\w+)\s+from\s+['"](.+?)['"]/g);
        if (importMatches) {
          console.log(`      - Component imports:`);
          importMatches.forEach(imp => console.log(`        ${imp}`));
        }
      } else {
        console.log(`\n   ⚠️  App.js NOT FOUND!`);
        if (jsFiles.length > 0) {
          console.log(`      First JS file: ${jsFiles[0].path}`);
        }
      }

      // Check for index.js
      const indexFile = project.files.find(f => 
        f.path.includes('index.js') || 
        f.path.includes('index.jsx') ||
        f.name === 'index.js' ||
        f.name === 'index.jsx'
      );

      if (indexFile) {
        console.log(`\n   ✅ Index.js found: ${indexFile.path}`);
      }

      // Component files
      const componentFiles = jsFiles.filter(f => 
        f.id !== appFile?.id && 
        f.id !== indexFile?.id
      );

      console.log(`\n   🧩 Component files: ${componentFiles.length}`);
      componentFiles.forEach(comp => {
        console.log(`      - ${comp.path}`);
      });

      // Preview rendering check
      console.log(`\n   🔍 Preview Rendering Analysis:`);
      if (htmlFiles.length > 0) {
        console.log(`      ✅ Has HTML files - should render directly`);
      } else if (jsFiles.length > 0) {
        if (appFile) {
          console.log(`      ✅ Has App.js - should render React app`);
        } else {
          console.log(`      ⚠️  Has JS files but no App.js - might not render correctly`);
        }
      } else {
        console.log(`      ⚠️  No renderable files found`);
      }
    }

    console.log(`\n${'='.repeat(80)}\n`);
    console.log('✅ Comparison complete!');
  } catch (error) {
    console.error('❌ Error comparing projects:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareProjects();


