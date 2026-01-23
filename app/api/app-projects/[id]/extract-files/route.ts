import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const project = await prisma.appProject.findUnique({
      where: { id },
      include: { files: { orderBy: { path: 'asc' } } },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Use the same parsing logic from chat route
    const parseAndCreateFiles = async (responseText: string): Promise<Array<{ path: string; success: boolean; error?: string }>> => {
      const createdFiles: Array<{ path: string; success: boolean; error?: string }> = [];

      // Multiple regex patterns to catch different formats
      const filePattern1 = /```(?:file:)?\s*([^\n`]+?)(?:\n|$)([\s\S]*?)```/g;
      const filePattern2 = /```(\w+)?\s*(?:\/\/\s*path:\s*([^\n]+))?\n([\s\S]*?)```/g;
      const filePattern3 = /```\s*(?:file:\s*)?([^\n`]+?)\s*\n([\s\S]*?)```/g;
      const filePattern4 = /```(\w+)?\s*\n\s*([^\n`]+?\.(js|jsx|ts|tsx|css|html|json))\s*\n([\s\S]*?)```/g;
      const filePattern5 = /```\w*\s*\n\/\*\s*file:\s*([^\*\n]+)\s*\*\/\s*\n([\s\S]*?)```/g;
      const filePattern6 = /```\w*\s*\n\/\/\s*file:\s*([^\n]+)\s*\n([\s\S]*?)```/g;
      const filePattern7 = /(?:#####|####|###|##|#)\s*File:\s*([^\n]+?)(?:\.(js|jsx|ts|tsx|css|html|json))\s*\n```(\w+)?\s*\n([\s\S]*?)```/gi;
      const filePattern8 = /File:\s*([^\n]+?\.(js|jsx|ts|tsx|css|html|json))\s*\n```(\w+)?\s*\n([\s\S]*?)```/gi;

      const allMatches: Array<{ path: string; content: string }> = [];
      let match;

      // Try all patterns
      [filePattern1, filePattern2, filePattern3, filePattern4, filePattern5, filePattern6, filePattern7, filePattern8].forEach((pattern, idx) => {
        pattern.lastIndex = 0;
        while ((match = pattern.exec(responseText)) !== null) {
          let filePath = match[1] || match[2] || '';
          const fileContent = match[2] || match[3] || match[4] || '';
          
          if (filePath && fileContent && fileContent.length > 10) {
            filePath = filePath.replace(/\\/g, '/').trim();
            if (!allMatches.some(m => m.path === filePath)) {
              allMatches.push({ path: filePath, content: fileContent.trim() });
            }
          }
        }
      });

      // Process each match
      for (const fileMatch of allMatches) {
        let filePath = fileMatch.path;
        let fileContent = fileMatch.content;

        // Normalize path
        filePath = filePath.replace(/^(jsx|javascript|typescript|tsx|js|ts|css|html|json):\s*/i, '');
        filePath = filePath.replace(/^file:\s*/i, '');
        filePath = filePath.replace(/^\.\//, '').replace(/\\/g, '/').trim();

        // Ensure src/ structure
        if (filePath.match(/\.(jsx|js|tsx|ts)$/i) && !filePath.startsWith('src/')) {
          const fileName = filePath.split('/').pop() || filePath;
          if (fileName.match(/^[A-Z]/)) {
            filePath = `src/components/${fileName}`;
          } else {
            filePath = `src/${filePath}`;
          }
        }

        // Validate
        if (filePath.includes('..') || !filePath.includes('.')) {
          createdFiles.push({ path: filePath, success: false, error: 'Invalid path' });
          continue;
        }

        const fileName = filePath.split('/').pop() || '';
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        const languageMap: Record<string, string> = {
          'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
          'css': 'css', 'html': 'html', 'json': 'json'
        };
        const language = languageMap[extension] || extension;
        const isMain = filePath.includes('index') || filePath.includes('App.jsx') || filePath.includes('App.js');

        try {
          // Auto-fix common errors (same as chat route)
          let processedContent = fileContent;
          const fixesApplied: string[] = [];
          
          if (processedContent.includes('reutrn')) {
            processedContent = processedContent.replace(/reutrn/g, 'return');
            fixesApplied.push('Fixed: reutrn → return');
          }
          if (processedContent.includes('improt')) {
            processedContent = processedContent.replace(/improt/g, 'import');
            fixesApplied.push('Fixed: improt → import');
          }
          if (processedContent.includes('exprot')) {
            processedContent = processedContent.replace(/exprot/g, 'export');
            fixesApplied.push('Fixed: exprot → export');
          }
          if (processedContent.includes("import react from") && !processedContent.includes("import React from")) {
            processedContent = processedContent.replace(/import\s+react\s+from\s+["']react["']/gi, "import React from 'react'");
            fixesApplied.push('Fixed: import react → import React');
          }
          
          // Fix malformed JSX
          processedContent = processedContent.replace(/<\s*\/\s*(\w+)\s*>/g, '</$1>');
          processedContent = processedContent.replace(/<\s*(\w+)\s*\/\s*>/g, '<$1 />');
          processedContent = processedContent.replace(/<\s*(\w+)\s+([^>]*?)\s*\/\s*>/g, '<$1 $2 />');
          processedContent = processedContent.replace(/\s*=\s*["']/g, '="');
          processedContent = processedContent.replace(/["']\s*>/g, '">');
          processedContent = processedContent.replace(/\s+>/g, '>');
          processedContent = processedContent.replace(/<\s+/g, '<');
          
          if (fixesApplied.length > 0) {
            console.log(`🔧 Auto-fixed ${fixesApplied.length} issues for ${filePath}:`, fixesApplied);
          }

          // Save to database
          if (isMain) {
            await prisma.appFile.updateMany({
              where: { projectId: id, isMain: true },
              data: { isMain: false },
            });
          }

          await prisma.appFile.upsert({
            where: {
              projectId_path: {
                projectId: id,
                path: filePath,
              },
            },
            update: {
              content: processedContent,
              language: language,
              isMain: isMain,
              name: fileName,
            },
            create: {
              projectId: id,
              path: filePath,
              name: fileName,
              content: processedContent,
              language: language,
              isMain: isMain,
            },
          });

          createdFiles.push({ path: filePath, success: true });
        } catch (error: any) {
          createdFiles.push({ path: filePath, success: false, error: error.message });
        }
      }

      return createdFiles;
    };

    console.log('🚀 Starting file extraction from text...');
    const createdFiles = await parseAndCreateFiles(text);
    
    const successful = createdFiles.filter(f => f.success);
    const failed = createdFiles.filter(f => !f.success);
    
    console.log('✅ File extraction completed:', {
      total: createdFiles.length,
      successful: successful.length,
      failed: failed.length,
      files: successful.map(f => f.path)
    });

    return NextResponse.json({
      success: true,
      filesCreated: createdFiles,
      total: createdFiles.length,
      successful: successful.length,
      failed: failed.length,
      message: successful.length > 0 
        ? `Successfully created ${successful.length} file(s)` 
        : 'No files were extracted',
    });
  } catch (error: any) {
    console.error('Error extracting files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract files' },
      { status: 500 }
    );
  }
}
