import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Edit2, Trash2, MessageCircle, Send, Search, Loader2 } from 'lucide-react';
import { getBlogPosts, getBlogCommentsForPosts } from '../../lib/supabase/queries';
import { updateBlogPost, deleteBlogPost, deleteBlogComment, createBlogComment } from '../../lib/supabase/mutations';
import { subscribeToBlogPosts, unsubscribe } from '../../lib/supabase/realtime';

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
};

type BlogPost = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  comments: Comment[];
};


export function AdminBlogTab({ user }: { user: User }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const postsData = await getBlogPosts();
      
      const formatted: BlogPost[] = postsData.map((p: any) => ({
        id: p.post_id,
        title: p.title,
        body: p.body,
        authorName: p.profiles?.display_name || 'Unknown',
        createdAt: p.created_at,
      }));

      setPosts(formatted);

      // Load all comments in a single query
      const postIds = formatted.map(p => p.id);
      const rawComments = await getBlogCommentsForPosts(postIds);
      const commentsMap: { [key: string]: Comment[] } = {};
      for (const [postId, commentRows] of Object.entries(rawComments)) {
        commentsMap[postId] = (commentRows as any[]).map(c => ({
          id: c.comment_id,
          authorName: c.profiles?.display_name || 'Unknown',
          body: c.body,
          createdAt: c.created_at,
        }));
      }
      setComments(commentsMap);
    } catch (error) {
      console.error('Error loading blog posts:', error);
      toast.error('Error loading blog posts: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();

    const channel = subscribeToBlogPosts((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        loadPosts();
      }
    });

    return () => unsubscribe(channel);
  }, []);

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.authorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedPosts = [...filteredPosts].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleUpdate = async () => {
    if (!editingPost || !editTitle.trim() || !editBody.trim()) return;
    setSaving(true);
    try {
      await updateBlogPost(editingPost.id, {
        title: editTitle.trim(),
        body: editBody.trim(),
      });
      setEditingPost(null);
      setEditTitle('');
      setEditBody('');
      await loadPosts();
      toast.success('Blog post updated!');
    } catch (error) {
      toast.error('Error updating blog post: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: 'Delete blog post',
      description: 'Are you sure you want to delete this blog post? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await deleteBlogPost(id);
          await loadPosts();
          toast.success('Blog post deleted!');
        } catch (error) {
          toast.error('Error deleting blog post: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      },
    });
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    setConfirmState({
      title: 'Delete comment',
      description: 'Are you sure you want to delete this comment?',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await deleteBlogComment(commentId);
          await loadPosts();
          toast.success('Comment deleted!');
        } catch (error) {
          toast.error('Error deleting comment: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      },
    });
  };

  const openEditDialog = (post: BlogPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditBody(post.body);
  };

  const handleAddComment = async (postId: string) => {
    const commentText = commentTexts[postId];
    if (!commentText?.trim() || !user) return;
    try {
      await createBlogComment(postId, commentText.trim());
      setCommentTexts({ ...commentTexts, [postId]: '' });
      await loadPosts();
    } catch (error) {
      toast.error('Error adding comment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
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
      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>
              Update the blog post content
            </DialogDescription>
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
                Posted by {editingPost.authorName} on {formatDate(editingPost.createdAt)}
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
              {searchTerm ? 'No posts found matching your search.' : 'No blog posts yet.'}
            </CardContent>
          </Card>
        ) : (
          sortedPosts.map((post) => {
            const postComments = comments[post.id] || [];
            return (
            <Card key={post.id}>
              <CardHeader>
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
                    {postComments.length} {postComments.length === 1 ? 'Comment' : 'Comments'}
                  </Button>

                  {expandedComments[post.id] && (
                    <div className="space-y-4 pl-4 border-l-2 border-border">
                      {postComments.map((comment) => (
                        <div key={comment.id} className="space-y-1">
                          <div className="flex items-center justify-between">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(post.id, comment.id)}
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
                          value={commentTexts[post.id] || ''}
                          onChange={(e) =>
                            setCommentTexts({
                              ...commentTexts,
                              [post.id]: e.target.value
                            })
                          }
                          className="min-h-[80px]"
                        />
                        <Button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentTexts[post.id]?.trim()}
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>

      {/* Info Box */}
      <Card className="bg-secondary border-primary/20">
        <CardContent className="pt-6">
          <p className="text-sm">
            <strong>Admin Note:</strong> You can edit or delete any blog post or comment. 
            Use this power responsibly - only remove content that violates community guidelines. 
            When in doubt, reach out to the family directly first.
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
