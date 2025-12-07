/**
 * Deep debug script for preview rendering issues
 * Run with: node scripts/debug-preview.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPreview() {
  try {
    console.log('🔍 Deep Preview Debugging...\n');

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
      console.log('❌ No projects found');
      return;
    }

    // Focus on Grok project (the one that's not rendering)
    const grokProject = projects.find(p => p.title === 'test') || projects[0];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 Analyzing Project: ${grokProject.title}`);
    console.log(`   ID: ${grokProject.id}`);
    console.log(`   Type: ${grokProject.type}`);
    console.log(`   Framework: ${grokProject.framework || 'N/A'}`);
    console.log(`   Files: ${grokProject.files.length}`);

    // Detailed file analysis
    const htmlFiles = grokProject.files.filter(f => f.path.endsWith('.html'));
    const jsFiles = grokProject.files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
    const cssFiles = grokProject.files.filter(f => f.path.endsWith('.css'));

    console.log(`\n📊 File Breakdown:`);
    console.log(`   HTML: ${htmlFiles.length}`);
    console.log(`   JS/JSX: ${jsFiles.length}`);
    console.log(`   CSS: ${cssFiles.length}`);

    // Check HTML file content
    if (htmlFiles.length > 0) {
      console.log(`\n📄 HTML File Analysis:`);
      htmlFiles.forEach(html => {
        console.log(`   File: ${html.path}`);
        console.log(`   Size: ${html.content.length} chars`);
        const content = html.content.toLowerCase();
        const hasReact = content.includes('react');
        const hasBabel = content.includes('babel');
        const hasRoot = content.includes('root');
        const hasScript = content.includes('<script');
        console.log(`   Has React: ${hasReact}`);
        console.log(`   Has Babel: ${hasBabel}`);
        console.log(`   Has Root: ${hasRoot}`);
        console.log(`   Has Script: ${hasScript}`);
        console.log(`   First 500 chars:`);
        console.log(`   ${html.content.substring(0, 500).replace(/\n/g, '\\n')}`);
      });
    }

    // Check App file
    const appFiles = jsFiles.filter(f => 
      (f.path.includes('App') || f.name.includes('App')) && 
      !f.path.includes('index')
    );
    
    console.log(`\n📱 App File Analysis:`);
    if (appFiles.length === 0) {
      console.log(`   ❌ NO APP FILE FOUND!`);
    } else {
      appFiles.forEach(app => {
        console.log(`   File: ${app.path}`);
        console.log(`   Name: ${app.name}`);
        console.log(`   isMain: ${app.isMain}`);
        console.log(`   Language: ${app.language || 'unknown'}`);
        console.log(`   Content length: ${app.content.length} chars`);
        console.log(`   Has imports: ${app.content.includes('import')}`);
        console.log(`   Has exports: ${app.content.includes('export')}`);
        console.log(`   Has return: ${app.content.includes('return')}`);
        console.log(`   Full content:`);
        console.log(`   ${'─'.repeat(70)}`);
        console.log(app.content);
        console.log(`   ${'─'.repeat(70)}`);
      });
    }

    // Check index file
    const indexFiles = jsFiles.filter(f => 
      f.path.includes('index') || f.name.toLowerCase().includes('index')
    );
    
    console.log(`\n📑 Index File Analysis:`);
    if (indexFiles.length === 0) {
      console.log(`   ⚠️  No index file found`);
    } else {
      indexFiles.forEach(idx => {
        console.log(`   File: ${idx.path}`);
        console.log(`   isMain: ${idx.isMain}`);
        console.log(`   Content:`);
        console.log(idx.content.substring(0, 300));
      });
    }

    // Check component files
    const componentFiles = jsFiles.filter(f => 
      !f.path.includes('App') && 
      !f.name.includes('App') &&
      !f.path.includes('index') &&
      !f.name.toLowerCase().includes('index')
    );

    console.log(`\n🧩 Component Files (${componentFiles.length}):`);
    componentFiles.forEach(comp => {
      console.log(`   - ${comp.path} (${comp.language || 'unknown'})`);
      // Check if component has proper export
      const hasExport = comp.content.includes('export');
      const hasDefaultExport = comp.content.includes('export default');
      const hasFunction = comp.content.includes('function') || comp.content.includes('const') || comp.content.includes('=>');
      console.log(`     Has export: ${hasExport}, Has default export: ${hasDefaultExport}, Has function: ${hasFunction}`);
    });

    // Simulate preview route logic
    console.log(`\n🔧 Preview Route Logic Simulation:`);
    
    const isCompleteReactHTML = htmlFiles.length > 0 && htmlFiles.some(html => {
      const content = html.content.toLowerCase();
      return content.includes('react') && 
             (content.includes('unpkg.com/react') || content.includes('cdn.jsdelivr.net/react') || content.includes('root')) &&
             content.includes('script') &&
             content.includes('babel');
    });

    console.log(`   isCompleteReactHTML: ${isCompleteReactHTML}`);
    console.log(`   Will use HTML directly: ${htmlFiles.length > 0 && isCompleteReactHTML && jsFiles.length === 0}`);
    console.log(`   Will build from JS: ${jsFiles.length > 0}`);

    if (jsFiles.length > 0) {
      // Find App file using same logic as preview route
      const appFileCandidates = jsFiles.filter(f => 
        (f.path.includes('App') || f.name.includes('App')) && 
        !f.path.includes('index')
      );
      
      const appFile = appFileCandidates.find(f => f.isMain && (f.name === 'App.js' || f.path.includes('App.js'))) ||
                     appFileCandidates.find(f => f.name === 'App.js' || f.path.includes('App.js')) ||
                     appFileCandidates.find(f => f.isMain) ||
                     appFileCandidates[0] ||
                     jsFiles.find(f => f.name === 'App.js' || f.name === 'App.jsx');

      console.log(`   Selected App file: ${appFile ? appFile.path : 'NOT FOUND'}`);
      
      if (!appFile) {
        console.log(`   ❌ CRITICAL: No App file found! This will cause rendering to fail.`);
      } else {
        // Check if App file can be rendered
        const appContent = appFile.content;
        const hasReactImport = appContent.includes("import React") || appContent.includes("from 'react'") || appContent.includes('from "react"');
        const hasComponentDefinition = appContent.match(/(?:function|const)\s+\w+\s*[=(]/);
        const hasReturn = appContent.includes('return');
        const hasJSX = appContent.includes('<') && appContent.includes('>');
        
        console.log(`   App file checks:`);
        console.log(`     Has React import: ${hasReactImport}`);
        console.log(`     Has component definition: ${!!hasComponentDefinition}`);
        console.log(`     Has return: ${hasReturn}`);
        console.log(`     Has JSX: ${hasJSX}`);
        
        if (!hasComponentDefinition) {
          console.log(`   ⚠️  WARNING: App file might not have proper component definition`);
        }
        if (!hasReturn || !hasJSX) {
          console.log(`   ⚠️  WARNING: App file might not have JSX return`);
        }
      }
    }

    console.log(`\n${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPreview();

