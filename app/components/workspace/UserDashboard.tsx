'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../src/lib/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, FolderOpen, Users, Settings, Plus } from 'lucide-react';
import WorkspacePageClient from './WorkspacePageClient';
import { 
  Card, 
  Button, 
  LoadingSpinner, 
  EmptyState, 
  Container, 
  PageHeader,
  DesignSystem 
} from '../ui/design-system';

interface Workspace {
  id: string;
  title: string;
  createdAt: string;
  resources: any[];
  resourceCount: number;
  shareLinks: any[];
}

interface UserData {
  id: string;
  supabaseId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export default function UserDashboard() {
  const { user: authUser, loading: authLoading, isAuthenticated } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth');
      return;
    }

    if (isAuthenticated && authUser) {
      fetchUserWorkspace();
    }
  }, [authLoading, isAuthenticated, authUser, router]);

  const fetchUserWorkspace = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/user-workspace');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch workspace');
      }

      const data = await response.json();
      setWorkspace(data.workspace);
      setUserData(data.user);
    } catch (error) {
      console.error('Error fetching user workspace:', error);
      toast.error('Failed to load workspace', {
        description: 'Please try refreshing the page.',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative mb-6">
            <LoadingSpinner size="lg" />
            <Sparkles className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-300 text-lg font-medium">Loading your workspace...</p>
          <p className="text-gray-500 mt-2 text-sm">Setting up your personalized environment</p>
        </motion.div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] flex items-center justify-center p-4">
        <EmptyState
          icon={<FolderOpen className="w-16 h-16 text-gray-400" />}
          title="No Workspace Found"
          description="We couldn't load your workspace. Please try again or create a new one."
          action={
            <Button onClick={fetchUserWorkspace} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Create Workspace
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/10 px-6 py-4 backdrop-blur-md"
      >
        <Container>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{workspace.title}</h1>
                  <p className="text-sm text-gray-400">
                    {workspace.resourceCount} resources • Created {new Date(workspace.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="w-4 h-4" />
                <span>Personal Workspace</span>
              </div>
              
              {userData && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{userData.name}</p>
                    <p className="text-xs text-gray-400">{userData.email}</p>
                  </div>
                  {userData.avatarUrl ? (
                    <img
                      src={userData.avatarUrl}
                      alt={userData.name}
                      className="w-10 h-10 rounded-full border-2 border-emerald-400"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center text-gray-900 font-bold">
                      {userData.name?.charAt(0).toUpperCase() || userData.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Container>
      </motion.div>

      {/* Main Workspace Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="h-[calc(100vh-5rem)]"
      >
        <WorkspacePageClient workspace={workspace} />
      </motion.div>
    </div>
  );
}