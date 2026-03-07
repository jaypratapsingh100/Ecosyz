import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HIGHLIGHTED_MILESTONES = [
  'Knowledge Graph Comprehension Engine',
  'Index 10,000 Resources',
  'Enable Semantic Search',
  'OpenClaw Integration',
  'Website Builder Backend Integration Agent',
  'Domain Integration Agent',
  'Smart Network Agent',
  'Barter Engine',
  'Project Showcase & Discovery',
];

async function main() {
  // Add the highlighted column if it doesn't exist
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "InternMilestone" ADD COLUMN IF NOT EXISTS "highlighted" BOOLEAN NOT NULL DEFAULT false`
    );
    console.log('Added "highlighted" column to InternMilestone');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('"highlighted" column already exists');
    } else {
      throw e;
    }
  }

  // Set highlighted = true and stipend = null for the 9 priority milestones
  for (const title of HIGHLIGHTED_MILESTONES) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "InternMilestone" SET "highlighted" = true, "stipend" = NULL WHERE "title" = $1`,
      title
    );
    console.log(`  Updated "${title}" → highlighted=true, stipend=null (${result} rows)`);
  }

  console.log('\nDone! 9 milestones highlighted with no stipend.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
