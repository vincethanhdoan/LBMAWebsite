import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { MessageCircle, Send, Pin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getAnnouncements, getAnnouncementComments } from '../../lib/supabase/queries';
import { createAnnouncementComment } from '../../lib/supabase/mutations';
import { subscribeToAnnouncements, subscribeToAnnouncementComments, unsubscribe } from '../../lib/supabase/realtime';
import type { Announcement as AnnouncementType, AnnouncementComment as AnnouncementCommentType } from '../../lib/types';

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

type Announcement = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  imageUrl?: string;
  comments: Comment[];
  isPinned?: boolean;
};

export function AnnouncementsTab({ user }: { user: User }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [comments, setComments] = useState<{ [announcementId: string]: Comment[] }>({});
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [savingComment, setSavingComment] = useState<string | null>(null);

  // Load announcements and comments
  const loadData = async () => {
    try {
      setLoading(true);
      const announcementsData = await getAnnouncements();
      
      // Convert to UI format
      const formattedAnnouncements: Announcement[] = announcementsData.map((a: any) => ({
        id: a.announcement_id,
        title: a.title,
        body: a.body,
        authorName: a.profiles?.display_name || 'Unknown',
        createdAt: a.created_at,
        imageUrl: a.image_url || undefined,
        isPinned: a.is_pinned || false,
      }));

      setAnnouncements(formattedAnnouncements);

      // Load comments for each announcement
      const commentsMap: { [key: string]: Comment[] } = {};
      for (const ann of formattedAnnouncements) {
        const commentsData = await getAnnouncementComments(ann.id);
        commentsMap[ann.id] = commentsData.map((c: any) => ({
          id: c.comment_id,
          authorName: c.profiles?.display_name || 'Unknown',
          body: c.body,
          createdAt: c.created_at,
        }));
      }
      setComments(commentsMap);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast.error('Error loading announcements: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up real-time subscriptions
    const announcementsChannel = subscribeToAnnouncements((payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        // Reload announcements when new one is added
        loadData();
      }
    });

    return () => {
      unsubscribe(announcementsChannel);
    };
  }, []);

  // Set up comment subscriptions when comments are expanded
  useEffect(() => {
    const channels: any[] = [];
    
    Object.keys(expandedComments).forEach((announcementId) => {
      if (expandedComments[announcementId]) {
        const channel = subscribeToAnnouncementComments(announcementId, (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            // Reload comments for this announcement
            getAnnouncementComments(announcementId).then((commentsData) => {
              setComments((prev) => ({
                ...prev,
                [announcementId]: commentsData.map((c: any) => ({
                  id: c.comment_id,
                  authorName: c.profiles?.display_name || 'Unknown',
                  body: c.body,
                  createdAt: c.created_at,
                })),
              }));
            });
          }
        });
        channels.push(channel);
      }
    });

    return () => {
      channels.forEach(channel => unsubscribe(channel));
    };
  }, [expandedComments]);

  // Sort announcements: pinned first, then by date
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleAddComment = async (announcementId: string) => {
    const commentText = commentTexts[announcementId];
    if (!commentText?.trim() || !user) return;

    setSavingComment(announcementId);
    try {
      await createAnnouncementComment({
        announcement_id: announcementId,
        author_user_id: user.id,
        body: commentText.trim(),
      });

      // Reload comments
      const commentsData = await getAnnouncementComments(announcementId);
      setComments((prev) => ({
        ...prev,
        [announcementId]: commentsData.map((c: any) => ({
          id: c.comment_id,
          authorName: c.profiles?.display_name || 'Unknown',
          body: c.body,
          createdAt: c.created_at,
        })),
      }));

      setCommentTexts({ ...commentTexts, [announcementId]: '' });
    } catch (error) {
      toast.error('Error adding comment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSavingComment(null);
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

  const toggleComments = (announcementId: string) => {
    setExpandedComments({
      ...expandedComments,
      [announcementId]: !expandedComments[announcementId]
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
          <h2 className="text-3xl font-bold">Announcements</h2>
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
          {sortedAnnouncements.map((announcement) => {
            const announcementComments = comments[announcement.id] || [];
            return (
          <Card key={announcement.id}>
            <CardHeader className={announcement.isPinned ? 'bg-secondary/50 border-l-4 border-l-primary' : ''}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{announcement.authorName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{announcement.authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(announcement.createdAt)}
                      </p>
                    </div>
                  </div>
                  <CardTitle>{announcement.title}</CardTitle>
                </div>
                <div className="flex gap-2">
                  {announcement.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      <Pin className="w-3 h-3" />
                      Pinned
                    </span>
                  )}
                  <Badge variant="secondary">Official</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground whitespace-pre-line">{announcement.body}</p>
              
              {announcement.imageUrl && (
                <ImageWithFallback
                  src={announcement.imageUrl}
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
                  {announcementComments.length} {announcementComments.length === 1 ? 'Comment' : 'Comments'}
                </Button>

                {expandedComments[announcement.id] && (
                  <div className="space-y-4 pl-4 border-l-2 border-border">
                    {announcementComments.map((comment) => (
                      <div key={comment.id} className="space-y-1">
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
                      </div>
                    ))}

                    {/* Add Comment */}
                    <div className="flex gap-2 pt-2">
                      <Textarea
                        placeholder="Ask a question or leave a comment..."
                        value={commentTexts[announcement.id] || ''}
                        onChange={(e) =>
                          setCommentTexts({
                            ...commentTexts,
                            [announcement.id]: e.target.value
                          })
                        }
                        className="min-h-[80px]"
                      />
                      <Button
                        onClick={() => handleAddComment(announcement.id)}
                        disabled={!commentTexts[announcement.id]?.trim() || savingComment === announcement.id}
                        size="sm"
                      >
                        {savingComment === announcement.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
