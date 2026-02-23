'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuthCheck } from '../hooks/useAuthCheck';
import { toast } from 'sonner';

type Author = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

type Post = {
  id: string;
  content: string;
  imageUrls: string[];
  type: string;
  authorId: string;
  author: Author;
  createdAt: string;
  _count: { comments: number; likes?: number };
  isOwn?: boolean;
  likedByMe?: boolean;
  likeCount?: number;
};

type Comment = {
  id: string;
  content: string;
  authorId: string;
  author: Author;
  createdAt: string;
  likedByMe?: boolean;
  likeCount?: number;
};

export default function ProblemsAndIdeasPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthCheck();

  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'problem' | 'idea'>('idea');
  const [imageUrlsText, setImageUrlsText] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);
  const [shareMenuPostId, setShareMenuPostId] = useState<string | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchPosts = useCallback(async (page = 1) => {
    if (!isAuthenticated) return;
    setLoadingPosts(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/problems-and-ideas/posts?page=${page}&limit=20`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.details || data.error || 'Failed to load posts';
        setFetchError(msg);
        toast.error(msg);
        return;
      }
      setPosts(data.posts);
      setPagination({
        page: data.pagination.page,
        totalPages: data.pagination.totalPages,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load posts';
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoadingPosts(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated === true) fetchPosts();
  }, [isAuthenticated, fetchPosts]);

  const fetchComments = useCallback(async (postId: string) => {
    try {
      const res = await fetch(`/api/problems-and-ideas/posts/${postId}/comments`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setCommentsByPost((prev) => ({ ...prev, [postId]: data.comments }));
    } catch {
      toast.error('Failed to load comments');
    }
  }, []);

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
    if (!commentsByPost[postId]) fetchComments(postId);
  };

  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length !== files.length) {
      toast.error('Only image files (JPEG, PNG, WebP, GIF) are allowed');
    }
    const combined = [...imageFiles, ...images].slice(0, 6);
    const newUrls = combined.map((f) => URL.createObjectURL(f));
    setImagePreviewUrls((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return newUrls;
    });
    setImageFiles(combined);
    e.target.value = '';
  };

  const removeImageFile = (index: number) => {
    setImagePreviewUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index] ?? '');
      return next;
    });
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) {
      toast.error('Write something to post');
      return;
    }
    const pastedUrls = imageUrlsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
      .slice(0, 6);
    const invalid = imageUrlsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .find((u) => !u.startsWith('http://') && !u.startsWith('https://'));
    if (invalid) {
      toast.error('All image links must be valid URLs (http or https)');
      return;
    }

    let uploadedUrls: string[] = [];
    if (imageFiles.length > 0) {
      setUploadingImages(true);
      try {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append('images', f));
        const upRes = await fetch('/api/problems-and-ideas/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!upRes.ok) {
          const d = await upRes.json().catch(() => ({}));
          throw new Error(d.error || 'Image upload failed');
        }
        const { urls } = await upRes.json();
        uploadedUrls = urls || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to upload images');
        setUploadingImages(false);
        return;
      }
      setUploadingImages(false);
    }

    const allUrls = [...uploadedUrls, ...pastedUrls].slice(0, 6);
    setSubmitting(true);
    try {
      const res = await fetch('/api/problems-and-ideas/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: text,
          type: postType,
          imageUrls: allUrls,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to post');
      }
      const newPost = await res.json();
      setPosts((prev) => [
        {
          ...newPost,
          isOwn: true,
          likedByMe: false,
          likeCount: 0,
          _count: { ...newPost._count, likes: 0 },
        },
        ...prev,
      ]);
      setContent('');
      setImageUrlsText('');
      setImagePreviewUrls((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      setImageFiles([]);
      toast.success('Posted!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = (commentText[postId] || '').trim();
    if (!text) return;
    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/problems-and-ideas/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      const newComment = await res.json();
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
            : p
        )
      );
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    setDeletingPostId(postId);
    try {
      const res = await fetch(`/api/problems-and-ideas/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete');
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Post deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleLikePost = async (postId: string) => {
    setLikingPostId(postId);
    try {
      const res = await fetch(`/api/problems-and-ideas/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update like');
      const data = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likedByMe: data.liked,
                likeCount: data.likeCount ?? (p.likeCount ?? 0) + (data.liked ? 1 : -1),
              }
            : p
        )
      );
    } catch {
      toast.error('Failed to update like');
    } finally {
      setLikingPostId(null);
    }
  };

  const handleLikeComment = async (commentId: string, postId: string) => {
    setLikingCommentId(commentId);
    try {
      const res = await fetch(`/api/problems-and-ideas/comments/${commentId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update like');
      const data = await res.json();
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) =>
          c.id === commentId
            ? { ...c, likedByMe: data.liked, likeCount: data.likeCount ?? (c.likeCount ?? 0) + (data.liked ? 1 : -1) }
            : c
        ),
      }));
    } catch {
      toast.error('Failed to update like');
    } finally {
      setLikingCommentId(null);
    }
  };

  const getPostShareUrl = (post: Post) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/problems-and-ideas?post=${post.id}`;
  };

  const handleShare = (post: Post, platform: 'twitter' | 'linkedin' | 'copy') => {
    const url = getPostShareUrl(post);
    const text = post.content.slice(0, 200) + (post.content.length > 200 ? '…' : '');
    if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } else if (platform === 'linkedin') {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
    setShareMenuPostId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-teal-400">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen flex items-center flex-1">
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt=""
              fill
              className="object-cover object-right opacity-30"
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-[#38bdf8]/20 to-transparent opacity-80 blur-3xl" />
          </div>
          <div className="relative z-10 w-full flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-8">
              <h2 className="text-3xl font-bold text-white mb-3">Sign in to join the feed</h2>
              <p className="text-teal-100/90 mb-8 text-lg">
                Post problems and ideas, and comment on others&apos; posts.
              </p>
              <button
                onClick={() => router.push('/auth')}
                className="px-8 py-3 bg-gradient-to-r from-[#38bdf8] to-[#0ff0fc] text-gray-900 font-semibold rounded-lg hover:scale-[1.02] transition-all"
              >
                Sign in
              </button>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const contentLength = content.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
          {/* Globe background */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt=""
              fill
              className="object-cover object-right opacity-30"
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-[#38bdf8]/20 to-transparent opacity-80 blur-3xl" />
          </div>

          <div className="relative z-10 flex justify-center">
            <div className="flex-1 border-t border-white/5 max-w-[600px] w-full mx-auto bg-[#020b11]/70 backdrop-blur-sm">
              {/* Twitter-style header */}
              <div className="sticky top-0 z-10 bg-[#020b11]/95 backdrop-blur border-b border-white/5 px-4 py-3">
          <h1 className="text-xl font-bold text-white">Problems & Ideas</h1>
          <p className="text-xs text-teal-200/60 mt-0.5">Share a problem or an idea</p>
        </div>

              {/* Compose tweet-style */}
              <div className="p-4 border-b border-white/5">
          <form onSubmit={handleCreatePost} className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-[#38bdf8]/20 flex-shrink-0 overflow-hidden flex items-center justify-center text-[#38bdf8] font-semibold">
              +
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setPostType('problem')}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    postType === 'problem'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-teal-400 hover:text-teal-300'
                  }`}
                >
                  Problem
                </button>
                <button
                  type="button"
                  onClick={() => setPostType('idea')}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    postType === 'idea'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-teal-400 hover:text-teal-300'
                  }`}
                >
                  Idea
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  postType === 'problem'
                    ? "What's a problem you want to solve?"
                    : "What's your idea?"
                }
                rows={3}
                maxLength={10000}
                className="w-full px-0 py-1 bg-transparent border-none text-white placeholder-teal-100/40 focus:outline-none focus:ring-0 resize-none text-[15px] leading-5"
              />
              {/* Image upload - LinkedIn/Twitter style */}
              <div className="mt-2">
                {imageFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {imageFiles.map((file, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5 group"
                      >
                        <img
                          src={imagePreviewUrls[i] ?? ''}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImageFile(i)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center text-sm hover:bg-red-500 transition-colors"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="cursor-pointer flex items-center gap-1.5 text-teal-400 hover:text-teal-300 text-sm">
                    <span className="text-lg">📷</span>
                    <span>Add photos</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                  {imageFiles.length > 0 && (
                    <span className="text-xs text-teal-100/50">
                      {imageFiles.length}/6 • Max 5MB each
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={imageUrlsText}
                  onChange={(e) => setImageUrlsText(e.target.value)}
                  placeholder="Or paste image URLs (optional)"
                  className="w-full mt-1 px-0 py-1 bg-transparent border-none text-teal-200/70 placeholder-teal-100/30 text-sm focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-teal-100/50">
                  {contentLength > 0 && `${contentLength} characters`}
                </span>
                <button
                  type="submit"
                  disabled={submitting || uploadingImages || !content.trim()}
                  className="px-5 py-2 rounded-full bg-[#38bdf8] text-gray-900 font-semibold text-sm hover:bg-[#0ff0fc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadingImages ? 'Uploading...' : submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Error banner */}
        {fetchError && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-400/30 text-red-300 text-sm">
            {fetchError}
            <span className="block mt-1 text-xs text-red-300/70">
              Run: npx prisma generate && npx prisma migrate deploy (if tables are missing)
            </span>
          </div>
        )}

        {/* Feed - tweet-style cards with dividers */}
        {loadingPosts ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#38bdf8]/30 border-t-[#38bdf8] rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 && !fetchError ? (
          <div className="text-center text-teal-400/80 py-16 px-4">
            <p className="text-lg font-medium text-white/80">No posts yet</p>
            <p className="text-sm mt-1">Be the first to share a problem or idea.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {posts.map((post) => (
              <li key={post.id} className="hover:bg-white/[0.02] transition-colors">
                <article className="p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#38bdf8]/20 flex-shrink-0 overflow-hidden">
                      {post.author.avatarUrl ? (
                        <Image
                          src={post.author.avatarUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-[#38bdf8] font-semibold text-sm">
                          {(post.author.name || post.author.email || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-[15px]">
                          {post.author.name || post.author.email || 'Anonymous'}
                        </span>
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded ${
                            post.type === 'problem'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {post.type}
                        </span>
                        <span className="text-teal-100/50 text-[13px]">
                          · {formatDate(post.createdAt)}
                        </span>
                        {post.isOwn && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingPostId === post.id}
                            className="ml-auto text-red-400/80 hover:text-red-400 text-xs disabled:opacity-50"
                            aria-label="Delete post"
                          >
                            {deletingPostId === post.id ? '…' : 'Delete'}
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-[15px] text-teal-100/90 whitespace-pre-wrap break-words leading-5">
                        {post.content}
                      </p>
                      {post.imageUrls.length > 0 && (
                        <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 max-w-full">
                          <div className="grid gap-1 grid-cols-2">
                            {post.imageUrls.slice(0, 4).map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aspect-video bg-zinc-800/50"
                              >
                                <img
                                  src={url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-teal-100/50">
                        <button
                          type="button"
                          onClick={() => handleLikePost(post.id)}
                          disabled={likingPostId === post.id}
                          className={`flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ${
                            post.likedByMe ? 'text-red-400' : 'hover:text-red-400/80'
                          }`}
                          aria-label={post.likedByMe ? 'Unlike' : 'Like'}
                        >
                          <span className="text-base">{post.likedByMe ? '❤️' : '🤍'}</span>
                          <span>{(post.likeCount ?? 0) > 0 ? post.likeCount : 'Like'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1.5 text-sm hover:text-[#38bdf8] transition-colors"
                        >
                          <span className="text-base">💬</span>
                          {post._count.comments > 0 ? (
                            <span>{post._count.comments}</span>
                          ) : (
                            <span>Comment</span>
                          )}
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShareMenuPostId(shareMenuPostId === post.id ? null : post.id)}
                            className="flex items-center gap-1.5 text-sm hover:text-[#38bdf8] transition-colors"
                            aria-label="Share"
                          >
                            <span className="text-base">↗</span>
                            <span>Share</span>
                          </button>
                          {shareMenuPostId === post.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                aria-hidden
                                onClick={() => setShareMenuPostId(null)}
                              />
                              <div className="absolute left-0 top-full mt-1 z-20 py-1 rounded-lg bg-[#0c2321] border border-white/10 shadow-xl min-w-[140px]">
                                <button
                                  type="button"
                                  onClick={() => handleShare(post, 'twitter')}
                                  className="w-full px-3 py-2 text-left text-sm text-teal-100 hover:bg-white/5"
                                >
                                  Twitter / X
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShare(post, 'linkedin')}
                                  className="w-full px-3 py-2 text-left text-sm text-teal-100 hover:bg-white/5"
                                >
                                  LinkedIn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShare(post, 'copy')}
                                  className="w-full px-3 py-2 text-left text-sm text-teal-100 hover:bg-white/5"
                                >
                                  Copy link
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments thread */}
                  {expandedComments.has(post.id) && (
                    <div className="mt-4 ml-12 pl-4 border-l-2 border-white/10 space-y-3">
                      {(commentsByPost[post.id] || []).map((c) => (
                        <div key={c.id} className="flex gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#38bdf8]/10 flex-shrink-0 flex items-center justify-center text-[#38bdf8] text-xs font-medium">
                            {(c.author.name || c.author.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-teal-100/60">
                              {c.author.name || c.author.email} · {formatDate(c.createdAt)}
                            </span>
                            <p className="text-[14px] text-teal-100/90 mt-0.5">{c.content}</p>
                            <button
                              type="button"
                              onClick={() => handleLikeComment(c.id, post.id)}
                              disabled={likingCommentId === c.id}
                              className={`mt-0.5 flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
                                c.likedByMe ? 'text-red-400' : 'text-teal-100/50 hover:text-red-400/80'
                              }`}
                              aria-label={c.likedByMe ? 'Unlike comment' : 'Like comment'}
                            >
                              {c.likedByMe ? '❤️' : '🤍'}
                              {(c.likeCount ?? 0) > 0 && <span>{c.likeCount}</span>}
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={commentText[post.id] || ''}
                          onChange={(e) =>
                            setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder="Post a reply..."
                          className="flex-1 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8]/40"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(post.id)}
                          disabled={
                            !(commentText[post.id] || '').trim() || submittingComment[post.id]
                          }
                          className="px-4 py-2 rounded-full bg-[#38bdf8] text-gray-900 text-sm font-semibold hover:bg-[#0ff0fc] disabled:opacity-50 transition-colors"
                        >
                          {submittingComment[post.id] ? '...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}

        {pagination.totalPages > 1 && (
          <div className="py-4 px-4 flex justify-center gap-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => fetchPosts(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-4 py-2 rounded-full border border-[#38bdf8]/30 text-sm text-teal-200 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-teal-200/80 text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => fetchPosts(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 rounded-full border border-[#38bdf8]/30 text-sm text-teal-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
