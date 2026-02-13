'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import WorkspaceHeader from './WorkspaceHeader'
import ResourceCard from './ResourceCard'
import AddResourceForm from './AddResourceForm'
import ShareLinksPanel from './ShareLinksPanel'
import WorkspaceDiscussions from './WorkspaceDiscussions'
import ToastProvider from '../ui/ToastProvider'

interface Resource {
  id: string
  title: string
  url?: string
  notes?: string
  createdAt: string
  tags?: string[]
  annotations: { id: string; body: string; createdAt: string }[]
  annotationCount?: number
}

interface Workspace {
  id: string
  title: string
  resources: Resource[]
  shareLink: { id: string; token: string; createdAt: string; expiresAt?: string } | null
}

interface WorkspacePageClientProps {
  workspaceData: Workspace
}

export default function WorkspacePageClient({ workspaceData }: WorkspacePageClientProps) {
  const [activeTab, setActiveTab] = useState<'resources' | 'discussions'>('resources')

  return (
    <div className="relative bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 min-h-screen">
      <ToastProvider />

      {/* Globe background image */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/hero-globe.png"
          alt="Digital Globe Background"
          fill
          className="object-cover object-right opacity-30"
          quality={100}
          priority
        />
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 container mx-auto px-4 py-8 max-w-7xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Section */}
          <div className="lg:col-span-2 space-y-6">
            <WorkspaceHeader id={workspaceData.id} title={workspaceData.title} />

            {/* Tabs */}
            <div className="flex gap-4 mt-8 border-b border-zinc-800">
              <button
                onClick={() => setActiveTab('resources')}
                className={`px-6 py-3 font-semibold transition ${
                  activeTab === 'resources'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Resources
              </button>
              <button
                onClick={() => setActiveTab('discussions')}
                className={`px-6 py-3 font-semibold transition ${
                  activeTab === 'discussions'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Discussions
              </button>
            </div>
            {activeTab === 'resources' ? (
              <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-zinc-100 mb-6">Resources</h2>

              <AddResourceForm
                workspaceId={workspaceData.id}
                onCreated={() => {
                  // This will trigger a re-fetch on the client side
                  window.location.reload()
                }}
              />
            </motion.div>

            {workspaceData.resources.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center py-12 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl"
              >
                <div className="text-zinc-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">No resources yet</h3>
                <p className="text-zinc-500 text-sm max-w-md mx-auto">
                  Add your first resource using the form above, or save resources from the search page.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: {
                      staggerChildren: 0.06,
                    },
                  },
                }}
                className="space-y-4"
              >
                {workspaceData.resources.map((resource: Resource) => (
                  <motion.div
                    key={resource.id}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0 },
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  >
                    <ResourceCard
                      resource={resource}
                      onDeleted={() => {
                        // This will trigger a re-fetch on the client side
                        window.location.reload()
                      }}
                      onAnnotationCreated={() => {
                        // This will trigger a re-fetch on the client side
                        window.location.reload()
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
              </>
            ) : (
              <WorkspaceDiscussions workspaceId={workspaceData.id} />
            )}
          </div>

          {/* Right Sidebar - Share Link Panel at Top */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Share Links Panel - Positioned at top */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ShareLinksPanel workspaceId={workspaceData.id} />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}