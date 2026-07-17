import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { SignedAvatarImage } from '../SignedAvatarImage';
import { LoadErrorCard } from '../shared/LoadErrorCard';
import { SignedImage } from '../SignedImage';
import { MessageCircle, Send, Pin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { markSectionSeen } from '../../lib/supabase/mutations';
import { ANNOUNCEMENT_IMAGES_BUCKET } from '../../lib/supabase/storagePaths';
import {
  useAnnouncements,
  useAnnouncementComments,
  useCreateAnnouncementComment,
} from '../../lib/hooks/announcements';

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
  parentCommentId?: string | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  createdAt: string;
  imageUrl?: string;
  isPinned?: boolean;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function AnnouncementCommentSection({
  announcementId,
  onCountLoaded,
}: {
  announcementId: string;
  onCountLoaded?: (count: number) => void;
}) {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    authorName: string;
  } | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: rawComments = [] } = useAnnouncementComments(announcementId);
  const createComment = useCreateAnnouncementComment(announcementId);

  const comments: Comment[] = rawComments.map((c: any) => ({
    id: c.comment_id,
    authorName: c.profiles?.display_name || 'Unknown',
    authorAvatarUrl: c.profiles?.avatar_url ?? null,
    body: c.body,
    createdAt: c.created_at,
    parentCommentId: c.parent_comment_id ?? null,
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

  const handleSendReply = async () => {
    if (!replyText.trim() || !replyingTo) return;
    try {
      await createComment.mutateAsync({
        body: replyText.trim(),
        parentCommentId: replyingTo.commentId,
      });
      setReplyText('');
      setReplyingTo(null);
    } catch {
      toast.error('Failed to send reply');
    }
  };

  return (
    <div className="space-y-4 pl-4 border-l-2 border-border">
      {comments.map((comment) => (
        <div key={comment.id} className="space-y-1">
          {comment.parentCommentId && (
            <p className="text-xs text-muted-foreground pl-2 border-l-2 border-muted mb-1">
              ↩ Replying to{' '}
              {comments.find((c) => c.id === comment.parentCommentId)
                ?.authorName ?? 'comment'}
            </p>
          )}
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
          <p className="text-sm pl-8">{comment.body}</p>
          {!comment.parentCommentId && (
            <button
              onClick={() =>
                setReplyingTo({
                  commentId: comment.id,
                  authorName: comment.authorName,
                })
              }
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
                  if (e.key === 'Escape') {
                    setReplyingTo(null);
                    setReplyText('');
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || createComment.isPending}
                >
                  {createComment.isPending ? (
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
          placeholder="Ask a question or leave a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="min-h-[80px]"
        />
        <Button
          onClick={handleAddComment}
          disabled={!commentText.trim() || createComment.isPending}
          size="sm"
          className="gap-1.5"
        >
          {createComment.isPending ? (
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

export function AnnouncementsTab({ user: _user }: { user: User }) {
  const [expandedComments, setExpandedComments] = useState<{
    [key: string]: boolean;
  }>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );

  const {
    data: rawAnnouncements = [],
    isLoading: loading,
    isError: loadFailed,
    error: loadError,
    refetch: reloadAnnouncements,
  } = useAnnouncements();

  useEffect(() => {
    markSectionSeen('announcements').catch(console.error);
  }, []);

  const announcements: Announcement[] = rawAnnouncements.map((a: any) => ({
    id: a.announcement_id,
    title: a.title,
    body: a.body,
    authorName: a.profiles?.display_name || 'Unknown',
    authorAvatarUrl: a.profiles?.avatar_url ?? null,
    createdAt: a.created_at,
    imageUrl: a.image_url || undefined,
    isPinned: a.is_pinned || false,
  }));

  // Sort announcements: pinned first, then by date
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const toggleComments = (announcementId: string) => {
    setExpandedComments({
      ...expandedComments,
      [announcementId]: !expandedComments[announcementId],
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
        title="Unable to load announcements"
        error={loadError}
        onRetry={() => reloadAnnouncements()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Announcements</h2>
          <p className="text-muted-foreground mt-1">
            Important updates from the LBMAA team
          </p>
        </div>
      </div>

      {sortedAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No announcements yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedAnnouncements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader
                className={
                  announcement.isPinned
                    ? 'bg-secondary/50 border-l-4 border-l-primary'
                    : ''
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <SignedAvatarImage
                          path={announcement.authorAvatarUrl ?? null}
                          alt={announcement.authorName}
                        />
                        <AvatarFallback>
                          {announcement.authorName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {announcement.authorName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(announcement.createdAt)}
                        </p>
                      </div>
                    </div>
                    <CardTitle>{announcement.title}</CardTitle>
                  </div>
                  {announcement.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      <Pin className="w-3 h-3" />
                      Pinned
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground whitespace-pre-line">
                  {announcement.body}
                </p>

                {announcement.imageUrl && (
                  <SignedImage
                    path={announcement.imageUrl ?? null}
                    bucket={ANNOUNCEMENT_IMAGES_BUCKET}
                    alt={announcement.title}
                    className="w-full max-w-2xl rounded-lg"
                  />
                )}

                {/* Comments Section */}
                <div className="border-t pt-4 space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleComments(announcement.id)}
                    className="gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {commentCounts[announcement.id] !== undefined
                      ? `${commentCounts[announcement.id]} ${commentCounts[announcement.id] === 1 ? 'Comment' : 'Comments'}`
                      : 'Comments'}
                  </Button>

                  {expandedComments[announcement.id] && (
                    <AnnouncementCommentSection
                      announcementId={announcement.id}
                      onCountLoaded={(count) =>
                        setCommentCounts((prev) => ({
                          ...prev,
                          [announcement.id]: count,
                        }))
                      }
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
