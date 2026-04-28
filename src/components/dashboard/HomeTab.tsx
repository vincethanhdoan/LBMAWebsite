import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Bell, BookOpen, Loader2, MessageCircle, MessageSquare, Trophy, Award, Star } from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import {
  getSectionUnreadCounts,
  getUnreadMessageCount,
  getUnreadNotificationCount,
  getNewFeedbackCount,
} from '../../lib/supabase/queries';

type User = {
  id: string;
  email: string;
  role: 'admin' | 'family';
  displayName: string;
};

type Student = {
  id: string;
  name: string;
  age: number | null;
  beltLevel: string;
};


type HomeTabProps = {
  user: User;
  onNavigate: (tab: string) => void;
};

export function HomeTab({ user, onNavigate }: HomeTabProps) {
  const {
    family,
    students: profileStudents,
    review,
    loading: profileLoading,
    error: profileError,
    reload: reloadProfile,
  } = useProfile(user);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [blogCount, setBlogCount] = useState(0);
  const [commentNotifCount, setCommentNotifCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getAgeFromDob = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;

    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const students: Student[] = profileStudents.map((student) => ({
    id: student.student_id,
    name: `${student.first_name} ${student.last_name}`.trim(),
    age: getAgeFromDob(student.date_of_birth),
    beltLevel: student.belt_level || 'No belt assigned',
  }));

  const loadHomeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [sectionCountsResult, unreadMessagesResult, commentCountResult] = await Promise.allSettled([
        getSectionUnreadCounts(user.id),
        getUnreadMessageCount(),
        getUnreadNotificationCount(),
      ]);

      if (sectionCountsResult.status === 'rejected') throw sectionCountsResult.reason;
      if (unreadMessagesResult.status === 'rejected') throw unreadMessagesResult.reason;
      if (commentCountResult.status === 'rejected') throw commentCountResult.reason;

      const sectionCounts = sectionCountsResult.value;
      const commentCount = commentCountResult.value;

      setUnreadMessages(unreadMessagesResult.value);
      setAnnouncementCount(sectionCounts.announcements);
      setBlogCount(sectionCounts.blog);
      setCommentNotifCount(commentCount);
    } catch (err) {
      console.error('Error loading home dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load home dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  // Load new feedback count once family is known
  useEffect(() => {
    if (!family?.family_id) return;
    getNewFeedbackCount(user.id, family.family_id)
      .then(setFeedbackCount)
      .catch(() => {}); // non-critical
  }, [family?.family_id, user.id]);

  const newFeedbackCount = feedbackCount;
  const newAnnouncementsCount = announcementCount;

  const allNotifications = [
    {
      type: 'feedback',
      count: newFeedbackCount,
      label: 'Instructor Feedback',
      icon: Award,
      action: () => onNavigate('feedback')
    },
    {
      type: 'messages',
      count: unreadMessages,
      label: 'Unread Messages',
      icon: MessageSquare,
      action: () => onNavigate('messages')
    },
    {
      type: 'announcements',
      count: newAnnouncementsCount,
      label: 'New Announcements',
      icon: Bell,
      action: () => onNavigate('announcements')
    },
    {
      type: 'blog',
      count: blogCount,
      label: 'New Blog Posts',
      icon: BookOpen,
      action: () => onNavigate('blog'),
    },
    {
      type: 'comments',
      count: commentNotifCount,
      label: 'New Comment Replies',
      icon: MessageCircle,
      action: () => onNavigate('announcements'),
    },
  ];

  const notifications = allNotifications.filter((n) => n.count > 0);
  const totalNotifications = newFeedbackCount + unreadMessages + newAnnouncementsCount + blogCount + commentNotifCount;

  const isLoading = loading || profileLoading;
  const loadError = error || profileError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load your dashboard</CardTitle>
          <CardDescription>{loadError}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              reloadProfile();
              loadHomeData();
            }}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Welcome back, {user.displayName.split(' ')[0]}</h2>
        <p className="text-muted-foreground">
          Here's what's happening with your family at LBMAA
        </p>
      </div>

      {/* New Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                {totalNotifications === 0
                  ? 'Nothing new right now'
                  : `${totalNotifications} ${totalNotifications === 1 ? 'update' : 'updates'} waiting for you`}
              </CardDescription>
            </div>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">You're all caught up — nothing new right now.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {notifications.map((notification) => {
                const Icon = notification.icon;
                return (
                  <button
                    key={notification.type}
                    onClick={notification.action}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-primary/5 ring-2 ring-primary/30 hover:bg-primary/10 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold">{notification.count}</div>
                      <div className="text-sm text-muted-foreground">{notification.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Students</CardTitle>
              <CardDescription>Quick overview of your children's progress</CardDescription>
            </div>
            <Button variant="outline" onClick={() => onNavigate('profile')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No students on file yet. Add your student details in Profile to get started.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {students.map((student) => (
              <Card key={student.id} className="bg-secondary/50">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-lg">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{student.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {student.age === null ? 'Age not available' : `Age ${student.age}`}
                      </p>
                      <div className="mt-2">
                        <Badge variant="secondary" className="gap-1">
                          <Trophy className="w-3 h-3" />
                          {student.beltLevel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => onNavigate('feedback')}
                  >
                    <Award className="w-4 h-4 mr-2" />
                    View Feedback
                  </Button>
                </CardHeader>
              </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review nudge — only shown when family has no review yet */}
      {!review && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-center justify-between gap-4 pt-5 pb-5">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm">
                <span className="font-medium">Enjoying LBMAA?</span>{' '}
                Leave a quick review — it helps other families find us.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate('reviews')} className="flex-shrink-0">
              Write a Review
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}