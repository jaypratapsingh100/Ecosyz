import { NextRequest, NextResponse } from 'next/server';

const CAREERS_RECIPIENT = 'info@openidea.world';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const name = (formData.get('name') as string)?.trim() || '';
    const email = (formData.get('email') as string)?.trim() || '';
    const linkedin = (formData.get('linkedin') as string)?.trim() || '';
    const github = (formData.get('github') as string)?.trim() || '';
    const coverNote = (formData.get('coverNote') as string)?.trim() || '';
    const jobTitle = (formData.get('jobTitle') as string)?.trim() || '';
    const preferredArea = (formData.get('preferredArea') as string)?.trim() || '';
    const resume = formData.get('resume') as File | null;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const attachments: { filename: string; content: string }[] = [];
    if (resume && resume.size > 0) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (resume.size > maxSize) {
        return NextResponse.json(
          { error: 'Resume must be under 5MB' },
          { status: 400 }
        );
      }
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(resume.type) && !resume.name.match(/\.(pdf|doc|docx)$/i)) {
        return NextResponse.json(
          { error: 'Resume must be PDF or DOC/DOCX' },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await resume.arrayBuffer());
      attachments.push({
        filename: resume.name || 'resume.pdf',
        content: buffer.toString('base64'),
      });
    }

    const html = `
      <h2>New Job Application: ${jobTitle || 'Open Position'}</h2>
      <p><strong>Name:</strong> ${name || '—'}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${linkedin ? `<p><strong>LinkedIn:</strong> <a href="${linkedin}">${linkedin}</a></p>` : ''}
      ${github ? `<p><strong>GitHub:</strong> <a href="${github}">${github}</a></p>` : ''}
      ${preferredArea ? `<p><strong>Preferred Area (Fellowship):</strong> ${preferredArea}</p>` : ''}
      ${coverNote ? `<p><strong>Cover Note:</strong></p><p>${coverNote.replace(/\n/g, '<br>')}</p>` : ''}
      ${attachments.length > 0 ? `<p><em>Resume attached: ${attachments[0].filename}</em></p>` : '<p><em>No resume attached</em></p>'}
    `;

    const text = `
New Job Application: ${jobTitle || 'Open Position'}

Name: ${name || '—'}
Email: ${email}
${linkedin ? `LinkedIn: ${linkedin}` : ''}
${github ? `GitHub: ${github}` : ''}
${preferredArea ? `Preferred Area (Fellowship): ${preferredArea}` : ''}
${coverNote ? `\nCover Note:\n${coverNote}` : ''}
${attachments.length > 0 ? `\nResume attached: ${attachments[0].filename}` : '\nNo resume attached'}
    `.trim();

    const resendBody: Record<string, unknown> = {
      from: 'Open Idea Careers <noreply@openidea.world>',
      to: [CAREERS_RECIPIENT],
      subject: `Application: ${jobTitle || 'Open Position'} - ${name || email}`,
      html,
      text,
    };

    if (attachments.length > 0) {
      resendBody.attachments = attachments;
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendBody),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[careers/apply] Resend error:', resendRes.status, errText);
      return NextResponse.json(
        { error: 'Failed to send application' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[careers/apply]', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
