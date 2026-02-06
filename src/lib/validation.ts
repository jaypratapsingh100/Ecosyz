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
  displayName: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  preferences: z.object({
    theme: z.enum(["system", "light", "dark"]),
    language: z.string().default("en-IN"),
    emailNotifications: z.boolean().default(true),
    marketingEmails: z.boolean().default(false),
  }).optional(),
});

export const CreateAppProject = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["web", "fullstack", "other"]).default("web"),
  framework: z.string().optional(),
  previewVersion: z.enum(["v1", "v2"]).optional(),
  workspaceId: z.string().optional(),
  config: z.any().optional(),
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
