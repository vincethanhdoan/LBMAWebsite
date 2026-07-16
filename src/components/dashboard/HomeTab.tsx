import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { SignedAvatarImage } from '../SignedAvatarImage';
import { Badge } from '../ui/badge';
import {
  Bell,
  BookOpen,
  Loader2,
  MessageCircle,
  MessageSquare,
  Trophy,
  Award,
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { useHomeCounts, useFeedbackCount } from '../../lib/hooks/notifications';

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
  photoUrl: string | null;
};

type HomeTabProps = {
  user: User;
  onNavigate: (tab: string) => void;
};

export function HomeTab({ user, onNavigate }: HomeTabProps) {
  const {
    family,
    students: profileStudents,
    loading: profileLoading,
    error: profileError,
    reload: reloadProfile,
  } = useProfile(user);
  const {
    data: counts,
    isLoading: loading,
    error: countsError,
    refetch: reloadCounts,
  } = useHomeCounts(user.id);
  const { data: feedbackCount = 0 } = useFeedbackCount(
    user.id,
    family?.family_id ?? '',
  );
  const unreadMessages = counts?.unreadMessages ?? 0;
  const announcementCount = counts?.announcementCount ?? 0;
  const blogCount = counts?.blogCount ?? 0;
  const notifCount = counts?.notifCount ?? 0;
  const error = countsError instanceof Error ? countsError.message : null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
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
    photoUrl: student.photo_url ?? null,
  }));

  const newAnnouncementsCount = announcementCount;

  const allNotifications = [
    {
      type: 'messages',
      count: unreadMessages,
      label: 'Unread Messages',
      icon: MessageSquare,
      action: () => onNavigate('messages'),
    },
    {
      type: 'announcements',
      count: newAnnouncementsCount,
      label: 'New Announcements',
      icon: Bell,
      action: () => onNavigate('announcements'),
    },
    {
      type: 'blog',
      count: blogCount,
      label: 'New Blog Posts',
      icon: BookOpen,
      action: () => onNavigate('blog'),
    },
    {
      type: 'feedback',
      count: feedbackCount,
      label: 'New Instructor Feedback',
      icon: Award,
      action: () => onNavigate('feedback'),
    },
    {
      type: 'comments',
      count: notifCount,
      label: 'New Comment Replies',
      icon: MessageCircle,
      action: () => onNavigate('announcements'),
    },
  ];

  const notifications = allNotifications.filter((n) => n.count > 0);
  const totalNotifications =
    unreadMessages +
    newAnnouncementsCount +
    blogCount +
    feedbackCount +
    notifCount;

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
              reloadCounts();
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
        <h2 className="text-2xl font-bold">
          Welcome back, {user.displayName.split(' ')[0]}
        </h2>
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
            <p className="text-sm text-muted-foreground py-2">
              You're all caught up — nothing new right now.
            </p>
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
                      <div className="text-2xl font-bold">
                        {notification.count}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {notification.label}
                      </div>
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
              <CardDescription>
                Quick overview of your children's progress
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => onNavigate('profile')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No students on file yet. Add your student details in Profile to
              get started.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {students.map((student) => (
                <Card key={student.id} className="bg-secondary/50">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <SignedAvatarImage
                          path={student.photoUrl}
                          alt={student.name}
                        />
                        <AvatarFallback className="text-lg">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {student.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {student.age === null
                            ? 'Age not available'
                            : `Age ${student.age}`}
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
    </div>
  );
}
