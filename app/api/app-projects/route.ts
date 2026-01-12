import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../src/lib/auth';
import { CreateAppProject } from '../../../src/lib/validation';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    try {
      await ensureUserInDb(user);
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your DATABASE_URL in .env.local. See QUICK_FIX_DATABASE.md for help.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    let prismaUser;
    try {
      prismaUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
      });
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your DATABASE_URL in .env.local.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const projects = await prisma.appProject.findMany({
      where: { ownerId: prismaUser.id },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        framework: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { files: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching app projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    try {
      await ensureUserInDb(user);
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your DATABASE_URL in .env.local. See docs/FIX_DATABASE_CONNECTION.md for help.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    let prismaUser;
    try {
      prismaUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
      });
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your DATABASE_URL in .env.local.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parse = CreateAppProject.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.message },
        { status: 400 }
      );
    }

    // Validate workspace ownership if workspaceId is provided
    if (parse.data.workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: parse.data.workspaceId },
      });

      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found' },
          { status: 404 }
        );
      }

      if (workspace.ownerId !== prismaUser.id) {
        return NextResponse.json(
          { error: 'Not authorized to use this workspace' },
          { status: 403 }
        );
      }
    }

    const project = await prisma.appProject.create({
      data: {
        title: parse.data.title,
        description: parse.data.description,
        type: parse.data.type,
        framework: parse.data.framework,
        workspaceId: parse.data.workspaceId,
        config: parse.data.config,
        ownerId: prismaUser.id,
        // Questionnaire data
        questionnaireData: parse.data.questionnaireData || null,
        appType: parse.data.appType || null,
        targetAudience: parse.data.targetAudience || null,
        designStyle: parse.data.designStyle || null,
        colorScheme: parse.data.colorScheme || null,
        layoutStyle: parse.data.layoutStyle || null,
        requiredFeatures: parse.data.requiredFeatures || [],
        brandName: parse.data.brandName || null,
        tagline: parse.data.tagline || null,
        keyPoints: parse.data.keyPoints || null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        framework: true,
        workspaceId: true,
        config: true,
        createdAt: true,
        updatedAt: true,
        brandName: true,
        tagline: true,
      },
    });

    // Create initial scaffold files so preview renders immediately
    const brandName = project.brandName || project.title || 'My App';
    const tagline = project.tagline || 'Welcome to my application!';

    const scaffoldFiles = [
      {
        path: 'src/App.jsx',
        name: 'App.jsx',
        content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${brandName}</h1>
        <p>${tagline}</p>
        <div className="App-info">
          <p style={{ marginTop: '30px', fontSize: '14px', opacity: 0.8 }}>
            🚀 Start building your app by asking the AI to create components!
          </p>
        </div>
      </header>
    </div>
  );
}

export default App;`,
        language: 'javascript',
        isMain: true
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
        isMain: false
      },
      {
        path: 'src/App.css',
        name: 'App.css',
        content: `.App {
  text-align: center;
}

.App-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.App-header h1 {
  font-size: 3rem;
  margin-bottom: 20px;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.App-header p {
  font-size: 1.5rem;
  margin-bottom: 10px;
  opacity: 0.95;
}

.App-info {
  margin-top: 40px;
  padding: 20px;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}`,
        language: 'css',
        isMain: false
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

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`,
        language: 'css',
        isMain: false
      }
    ];

    // Create scaffold files
    try {
      for (const file of scaffoldFiles) {
        await prisma.appFile.create({
          data: {
            projectId: project.id,
            path: file.path,
            name: file.name,
            content: file.content,
            language: file.language,
            isMain: file.isMain,
          },
        });
      }
      console.log(`✅ Created ${scaffoldFiles.length} scaffold files for project ${project.id}`);
    } catch (scaffoldError: any) {
      console.error('⚠️ Error creating scaffold files:', scaffoldError);
      // Don't fail project creation if scaffold fails - project is still created
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating app project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

