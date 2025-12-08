import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../src/lib/auth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Container } from '../components/ui/Container';
import ProfileForm from '../components/profile/ProfileForm';

export const dynamic = 'force-dynamic';

async function getProfileData() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth');
  }

  try {
    // Import the profile API logic directly instead of fetching
    const { prisma } = await import('../../src/lib/db');
    const { ensureUserInDb } = await import('../../src/lib/auth');
    
    await ensureUserInDb(user);
    
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      // Return default profile if user not in DB yet
      return {
        user,
        profile: {
          displayName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          bio: '',
          avatarUrl: undefined,
          preferences: {
            theme: 'system' as const,
            language: 'en-IN',
            emailNotifications: true,
            marketingEmails: false,
          },
        },
      };
    }

    let profile = await prisma.profile.findUnique({
      where: { userId: prismaUser.id },
    });

    if (!profile) {
      // Create default profile
      profile = await prisma.profile.create({
        data: {
          userId: prismaUser.id,
          displayName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          preferences: {
            theme: 'system',
            language: 'en-IN',
            emailNotifications: true,
            marketingEmails: false,
          },
        },
      });
    }

    const profileData = {
      displayName: profile.displayName || 'User',
      bio: profile.bio ?? undefined,
      avatarUrl: (profile.avatarUrl === null ? undefined : profile.avatarUrl) as string | undefined,
      preferences: {
        theme: ((profile.preferences as any)?.theme || 'system') as 'system' | 'light' | 'dark',
        language: (profile.preferences as any)?.language || 'en-IN',
        emailNotifications: (profile.preferences as any)?.emailNotifications ?? true,
        marketingEmails: (profile.preferences as any)?.marketingEmails ?? false,
      },
    };

    return {
      user,
      profile: profileData,
    };
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    
    // Check if it's a database connection error
    if (error?.message?.includes('authentication failed') || 
        error?.message?.includes('DATABASE_URL') ||
        error?.code === 'P1001') {
      console.error('⚠️ Database connection error. Please check your DATABASE_URL in .env.local');
      console.error('See docs/FIX_DATABASE_CONNECTION.md for help');
    }
    
    // Return default profile data on error so page doesn't crash
    return {
      user,
      profile: {
        displayName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        bio: '',
        avatarUrl: undefined,
        preferences: {
          theme: 'system' as const,
          language: 'en-IN',
          emailNotifications: true,
          marketingEmails: false,
        },
      },
    };
  }
}

export default async function ProfilePage() {
  const { user, profile } = await getProfileData();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow py-12">
        <Container>
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Profile Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your account settings and preferences.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <ProfileForm initialData={profile} />
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}