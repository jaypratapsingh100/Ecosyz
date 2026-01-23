import { getCurrentUser, getUid } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AuthTestPage() {
  const user = await getCurrentUser();
  const uid = await getUid();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-8">Authentication Test</h1>

        {user ? (
          <div className="space-y-4">
            <div className="text-green-600 font-semibold">✅ Authenticated!</div>
            <div className="space-y-2">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Name:</strong> {user.user_metadata?.name || 'N/A'}</p>
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>UID:</strong> {uid}</p>
            </div>
            <a
              href="/api/auth/signout"
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors block text-center"
            >
              Sign Out
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-gray-600">Not authenticated</div>

            <div className="space-y-3">
              <a
                href="/api/auth/github"
                className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900 transition-colors block text-center"
              >
                Sign in with GitHub
              </a>

              <a
                href="/api/auth/google"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors block text-center"
              >
                Sign in with Google
              </a>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Test Email Auth</h3>
                <form action="/api/auth/signin" method="POST" className="space-y-2">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Sign In
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}