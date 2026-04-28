import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from './ui/sidebar';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { HomeTab } from './dashboard/HomeTab';
import { AnnouncementsTab } from './dashboard/AnnouncementsTab';
import { BlogTab } from './dashboard/BlogTab';
import { MessagesTab } from './dashboard/MessagesTab';
import { FeedbackTab } from './dashboard/FeedbackTab';
import { ReviewTab } from './dashboard/ReviewTab';
import { ProfileTab } from './dashboard/ProfileTab';
import { getUnreadMessageCount, getSectionUnreadCounts } from '../lib/supabase/queries';
import { markSectionSeen } from '../lib/supabase/mutations';
import { getInitials } from '../lib/format';
import type { User } from '../lib/types';
import { NotificationBell } from './NotificationBell';
import {
  Award,
  Bell,
  BookOpen,
  Home,
  LogOut,
  MessageSquare,
  Shield,
  Star,
  UserCircle,
} from 'lucide-react';

type DashboardV2Props = {
  user: NonNullable<User>;
  onLogout: () => void;
  onRefreshUser: () => Promise<void>;
};

type TabId = 'home' | 'announcements' | 'blog' | 'messages' | 'feedback' | 'reviews' | 'profile';

const navItems: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'announcements', label: 'Announcements', icon: Bell },
  { id: 'blog', label: 'Parent Blog', icon: BookOpen },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'feedback', label: 'Feedback', icon: Award },
  { id: 'reviews', label: 'Write a Review', icon: Star },
];

export function DashboardV2({ user, onLogout, onRefreshUser }: DashboardV2Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabId) ?? 'home';
  function setActiveTab(tab: TabId) {
    setSearchParams({ tab }, { replace: true });
    if (tab === 'feedback') markSectionSeen('feedback').catch(console.error);
  }
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadBlog, setUnreadBlog] = useState(0);

  useEffect(() => {
    getUnreadMessageCount()
      .then(setUnreadMessages)
      .catch(console.error);
    getSectionUnreadCounts(user.id)
      .then(({ announcements, blog }) => {
        setUnreadAnnouncements(announcements);
        setUnreadBlog(blog);
      })
      .catch(console.error);
  }, [user.id]);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        {/* ── Brand header ── */}
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
              <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col flex-1 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold leading-none text-sidebar-foreground">LBMAA</span>
              <span className="mt-0.5 text-xs text-sidebar-foreground/60">Parent Portal</span>
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <NotificationBell
                userId={user.id}
                onNavigate={(tab) => setActiveTab(tab as TabId)}
              />
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        {/* ── Navigation ── */}
        <SidebarContent className="py-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(({ id, label, icon: Icon }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      isActive={activeTab === id}
                      onClick={() => {
                        setActiveTab(id);
                        if (id === 'announcements') { setUnreadAnnouncements(0); markSectionSeen('announcements').catch(console.error); }
                        if (id === 'blog') { setUnreadBlog(0); markSectionSeen('blog').catch(console.error); }
                        if (id === 'feedback') markSectionSeen('feedback').catch(console.error);
                      }}
                      tooltip={label}
                      size="lg"
                      className={
                        activeTab === id
                          ? 'border-l-[3px] border-sidebar-primary rounded-tl-none rounded-bl-none pl-[calc(0.5rem-3px)]'
                          : ''
                      }
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                    {id === 'messages' && unreadMessages > 0 && (
                      <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </SidebarMenuBadge>
                    )}
                    {id === 'announcements' && unreadAnnouncements > 0 && (
                      <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                        {unreadAnnouncements > 9 ? '9+' : unreadAnnouncements}
                      </SidebarMenuBadge>
                    )}
                    {id === 'blog' && unreadBlog > 0 && (
                      <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                        {unreadBlog > 9 ? '9+' : unreadBlog}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* ── User footer ── */}
        <SidebarFooter className="pb-4">
          <SidebarSeparator className="mb-2" />

          {/* Expanded state */}
          <div className="px-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-none text-sidebar-foreground">
                  {user.displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-sidebar-foreground/60">{user.email}</p>
              </div>
            </div>
            <div className="mt-1 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={() => setActiveTab('profile')}
              >
                <UserCircle className="mr-1.5 h-4 w-4" />
                Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={onLogout}
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Collapsed state: icon-only */}
          <div className="hidden flex-col items-center gap-1 group-data-[collapsible=icon]:flex">
            <button
              onClick={() => setActiveTab('profile')}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Profile"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={onLogout}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* ── Main content area ── */}
      <SidebarInset>
        {/* Sticky top bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground" />
          <div className="h-5 w-px bg-border" />
          <h1 className="text-base font-semibold text-foreground">
            {navItems.find((i) => i.id === activeTab)?.label ?? 'Profile'}
          </h1>
          <div className="flex-1" />
          <span className="hidden text-sm text-muted-foreground md:block">
            Welcome, {user.displayName}
          </span>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'home' && <HomeTab user={user} onNavigate={(tab) => setActiveTab(tab as TabId)} />}
          {activeTab === 'announcements' && <AnnouncementsTab user={user} />}
          {activeTab === 'blog' && <BlogTab user={user} />}
          {activeTab === 'messages' && (
            <MessagesTab user={user} onUnreadCountChange={setUnreadMessages} />
          )}
          {activeTab === 'feedback' && <FeedbackTab user={user} />}
          {activeTab === 'reviews' && <ReviewTab user={user} />}
          {activeTab === 'profile' && <ProfileTab user={user} onRefreshUser={onRefreshUser} />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
