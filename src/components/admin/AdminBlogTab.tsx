import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LoadErrorCard } from '../shared/LoadErrorCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { SignedAvatarImage } from '../SignedAvatarImage';
import { toast } from 'sonner';
import {
  Edit2,
  Trash2,
  MessageCircle,
  Send,
  Search,
  Loader2,
} from 'lucide-react';
import {
  useBlogPosts,
  useBlogComments,
  useUpdateBlogPost,
  useDeleteBlogPost,
  useCreateBlogComment,
  useDeleteBlogComment,
} from '../../lib/hooks/blog';

type User = {
  id: string;
  email: string;
  role: 'admin' | 'family';
  displayName: string;
};

type Comment = {
  id: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  body: string;
  createdAt: string;
};

type BlogPost = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  createdAt: string;
  comments: Comment[];
};

function AdminBlogCommentSection({
  postId,
  onCountLoaded,
}: {
  postId: string;
  onCountLoaded?: (count: number) => void;
}) {
  const [commentText, setCommentText] = useState('');
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const { data: rawComments = [] } = useBlogComments(postId);
  const createComment = useCreateBlogComment(postId);
  const deleteComment = useDeleteBlogComment(postId);

  const comments: Comment[] = rawComments.map((c: any) => ({
    id: c.comment_id,
    authorName: c.profiles?.display_name || 'Unknown',
    authorAvatarUrl: c.profiles?.avatar_url ?? null,
    body: c.body,
    createdAt: c.created_at,
  }));

  const onCountLoadedRef = useRef(onCountLoaded);
  useEffect(() => {
    onCountLoadedRef.current = onCountLoaded;
  });
  useEffect(() => {
    onCountLoadedRef.current?.(comments.length);
  }, [comments.length]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await createComment.mutateAsync({ body: commentText.trim() });
      setCommentText('');
    } catch (error) {
      toast.error(
        'Error adding comment: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setConfirmState({
      title: 'Delete comment',
      description: 'Are you sure you want to delete this comment?',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await deleteComment.mutateAsync(commentId);
          toast.success('Comment deleted!');
        } catch (error) {
          toast.error(
            'Error deleting comment: ' +
              (error instanceof Error ? error.message : 'Unknown error'),
          );
        }
      },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4 pl-4 border-l-2 border-border">
      {comments.map((comment) => (
        <div key={comment.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <SignedAvatarImage
                  path={comment.authorAvatarUrl ?? null}
                  alt={comment.authorName}
                />
                <AvatarFallback className="text-xs">
                  {comment.authorName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{comment.authorName}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteComment(comment.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-sm pl-8">{comment.body}</p>
        </div>
      ))}

      {/* Add Comment as Admin */}
      <div className="flex gap-2 pt-2">
        <Textarea
          placeholder="Add a comment as admin..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="min-h-[80px]"
        />
        <Button
          onClick={handleAddComment}
          disabled={!commentText.trim()}
          size="sm"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

export function AdminBlogTab({ user: _user }: { user: User }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [expandedComments, setExpandedComments] = useState<{
    [key: string]: boolean;
  }>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(
    null,
  );
  const processedPostParam = useRef<string | null>(null);

  const {
    data: rawPosts = [],
    isLoading: loading,
    isError: loadFailed,
    error: loadError,
    refetch: reloadPosts,
  } = useBlogPosts();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();

  const posts: BlogPost[] = rawPosts.map((p: any) => ({
    id: p.post_id,
    title: p.title,
    body: p.body,
    authorName: p.profiles?.display_name || 'Unknown',
    authorAvatarUrl: p.profiles?.avatar_url ?? null,
    createdAt: p.created_at,
    comments: [],
  }));

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.authorName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sortedPosts = [...filteredPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Deep link: `?post=<id>` clears any active search, scrolls to the post and
  // flashes a highlight, then strips the param. Runs once per param value
  // (guarded by a ref) and waits for the list to load.
  const deepLinkPostId = searchParams.get('post');
  useEffect(() => {
    if (!deepLinkPostId || loading) return;

    const stripPostParam = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('post');
      setSearchParams(next, { replace: true });
    };

    if (processedPostParam.current === deepLinkPostId) {
      stripPostParam();
      return;
    }
    processedPostParam.current = deepLinkPostId;

    setSearchTerm('');
    if (posts.some((p) => p.id === deepLinkPostId)) {
      setHighlightedPostId(deepLinkPostId);
    }

    stripPostParam();
  }, [deepLinkPostId, loading, posts, searchParams, setSearchParams]);

  useEffect(() => {
    if (!highlightedPostId) return;
    document
      .getElementById('post-' + highlightedPostId)
      ?.scrollIntoView({ block: 'center' });
    const timer = setTimeout(() => setHighlightedPostId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedPostId]);

  const handleUpdate = async () => {
    if (!editingPost || !editTitle.trim() || !editBody.trim()) return;
    setSaving(true);
    try {
      await updatePost.mutateAsync({
        id: editingPost.id,
        updates: {
          title: editTitle.trim(),
          body: editBody.trim(),
        },
      });
      setEditingPost(null);
      setEditTitle('');
      setEditBody('');
      toast.success('Blog post updated!');
    } catch (error) {
      toast.error(
        'Error updating blog post: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: 'Delete blog post',
      description:
        'Are you sure you want to delete this blog post? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await deletePost.mutateAsync(id);
          toast.success('Blog post deleted!');
        } catch (error) {
          toast.error(
            'Error deleting blog post: ' +
              (error instanceof Error ? error.message : 'Unknown error'),
          );
        }
      },
    });
  };

  const openEditDialog = (post: BlogPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditBody(post.body);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const toggleComments = (postId: string) => {
    setExpandedComments({
      ...expandedComments,
      [postId]: !expandedComments[postId],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <LoadErrorCard
        title="Unable to load blog posts"
        error={loadError}
        onRetry={() => reloadPosts()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Manage Parent Blog</h2>
          <p className="text-muted-foreground mt-1">
            View, edit, and moderate parent blog posts and comments
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search blog posts by title, content, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>Update the blog post content</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Post title..."
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Post content..."
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
            {editingPost && (
              <div className="text-sm text-muted-foreground">
                Posted by {editingPost.authorName} on{' '}
                {formatDate(editingPost.createdAt)}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingPost(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!editTitle.trim() || !editBody.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blog Posts List */}
      <div className="space-y-6">
        {sortedPosts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              {searchTerm
                ? 'No posts found matching your search.'
                : 'No blog posts yet.'}
            </CardContent>
          </Card>
        ) : (
          sortedPosts.map((post) => (
            <Card
              key={post.id}
              id={`post-${post.id}`}
              className={`transition-shadow duration-700 ${highlightedPostId === post.id ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <SignedAvatarImage
                          path={post.authorAvatarUrl ?? null}
                          alt={post.authorName}
                        />
                        <AvatarFallback>{post.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{post.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    <CardTitle>{post.title}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(post)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground whitespace-pre-line">
                  {post.body}
                </p>

                {/* Comments Section */}
                <div className="border-t pt-4 space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleComments(post.id)}
                    className="gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {commentCounts[post.id] !== undefined
                      ? `${commentCounts[post.id]} ${commentCounts[post.id] === 1 ? 'Comment' : 'Comments'}`
                      : 'Comments'}
                  </Button>

                  {expandedComments[post.id] && (
                    <AdminBlogCommentSection
                      postId={post.id}
                      onCountLoaded={(count) =>
                        setCommentCounts((prev) => ({
                          ...prev,
                          [post.id]: count,
                        }))
                      }
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info Box */}
      <Card className="bg-secondary border-primary/20">
        <CardContent className="pt-6">
          <p className="text-sm">
            <strong>Admin Note:</strong> You can edit or delete any blog post or
            comment. Use this power responsibly - only remove content that
            violates community guidelines. When in doubt, reach out to the
            family directly first.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
