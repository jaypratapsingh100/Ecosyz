import { NextRequest, NextResponse } from 'next/server';
import { createAIClient, hasAIClient } from '@/lib/ai/provider';
import { extractAgentResponse, type AgentFile } from '@/lib/app-builder/agentSchema';
import { parsePdfSections } from '@/lib/pdf-website/parseSections';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { fetchLinkedInProfileImage } from '@/lib/linkedin/fetchProfileImage';

async function extractTextFromFile(file: Blob, fileName?: string): Promise<string> {
  const type = (file as { type?: string }).type || '';
  const name = fileName || (file as { name?: string }).name || '';
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(name);

  if (isPdf) {
    try {
      const pdfParse = (await import('pdf-parse')).default as (buf: Buffer) => Promise<{ text: string }>;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { text } = await pdfParse(buffer);
      return text || '';
    } catch (e) {
      console.warn('[pdf-website] PDF parse failed, falling back to empty text:', e);
      return '';
    }
  }

  try {
    if (typeof (file as { text?: () => Promise<string> }).text === 'function') {
      return await (file as { text: () => Promise<string> }).text();
    }
  } catch {
    // ignore
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    if (!hasAIClient()) {
      return NextResponse.json(
        {
          error:
            'No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY to use this feature.',
        },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const questionnaireRaw = formData.get('questionnaire') as string | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'PDF document is required (field: file)' },
        { status: 400 },
      );
    }

    let questionnaire: Record<string, unknown> = {};
    if (questionnaireRaw) {
      try {
        questionnaire = JSON.parse(questionnaireRaw);
      } catch (e) {
        console.warn('[pdf-website] Failed to parse questionnaire JSON:', e);
      }
    }

    const rawText = await extractTextFromFile(file as Blob, (file as { name?: string }).name);
    const fullText = rawText ? rawText.slice(0, 80000) : '';

    const portfolioData = parsePdfSections(fullText);
    const primaryGoal = (questionnaire.primaryGoal as string) || 'portfolio';
    const isPortfolio = primaryGoal === 'portfolio' || primaryGoal === 'resume';

    const userProvider = questionnaire.userProvider as 'groq' | 'openrouter' | undefined;
    const userModel = questionnaire.userModel as string | undefined;
    const { client, model, provider } = createAIClient({
      userProvider: userProvider || undefined,
      userModel: userModel || undefined,
    });

    const designVibe = (questionnaire.designVibe as string) || 'vibrant';
    const animationLevel = (questionnaire.animationLevel as string) || 'medium';
    const colorPalette = (questionnaire.colorPalette as string) || 'emerald-cyan';
    const customColors = (questionnaire.customColors as string) || '';

    let profileImageUrl: string | null = null;
    const linkedinUrl = questionnaire.linkedinUrl as string | undefined;
    if (linkedinUrl?.trim()) {
      profileImageUrl = await fetchLinkedInProfileImage(linkedinUrl.trim());
    }

    const profileImageInstruction = profileImageUrl
      ? `- Hero: Use this EXACT profile/avatar image URL: ${profileImageUrl}. Use it for the main hero profile image (e.g. 200x200 or 250x250). Add dark overlay (rgba(0,0,0,0.5)) for text readability.`
      : '';

    const portfolioStructure = isPortfolio
      ? [
          '',
          'PLACEHOLDER IMAGES (MANDATORY — use LOTS of BIG images throughout):',
          profileImageInstruction,
          '- Hero: LARGE full-screen background image (min-height: 100vh). Use background-image with https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920 or https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1920 or https://picsum.photos/1920/1080. Add dark overlay (rgba(0,0,0,0.5)) for text readability. background-size: cover.',
          profileImageUrl ? '' : '- Hero: Also add a LARGE profile/avatar image (e.g. 200x200 or 250x250) — https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400.',
          '- About section: Include a BIG image (e.g. 600x400 or full-width) — https://picsum.photos/800/500?random=2 or Unsplash workspace/team photo.',
          '- Skills section: Use a wide background image or a large decorative image — https://picsum.photos/1200/400?random=3.',
          '- Experience: Each job card should have a LARGE placeholder image (e.g. 300x200 or 400x250) — https://picsum.photos/400/250?random=4, ?random=5, etc.',
          '- Certifications: Each cert as a card with a medium image (200x150) — https://picsum.photos/200/150?random=N.',
          '- Education: Each entry with an image (e.g. 280x180) — https://picsum.photos/280/180?random=N.',
          '- Add full-width divider/parallax images between major sections (e.g. 1920x400) for visual break.',
          '- Use MANY images — aim for 10+ placeholder images across the page. Big, impactful, image-rich layout.',
          '- Use <img src="URL" /> or background-image. Plain img/CSS only.',
          '',
          'WEB-STYLE DESIGN (CRITICAL — modern website, image-rich, NOT a resume/PDF):',
          '- Full-width sections with generous padding. IMAGE-RICH: every section should have at least one placeholder image. Big, impactful images.',
          '- Hero: full-viewport (100vh) with LARGE background image + overlay, large profile image, centered name + title + tagline. CTA or scroll indicator.',
          '- About: readable content block + a LARGE image (side-by-side or stacked).',
          '- Skills: pill badges or icon cards in a responsive grid. Hover effects.',
          '- Experience: modern timeline/cards. EVERY job as a card with a LARGE image (300x200+), company, role, dates, location, ALL bullets. Do NOT omit any.',
          '- Certifications: grid of cards, each with an image. Include EVERY certification.',
          '- Education: card style, each with an image. Include EVERY education entry.',
          '- Contact: footer or section with icon links (phone, email, LinkedIn, website).',
          '- Typography: clear hierarchy. No document-style dense text.',
          '',
          'STRICT RULE — SHOW ALL PDF CONTENT (NON-NEGOTIABLE):',
          '- EVERY piece of text from the PDF MUST appear on the website. No exceptions.',
          '- Experience: EVERY job, EVERY bullet point. If the source has 12 jobs, output 12. If a job has 7 bullets, output all 7. Use expandable/collapsible UI if needed to fit length.',
          '- Certifications: EVERY one. Languages: ALL. Skills: ALL.',
          '- Education: EVERY entry with full institution name, degree, dates.',
          '- Summary: FULL text, do NOT truncate. Use multiple paragraphs if long.',
          '- If the RAW PDF TEXT (provided below) contains anything not in the structured data, ADD IT. Cross-check both sources.',
          '- Summarizing, abbreviating, or omitting ANY content is FORBIDDEN. Output will be rejected if content is missing.',
        ].join('\n')
      : '';

    const systemPrompt = [
      isPortfolio ? 'STRICT: You MUST include 100% of the PDF content. Every job, every bullet, every cert, every education entry, full summary. Omission = failure.' : '',
      'You are a senior React UI engineer and motion designer. Your task is to generate a SINGLE-PAGE, VIBRANT, ANIMATED React website.',
      isPortfolio ? 'This is a PORTFOLIO website. Create a FULL portfolio — include ALL content from the PDF with ZERO omissions. Design as a modern website.' : '',
      '',
      'CRITICAL — ANIMATIONS & VIBRANCY:',
      '- The site MUST feel alive: use CSS @keyframes, transitions, transforms, and gradients extensively.',
      `- Animation level: ${animationLevel}. For "subtle": fade-in, slide-up on scroll. For "medium": smooth transitions, hover effects, staggered reveals. For "high": parallax-like motion, glowing effects, gradient shifts, floating elements.`,
      `- Design vibe: ${designVibe}. Make it visually striking — gradients, glassmorphism, neon accents, or bold contrasts as appropriate.`,
      `- Color palette: ${colorPalette}${customColors ? ` (custom: ${customColors})` : ''}. Use rich, saturated colors. Avoid flat grays — prefer gradients, accent colors, and depth.`,
      '- Add CSS animations: fade-in, slide-up, scale-on-hover, gradient background animations, subtle pulse/glow on key elements.',
      '- Use transition on interactive elements (buttons, cards, links).',
      '- Consider: animated gradient backgrounds, staggered section reveals, hover scale/glow on cards, animated underlines on nav links.',
      '',
      'STRUCTURE:',
      '- Main component at src/App.jsx that default-exports App.',
      '- Global CSS at styles.css (no Tailwind, no @import).',
      '- Sections: Hero, About, Skills, Experience, Certifications, Education, Contact — as <section> blocks with ids for anchor nav.',
      '- Sticky top nav with smooth scroll to sections.',
      '- Use only React + plain CSS. No external UI libraries. No React Router. Nav uses href="#about", etc.',
      portfolioStructure,
      '',
      'BROWSER RUNTIME (CRITICAL):',
      '- The code runs in a browser iframe with React and ReactDOM loaded via <script> tags. They are GLOBALS.',
      '- NEVER use require(), import, or any Node.js/CommonJS syntax. Use React and ReactDOM as global variables.',
      '- No npm packages, no Tailwind CDN, no external scripts. Plain React + CSS only.',
      '',
      'CONTENT:',
      isPortfolio
        ? '- Use the STRUCTURED DATA and RAW PDF TEXT below. Include 100% of the content — every experience, every bullet, every cert, every education, full summary. Use expandable sections/accordions if the page gets long. NEVER truncate or summarize.'
        : '- Use the questionnaire and extracted PDF text to fill name, headline, summary, features, and contact.',
      '- When the PDF has substantial content, create a FULL, comprehensive site. Do NOT summarize heavily — surface the key content across sections.',
      '- If info is missing, use tasteful placeholders.',
      '',
      'OUTPUT FORMAT (JSON ONLY):',
      '- Respond as JSON: { "files": [ { "path": string, "name": string, "content": string, "language": "jsx" | "css", "isMain": boolean } ], "summary": string }',
      '- Paths: "src/App.jsx" (isMain: true), "styles.css". Optionally extra components under "src/components/".',
      '- Do NOT include markdown fences, prose, or explanations. JSON ONLY.',
    ].join('\n');

    const structuredData = isPortfolio
      ? JSON.stringify(
          {
            name: portfolioData.name,
            title: portfolioData.title,
            tagline: portfolioData.tagline,
            location: portfolioData.location,
            contact: portfolioData.contact,
            summary: portfolioData.summary,
            skills: portfolioData.skills,
            languages: portfolioData.languages,
            certifications: portfolioData.certifications,
            experience: portfolioData.experience,
            education: portfolioData.education,
          },
          null,
          2
        )
      : '';

    const contentCounts = isPortfolio
      ? `\nCONTENT COUNTS (STRICT — include every single one): Experience: ${portfolioData.experience.length} entries, Certifications: ${portfolioData.certifications.length}, Education: ${portfolioData.education.length}, Skills: ${portfolioData.skills.length}, Languages: ${portfolioData.languages.length}.`
      : '';

    const rawPdfExcerpt = isPortfolio ? fullText.slice(0, 25000) : '';

    const userPrompt = isPortfolio
      ? [
          '=== STRICT: Include 100% of content below. No omissions. ===',
          '',
          'STRUCTURED PORTFOLIO DATA (use ALL):',
          structuredData || '(none)',
          contentCounts,
          '',
          'RAW PDF TEXT (cross-check — include anything here that is missing from structured data):',
          rawPdfExcerpt || '(none)',
          '',
          'QUESTIONNAIRE:',
          JSON.stringify({ documentTitle: questionnaire.documentTitle, primaryGoal, designVibe, colorPalette, animationLevel }, null, 2),
          '',
          'TASK:',
          '1) STRICT: Include 100% of PDF content. Every experience + all bullets. Every certification. Every education. Full summary. Use accordions/expandable sections if needed. Verify against RAW PDF TEXT — add any missing content.',
          '2) Use LOTS of BIG placeholder images: hero full-screen bg, profile pic, About image, Experience card images, etc. 10+ images.',
          '3) WEB-STYLE: full-width sections, card layouts, generous spacing. CSS keyframe animations.',
          '4) Return JSON with files for src/App.jsx and styles.css.',
        ].join('\n')
      : [
          'QUESTIONNAIRE:',
          JSON.stringify(questionnaire, null, 2),
          '',
          'EXTRACTED PDF TEXT (may be truncated):',
          fullText.slice(0, 30000) || '(no text from document)',
          '',
          'TASK:',
          '1) Design a vibrant, animated one-page site that feels alive and modern.',
          '2) Include CSS keyframe animations, transitions, and gradient effects.',
          '3) Return JSON with files for src/App.jsx and styles.css.',
        ].join('\n');

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 16384,
      stream: false,
    });

    const content = completion.choices[0]?.message?.content || '';
    const parsed = extractAgentResponse(content);

    if (!parsed || !parsed.files || parsed.files.length === 0) {
      return NextResponse.json(
        {
          error: 'AI did not return any files in the expected format.',
          provider,
          model,
          raw: content.slice(0, 500),
        },
        { status: 500 },
      );
    }

    const files: AgentFile[] = parsed.files;
    const documentTitle = (questionnaire.documentTitle as string)?.trim() || 'PDF Website';

    let projectId: string | null = null;
    try {
      const user = await getCurrentUser();
      if (user) {
        await ensureUserInDb(user);
        const prismaUser = await prisma.user.findUnique({
          where: { supabaseId: user.id },
        });
        if (prismaUser) {
          const project = await prisma.appProject.create({
            data: {
              title: documentTitle,
              description: parsed.summary || 'Animated website generated from PDF.',
              framework: 'react',
              appType: 'pdf-website',
              ownerId: prismaUser.id,
              previewVersion: 'v2',
            },
          });
          await prisma.appFile.createMany({
            data: files.map((f) => ({
              projectId: project.id,
              path: f.path,
              name: f.name,
              content: f.content ?? '',
              language: (f.language as string) ?? (f.path.endsWith('.css') ? 'css' : 'jsx'),
              isMain: f.isMain ?? f.path.includes('App.jsx'),
            })),
          });
          projectId = project.id;
        }
      }
    } catch (dbErr) {
      console.warn('[pdf-website] Failed to save project to database:', dbErr);
    }

    return NextResponse.json({
      files,
      summary: parsed.summary || null,
      provider,
      model,
      projectId: projectId ?? undefined,
    });
  } catch (error) {
    console.error('[pdf-website] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate website with AI', message },
      { status: 500 },
    );
  }
}
