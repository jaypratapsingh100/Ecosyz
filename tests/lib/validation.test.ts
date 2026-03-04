import { describe, it, expect } from 'vitest';
import {
  CreateWorkspace,
  CreateResource,
  CreateAppProject,
  CreateCommunityGroup,
  CreateDiscussion,
} from '../../src/lib/validation';

describe('CreateWorkspace', () => {
  it('accepts valid workspace', () => {
    const result = CreateWorkspace.safeParse({ title: 'My Workspace' });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = CreateWorkspace.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const result = CreateWorkspace.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('CreateResource', () => {
  it('accepts minimal resource', () => {
    const result = CreateResource.safeParse({ title: 'Resource' });
    expect(result.success).toBe(true);
  });

  it('accepts resource with url', () => {
    const result = CreateResource.safeParse({
      title: 'Resource',
      url: 'https://example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid url', () => {
    const result = CreateResource.safeParse({
      title: 'Resource',
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateAppProject', () => {
  it('accepts minimal project', () => {
    const result = CreateAppProject.safeParse({ title: 'My App' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('web');
      expect(result.data.isPublic).toBe(false);
    }
  });

  it('accepts full project', () => {
    const result = CreateAppProject.safeParse({
      title: 'My App',
      description: 'A cool app',
      type: 'fullstack',
      framework: 'nextjs',
      isPublic: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = CreateAppProject.safeParse({
      title: 'My App',
      type: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateCommunityGroup', () => {
  it('accepts valid group', () => {
    const result = CreateCommunityGroup.safeParse({
      name: 'Test Group',
      description: 'A test group',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid slug', () => {
    const result = CreateCommunityGroup.safeParse({
      name: 'Test',
      slug: 'Invalid Slug!',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid slug', () => {
    const result = CreateCommunityGroup.safeParse({
      name: 'Test',
      slug: 'valid-slug-123',
    });
    expect(result.success).toBe(true);
  });
});

describe('CreateDiscussion', () => {
  it('accepts valid discussion', () => {
    const result = CreateDiscussion.safeParse({
      title: 'Discussion Title',
      content: 'Discussion content here',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = CreateDiscussion.safeParse({
      title: '',
      content: 'Content',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty content', () => {
    const result = CreateDiscussion.safeParse({
      title: 'Title',
      content: '',
    });
    expect(result.success).toBe(false);
  });
});
