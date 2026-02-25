import { z } from 'zod';

export const CreateWorkspace = z.object({
  title: z.string().min(1)
});

export const CreateResource = z.object({
  title: z.string().min(1),
  url: z.string().url().optional(),
  notes: z.string().optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  data: z.any().optional()
});

export const CreateAnnotation = z.object({
  body: z.string().min(1),
  highlights: z.any().optional()
});

export const CreateShare = z.object({
  expiresAt: z.string().datetime().optional()
});

export const UpdateProfile = z.object({
  // Core identity
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters'),
  bio: z
    .string()
    .max(1000, 'Bio must be less than 1000 characters')
    .optional(),

  // Extended basics
  location: z
    .string()
    .max(120, 'Location must be less than 120 characters')
    .optional(),
  affiliation: z
    .string()
    .max(160, 'Affiliation must be less than 160 characters')
    .optional(),
  website: z
    .string()
    .url('Website must be a valid URL')
    .optional(),

  // Roles and expertise
  primaryRole: z
    .string()
    .max(50, 'Primary role must be less than 50 characters')
    .optional(),
  roles: z.array(z.string().max(50)).optional(),
  expertiseTags: z.array(z.string().max(50)).optional(),

  // Deeper about fields
  headline: z
    .string()
    .max(160, 'Headline must be less than 160 characters')
    .optional(),
  currentFocus: z
    .string()
    .max(1000, 'Current focus must be less than 1000 characters')
    .optional(),
  lookingFor: z
    .string()
    .max(1000, 'Looking for must be less than 1000 characters')
    .optional(),
  canHelpWith: z
    .string()
    .max(1000, 'Can help with must be less than 1000 characters')
    .optional(),

  // Founder‑specific
  startupName: z.string().max(160).optional(),
  startupStage: z.string().max(50).optional(),
  startupSector: z.string().max(80).optional(),
  startupDescription: z.string().max(2000).optional(),

  // Researcher‑specific
  researchField: z.string().max(160).optional(),
  researchInstitution: z.string().max(160).optional(),
  researchSummary: z.string().max(2000).optional(),
  selectedPublications: z.string().max(4000).optional(),

  // Social / external
  orcidId: z.string().max(100).optional(),
  githubUsername: z.string().max(100).optional(),
  linkedinUrl: z.string().url('LinkedIn URL must be valid').optional(),
  twitterHandle: z.string().max(50).optional(),

  // Preferences (unchanged)
  preferences: z
    .object({
      theme: z.enum(['system', 'light', 'dark']),
      language: z.string().default('en-IN'),
      emailNotifications: z.boolean().default(true),
      marketingEmails: z.boolean().default(false),
    })
    .optional(),
});

export const CreateAppProject = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["web", "fullstack", "other"]).default("web"),
  framework: z.string().optional(),
  previewVersion: z.enum(["v1", "v2"]).optional(),
  workspaceId: z.string().optional(),
  config: z.any().optional(),
  thumbnailUrl: z.string().url().optional(),
  isPublic: z.boolean().default(false),
  // Questionnaire fields
  questionnaireData: z.any().optional(),
  appType: z.string().optional(),
  targetAudience: z.string().optional(),
  designStyle: z.string().optional(),
  colorScheme: z.string().optional(),
  layoutStyle: z.string().optional(),
  requiredFeatures: z.array(z.string()).optional(),
  brandName: z.string().optional(),
  tagline: z.string().optional(),
  keyPoints: z.string().optional(),
});

export const UpdateAppProject = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  isPublic: z.boolean().optional(),
  config: z.any().optional(),
});

export const CreateAppFile = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
  isMain: z.boolean().default(false),
});

export const UpdateAppFile = z.object({
  content: z.string().optional(),
  isMain: z.boolean().optional(),
});

// Community Validation Schemas

export const CreateCommunityGroup = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
  isPublic: z.boolean().default(true),
  topics: z.array(z.string()).max(10).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export const UpdateCommunityGroup = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
  isPublic: z.boolean().optional(),
  topics: z.array(z.string()).max(10).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export const CreateDiscussion = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  groupId: z.string().optional(),
  workspaceId: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export const UpdateDiscussion = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).max(10).optional(),
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

export const CreateDiscussionReply = z.object({
  content: z.string().min(1),
});

export const UpdateDiscussionReply = z.object({
  content: z.string().min(1),
});

export const CreateBarterAsk = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  whatINeed: z.string().max(2000).optional(),
  whatIOffer: z.string().max(2000).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string().min(1),
        type: z.string().min(1),
        size: z.number().int().nonnegative().optional(),
      })
    )
    .max(6)
    .optional(),
});

export const CreateBarterPitch = z.object({
  content: z.string().min(1).max(2000),
});

export const UpdateBarterStatus = z.object({
  status: z.enum(['open', 'closed']),
});

// Community Gigs (Fiverr-style)

export const CreateGig = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.string().max(100).optional(),
  priceFrom: z.number().int().nonnegative().optional(),
  priceTo: z.number().int().nonnegative().optional(),
  currency: z.string().max(10).optional(),
  deliveryTimeDays: z.number().int().positive().max(365).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export const CreateGigRequest = z.object({
  message: z.string().min(1).max(2000),
  budget: z.number().int().nonnegative().optional(),
});

export const UpdateGigStatus = z.object({
  status: z.enum(['active', 'paused', 'closed']),
});

export const CreateEvent = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  eventUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().max(50).optional(),
  maxAttendees: z.number().int().positive().optional(),
  isPublic: z.boolean().default(true),
});

export const UpdateEvent = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  eventUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().max(50).optional(),
  maxAttendees: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
});

export const CreateChallenge = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  requirements: z.string().optional(),
  prize: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  imageUrl: z.string().url().optional(),
  category: z.string().max(50).optional(),
  status: z.enum(["upcoming", "active", "ended", "judging", "completed"]).default("upcoming"),
});

export const UpdateChallenge = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  requirements: z.string().optional(),
  prize: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().max(50).optional(),
  status: z.enum(["upcoming", "active", "ended", "judging", "completed"]).optional(),
});

export const CreateChallengeSubmission = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  url: z.string().url().optional(),
});

export const UpdateChallengeSubmission = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  status: z.enum(["submitted", "shortlisted", "winner", "rejected"]).optional(),
});

// Problems & Ideas feed

export const CreateProblemIdeaPost = z.object({
  content: z.string().min(1).max(10000),
  type: z.enum(['problem', 'idea']).default('idea'),
  imageUrls: z.array(z.string().url()).max(6).optional(),
});

export const CreateProblemIdeaComment = z.object({
  content: z.string().min(1).max(2000),
});
