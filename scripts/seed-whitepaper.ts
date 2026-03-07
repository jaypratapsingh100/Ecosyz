import { PrismaClient } from '@prisma/client';
import { INTERN_TRACKS, WHITEPAPER_SEED } from '../src/lib/intern-tracks';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding whitepaper data...\n');

  const stats = { tracks: 0, subTracks: 0, milestones: 0, tasks: 0 };

  for (const t of INTERN_TRACKS) {
    await prisma.internTrack.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, name: t.name, description: t.description, stipendRange: t.stipendRange },
      update: { name: t.name, description: t.description, stipendRange: t.stipendRange },
    });
    stats.tracks++;
  }
  console.log(`Tracks upserted: ${stats.tracks}`);

  for (const trackSeed of WHITEPAPER_SEED) {
    const track = await prisma.internTrack.findUnique({ where: { slug: trackSeed.trackSlug } });
    if (!track) { console.log(`  Skip: track ${trackSeed.trackSlug} not found`); continue; }

    for (const stSeed of trackSeed.subTracks) {
      let subTrack = await prisma.internSubTrack.findFirst({
        where: { trackId: track.id, slug: stSeed.slug },
      });

      if (!subTrack) {
        subTrack = await prisma.internSubTrack.create({
          data: { trackId: track.id, slug: stSeed.slug, name: stSeed.name, description: stSeed.description, order: stSeed.order },
        });
        stats.subTracks++;
        console.log(`  + Sub-track: ${stSeed.name}`);
      } else {
        console.log(`  = Sub-track exists: ${stSeed.name}`);
      }

      for (const mSeed of stSeed.milestones) {
        let milestone = await prisma.internMilestone.findFirst({
          where: { trackId: track.id, subTrackId: subTrack.id, title: mSeed.title },
        });

        if (!milestone) {
          milestone = await prisma.internMilestone.create({
            data: { trackId: track.id, subTrackId: subTrack.id, title: mSeed.title, description: mSeed.description, order: mSeed.order, stipend: mSeed.stipend },
          });
          stats.milestones++;
          console.log(`    + Milestone: ${mSeed.title}`);
        }

        for (const tSeed of mSeed.tasks) {
          const exists = await prisma.internTask.findFirst({
            where: { trackId: track.id, milestoneId: milestone.id, title: tSeed.title },
          });
          if (!exists) {
            await prisma.internTask.create({
              data: { trackId: track.id, milestoneId: milestone.id, title: tSeed.title, description: tSeed.description, stipend: tSeed.stipend, status: 'pending' },
            });
            stats.tasks++;
          }
        }
      }
    }
  }

  console.log('\n--- Done ---');
  console.log(`Tracks:     ${stats.tracks}`);
  console.log(`Sub-tracks: ${stats.subTracks}`);
  console.log(`Milestones: ${stats.milestones}`);
  console.log(`Tasks:      ${stats.tasks}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
