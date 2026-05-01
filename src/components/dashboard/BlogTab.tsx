import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Plus, MessageCircle, Send, Pin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createBlogPost, markSectionSeen } from '../../lib/supabase/mutations';
import {
  useBlogPosts,
  useBlogComments,
  useCreateBlogComment,
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
  body: string;
  createdAt: string;
  parentCommentId?: string | null;
};

type BlogPost = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  isPinned?: boolean;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BlogCommentSection({ postId }: { postId: string }) {
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    authorName: string;
  } | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: rawComments = [] } = useBlogComments(postId);
  const createComment = useCreateBlogComment(postId);

  const comments: Comment[] = rawComments.map((c: any) => ({
    id: c.comment_id,
    authorName: c.profiles?.display_name || 'Unknown',
    body: c.body,
    createdAt: c.created_at,
    parentCommentId: c.parent_comment_id ?? null,
  }));

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSavingComment(true);
    try {
      await createComment.mutateAsync({ body: commentText.trim() });
      setCommentText('');
    } catch (error) {
      toast.error('Error adding comment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSavingComment(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !replyingTo) return;
    setSavingComment(true);
    try {
      await createComment.mutateAsync({ body: replyText.trim(), parentCommentId: replyingTo.commentId });
      setReplyText('');
      setReplyingTo(null);
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSavingComment(false);
    }
  };

  return (
    <div className="space-y-4 pl-4 border-l-2 border-border">
      {comments.map((comment) => (
        <div key={comment.id} className="space-y-1">
          {comment.parentCommentId && (
            <p className="text-xs text-muted-foreground pl-2 border-l-2 border-muted mb-1">
              ↩ Replying to {
                comments.find(c => c.id === comment.parentCommentId)?.authorName ?? 'comment'
              }
            </p>
          )}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {comment.authorName[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{comment.authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm pl-8">{comment.body}</p>
          {!comment.parentCommentId && (
            <button
              onClick={() => setReplyingTo({
                commentId: comment.id,
                authorName: comment.authorName,
              })}
              className="text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
            >
              Reply
            </button>
          )}
          {replyingTo?.commentId === comment.id && (
            <div className="ml-8 mt-2 space-y-2">
              <Textarea
                autoFocus
                placeholder={`Reply to ${replyingTo.authorName}…`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="text-sm min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setReplyingTo(null); setReplyText(''); }
                }}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setReplyingTo(null); setReplyText(''); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || savingComment}
                >
                  {savingComment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Comment */}
      <div className="flex gap-2 pt-2">
        <Textarea
          placeholder="Add a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="min-h-[80px]"
        />
        <Button
          onClick={handleAddComment}
          disabled={!commentText.trim() || savingComment}
          size="sm"
          className="gap-1.5"
        >
          {savingComment ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Post
        </Button>
      </div>
    </div>
  );
}

export function BlogTab({ user }: { user: User }) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [saving, setSaving] = useState(false);

  const { data: rawPosts = [], isLoading: loading } = useBlogPosts();

  useEffect(() => {
    markSectionSeen('blog').catch(console.error);
  }, []);

  const posts: BlogPost[] = rawPosts.map((p: any) => ({
    id: p.post_id,
    title: p.title,
    body: p.body,
    authorName: p.profiles?.display_name || 'Unknown',
    createdAt: p.created_at,
    isPinned: p.is_pinned || false,
  }));

  // Sort posts: pinned first, then by date
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostBody.trim() || !user) return;

    setSaving(true);
    try {
      await createBlogPost({
        author_user_id: user.id,
        title: newPostTitle.trim(),
        body: newPostBody.trim(),
      });

      setNewPostTitle('');
      setNewPostBody('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error('Error creating post: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments({
      ...expandedComments,
      [postId]: !expandedComments[postId]
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Parent Blog</h2>
          <p className="text-muted-foreground mt-1">
            Share experiences and connect with other families
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create a Blog Post</DialogTitle>
              <DialogDescription>
                Share your thoughts, tips, or questions with the community
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Give your post a title..."
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="What would you like to share?"
                  value={newPostBody}
                  onChange={(e) => setNewPostBody(e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={!newPostTitle.trim() || !newPostBody.trim() || saving}
              >
                Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {sortedPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No blog posts yet. Be the first to share!</p>
            </CardContent>
          </Card>
        ) : (
          sortedPosts.map((post) => (
          <Card key={post.id}>
            <CardHeader className={post.isPinned ? 'bg-secondary/50 border-l-4 border-l-primary' : ''}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
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
                {post.isPinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    <Pin className="w-3 h-3" />
                    Pinned
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground whitespace-pre-line">{post.body}</p>

              {/* Comments Section */}
              <div className="border-t pt-4 space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleComments(post.id)}
                  className="gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Comments
                </Button>

                {expandedComments[post.id] && (
                  <BlogCommentSection postId={post.id} />
                )}
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  );
}
