/**
 * Parse PDF/resume text into structured sections for portfolio generation.
 * Handles LinkedIn-style and common resume formats.
 */

export interface ParsedPortfolio {
  name: string;
  title: string;
  tagline: string;
  location: string;
  contact: {
    phone?: string;
    email?: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  skills: string[];
  languages: string[];
  certifications: string[];
  experience: Array<{
    company: string;
    role: string;
    dates: string;
    location?: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    dates?: string;
  }>;
  rawText: string;
}

const SECTION_HEADERS = [
  'Contact',
  'Top Skills',
  'Skills',
  'Languages',
  'Certifications',
  'Summary',
  'Experience',
  'Education',
  'Work Experience',
  'Professional Experience',
];

function parseSection(text: string, header: string): string {
  const escaped = SECTION_HEADERS.filter((h) => h !== header).map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(
    `^${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:${escaped})\\s*\\n|\\n\\s*Page \\d+ of \\d+|$)`,
    'im'
  );
  const m = text.match(regex);
  return m ? m[1].trim().replace(/\n\s*Page \d+ of \d+.*$/gm, '').trim() : '';
}

function extractContact(text: string): ParsedPortfolio['contact'] {
  const contact: ParsedPortfolio['contact'] = {};
  const phoneMatch = text.match(/(?:\+?\d[\d\s\-()]{8,})/);
  if (phoneMatch) contact.phone = phoneMatch[0].trim();

  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (emailMatch) contact.email = emailMatch[0];

  const linkedinMatch = text.match(/(?:linkedin\.com\/in\/[\w-]+|www\.linkedin\.com\/in\/[\w-]+)/i);
  if (linkedinMatch) contact.linkedin = 'https://' + linkedinMatch[0].replace(/^www\./, '');

  const websiteMatch = text.match(/(?:openidea\.world|[\w.-]+\.(?:com|org|io|world))/i);
  if (websiteMatch) contact.website = 'https://' + websiteMatch[0].trim().replace(/^www\./, '');

  return contact;
}

function extractNameAndTitle(text: string): { name: string; title: string; tagline: string; location: string } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let name = '';
  let title = '';
  let tagline = '';
  let location = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!name && line.length > 2 && line.length < 50 && line === line.toUpperCase() && !line.match(/^\d/)) {
      name = line;
      continue;
    }
    if (name && !title && (line.includes('Founder') || line.includes('Engineer') || line.includes('Lead') || line.includes('Developer') || line.includes('Consultant') || line.includes('Manager'))) {
      const titleParts: string[] = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].length < 100 && !/(?:India|Bengaluru|Noida|USA|,\s*\w+)/.test(lines[j])) {
        titleParts.push(lines[j]);
        j++;
      }
      title = titleParts.join(' ');
      tagline = titleParts.length > 1 ? titleParts.slice(1).join(' ') : '';
      if (j < lines.length && /(?:India|Bengaluru|Noida|USA|Karnataka|Uttar Pradesh)/.test(lines[j])) {
        location = lines[j];
      }
      break;
    }
  }

  if (!name) {
    const blocks = text.split(/\n\s*\n/);
    for (const b of blocks) {
      const firstLines = b.split('\n').filter((l) => l.trim().length > 5);
      if (firstLines[0] && firstLines[0].length < 40 && firstLines[0] === firstLines[0].toUpperCase()) {
        name = firstLines[0].trim();
        if (firstLines[1]) title = firstLines[1].trim();
        if (firstLines[2] && /(?:India|Bengaluru|Noida)/.test(firstLines[2])) location = firstLines[2].trim();
        else if (firstLines[3] && /(?:India|Bengaluru|Noida)/.test(firstLines[3])) location = firstLines[3].trim();
        break;
      }
    }
  }

  return { name, title, tagline, location };
}

function extractSkills(text: string): string[] {
  const skillsSection = parseSection(text, 'Top Skills') || parseSection(text, 'Skills') || '';
  const lines = skillsSection.split('\n').map((l) => l.trim()).filter((l) => l.length > 1 && l.length < 80);
  if (lines.length > 0) return lines.slice(0, 25);
  const skillsMatch = text.match(/(?:Skills?|Top Skills?)\s*:\s*([^\n]+)/i);
  if (skillsMatch) return skillsMatch[1].split(/[,;|]/).map((s) => s.trim()).filter(Boolean).slice(0, 25);
  return [];
}

function extractLanguages(text: string): string[] {
  const langSection = parseSection(text, 'Languages') || '';
  const lines = langSection.split('\n').map((l) => l.trim()).filter((l) => l.length > 2 && l.length < 60);
  return lines.slice(0, 5);
}

function extractCertifications(text: string): string[] {
  const certSection = parseSection(text, 'Certifications') || '';
  const lines = certSection.split('\n').map((l) => l.trim()).filter((l) => l.length > 1);
  const certs: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let cert = lines[i];
    if (cert.match(/^(?:with|and|or)$/i) && certs.length > 0) {
      certs[certs.length - 1] += ' ' + cert;
    } else if (i + 1 < lines.length && lines[i + 1].length < 30 && !lines[i + 1].match(/^[A-Z]/)) {
      cert += ' ' + lines[i + 1];
      i++;
    }
    if (cert.length > 2 && cert.length < 150) certs.push(cert);
    i++;
  }
  return certs.slice(0, 20);
}

const DATE_PATTERN = /\w+\s+\d{4}\s*[-–]\s*(?:Present|\w+\s+\d{4}|\(\d+\s+months?\)|\(\d+\s+years?\)|\d+\s+months?|\d+\s+years?)/;
const ROLE_WORDS = /Founder|Engineer|Lead|Developer|Consultant|Manager|Owner|SRE|Architect|Analyst/i;

function extractExperience(text: string): ParsedPortfolio['experience'] {
  const expSection = parseSection(text, 'Experience') || parseSection(text, 'Work Experience') || parseSection(text, 'Professional Experience') || '';
  if (!expSection) return [];

  const exp: ParsedPortfolio['experience'] = [];
  const lines = expSection.split('\n').map((l) => l.trim());
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line || line.startsWith('Page ')) {
      i++;
      continue;
    }

    const next = lines[i + 1] || '';
    const next2 = lines[i + 2] || '';
    const next3 = lines[i + 3] || '';

    const dateInNext = next.match(DATE_PATTERN);
    const dateInNext2 = next2.match(DATE_PATTERN);
    const roleInNext = ROLE_WORDS.test(next);
    const roleInNext2 = ROLE_WORDS.test(next2);

    if (dateInNext && roleInNext) {
      const company = line;
      const role = next.replace(DATE_PATTERN, '').replace(/\s*[-–]\s*\([^)]+\)\s*$/, '').trim();
      const dates = dateInNext[0];
      const loc = /(?:India|Bengaluru|Noida|USA|Karnataka|,)/.test(next2) ? next2 : undefined;
      const bulletStart = loc ? i + 3 : i + 2;
      const bullets: string[] = [];
      let j = bulletStart;
      while (j < lines.length) {
        const bl = lines[j];
        if (!bl) {
          j++;
          break;
        }
        if (bl.startsWith('Page ')) {
          j++;
          break;
        }
        if (bl.startsWith('-') || bl.startsWith('•') || (bl.length > 25 && (bl.includes('.') || bl.match(ROLE_WORDS)))) {
          bullets.push(bl.replace(/^[-•]\s*/, ''));
          j++;
        } else if (bl.length < 50 && !bl.includes('.') && !ROLE_WORDS.test(bl)) {
          break;
        } else {
          break;
        }
      }
      exp.push({ company, role, dates, location: loc, bullets });
      i = j;
      continue;
    }

    if (dateInNext2 && roleInNext2 && line.length < 80 && !line.match(/\d{4}/)) {
      const company = line;
      const role = next2.replace(DATE_PATTERN, '').trim();
      const dates = dateInNext2[0];
      const loc = /(?:India|Bengaluru|Noida|USA)/.test(next3) ? next3 : undefined;
      const bulletStart = loc ? i + 4 : i + 3;
      const bullets: string[] = [];
      let j = bulletStart;
      while (j < lines.length) {
        const bl = lines[j];
        if (!bl || bl.startsWith('Page ')) break;
        if (bl.startsWith('-') || bl.startsWith('•') || (bl.length > 25 && bl.includes('.'))) {
          bullets.push(bl.replace(/^[-•]\s*/, ''));
          j++;
        } else if (bl.length < 50 && !bl.includes('.')) break;
        else break;
      }
      exp.push({ company, role, dates, location: loc, bullets });
      i = j;
      continue;
    }

    i++;
  }

  return exp;
}

function extractEducation(text: string): ParsedPortfolio['education'] {
  const eduSection = parseSection(text, 'Education') || '';
  if (!eduSection) return [];

  const edu: ParsedPortfolio['education'] = [];
  const lines = eduSection.split('\n').map((l) => l.trim()).filter(Boolean);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const degreeMatch = line.match(/(?:Professional Certificate|MBA|B\.Tech|Bachelor|Master|12th|Certificate)/i);
    const institution = degreeMatch ? lines[i - 1] || line : line;
    const degree = degreeMatch ? line : '';
    const datesMatch = line.match(/(\d{4}\s*[-–]\s*\d{4})/);
    if (institution && institution.length > 3) {
      edu.push({
        institution,
        degree: degree || institution,
        dates: datesMatch ? datesMatch[1] : undefined,
      });
    }
    i++;
  }

  if (edu.length === 0) {
    const blocks = eduSection.split(/\n\s*\n/);
    for (const b of blocks) {
      const parts = b.split('\n').filter((l) => l.trim());
      if (parts.length >= 2) {
        edu.push({
          institution: parts[0].trim(),
          degree: parts[1].trim(),
          dates: parts[2]?.match(/\d{4}/) ? parts[2].trim() : undefined,
        });
      }
    }
  }

  return edu.slice(0, 15);
}

export function parsePdfSections(rawText: string): ParsedPortfolio {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const fullText = text.slice(0, 80000);

  const { name, title, tagline, location } = extractNameAndTitle(fullText);
  const contactSection = parseSection(fullText, 'Contact') || fullText.slice(0, 1500);
  const contact = extractContact(contactSection);

  const summary = parseSection(fullText, 'Summary') || '';
  const skills = extractSkills(fullText);
  const languages = extractLanguages(fullText);
  const certifications = extractCertifications(fullText);
  const experience = extractExperience(fullText);
  const education = extractEducation(fullText);

  return {
    name: name || 'Unknown',
    title: title || '',
    tagline: tagline || '',
    location: location || '',
    contact,
    summary: summary.slice(0, 6000),
    skills,
    languages,
    certifications,
    experience,
    education,
    rawText: fullText,
  };
}
