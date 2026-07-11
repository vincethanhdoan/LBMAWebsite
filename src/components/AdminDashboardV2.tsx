import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { AdminAnnouncementsTab } from './admin/AdminAnnouncementsTab';
import { AdminBlogTab } from './admin/AdminBlogTab';
import { AdminMessagesTab } from './admin/AdminMessagesTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { FeedbackTab as AdminFeedbackTab } from './admin/FeedbackTab';
import { AdminEnrollmentLeadsTab } from './admin/AdminEnrollmentLeadsTab';
import { AdminAvailabilitySettings } from './admin/AdminAvailabilitySettings';
import { AdminProfileTab } from './admin/AdminProfileTab';
import { AdminTeamTab } from './admin/AdminTeamTab';
import { useSidebarCounts } from '../lib/hooks/notifications';
import { useActionNeededCount } from '../lib/hooks/leads';
import { useRealtimeInvalidation } from '../lib/hooks/useRealtimeInvalidation';
import { markSectionSeen } from '../lib/supabase/mutations';
import { queryKeys } from '../lib/queryKeys';
import { getInitials } from '../lib/format';
import type { User } from '../lib/types';
import { NotificationBell } from './NotificationBell';
import {
  Award,
  Bell,
  BookOpen,
  CalendarCog,
  ClipboardList,
  LogOut,
  MessageSquare,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react';

type AdminDashboardV2Props = {
  user: NonNullable<User>;
  onLogout: () => void;
  onRefreshUser: () => Promise<void>;
  isOwner: boolean;
};

type AdminTabId =
  | 'announcements'
  | 'blog'
  | 'messages'
  | 'families'
  | 'feedback'
  | 'leads'
  | 'availability'
  | 'profile'
  | 'team';

const navGroups: {
  label: string;
  items: { id: AdminTabId; label: string; icon: React.ElementType }[];
}[] = [
  {
    label: 'Communications',
    items: [
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'blog', label: 'Parent Blog', icon: BookOpen },
      { id: 'messages', label: 'Messages', icon: MessageSquare },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'families', label: 'Families', icon: Users },
      { id: 'feedback', label: 'Student Feedback', icon: Award },
    ],
  },
  {
    label: 'Enrollment',
    items: [
      { id: 'leads', label: 'Enrollment Leads', icon: ClipboardList },
      { id: 'availability', label: 'Availability', icon: CalendarCog },
    ],
  },
];

function getTabLabel(id: AdminTabId): string {
  if (id === 'team') return 'Team';
  for (const group of navGroups) {
    const item = group.items.find((i) => i.id === id);
    if (item) return item.label;
  }
  return 'Profile';
}

export function AdminDashboardV2({ user, onLogout, onRefreshUser, isOwner }: AdminDashboardV2Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as AdminTabId) ?? 'announcements';
  const queryClient = useQueryClient();
  const setActiveTab = (tab: AdminTabId) => setSearchParams({ tab }, { replace: true });
  const { data: counts } = useSidebarCounts(user.id);
  const unreadMessages = counts?.unreadMessages ?? 0;
  const unreadAnnouncements = counts?.unreadAnnouncements ?? 0;
  const unreadBlog = counts?.unreadBlog ?? 0;
  const actionNeededCount = useActionNeededCount();

  useRealtimeInvalidation(user.id);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        {/* ── Brand header ── */}
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="LBMAA Logo" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
            <div className="flex flex-col flex-1 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold leading-none text-sidebar-foreground">LBMAA</span>
              <span className="mt-0.5 text-xs text-sidebar-foreground/60">Admin Portal</span>
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <NotificationBell
                userId={user.id}
                onNavigate={(tab) => setActiveTab(tab as AdminTabId)}
              />
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        {/* ── Grouped navigation ── */}
        <SidebarContent className="py-2 [scrollbar-width:thin] [scrollbar-color:rgba(250,249,246,0.25)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-sidebar-foreground/25 [&::-webkit-scrollbar-thumb]:rounded-full">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(({ id, label, icon: Icon }) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuButton
                        isActive={activeTab === id}
                        onClick={() => {
                          setActiveTab(id);
                          if (id === 'announcements' || id === 'blog') {
                            markSectionSeen(id).then(() => {
                              queryClient.invalidateQueries({ queryKey: queryKeys.sidebarCounts(user.id) });
                              queryClient.invalidateQueries({ queryKey: queryKeys.homeCounts(user.id) });
                              queryClient.invalidateQueries({ queryKey: queryKeys.notificationSummary(user.id) });
                            }).catch(console.error);
                          }
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
                      {id === 'leads' && actionNeededCount > 0 && (
                        <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                          {actionNeededCount > 9 ? '9+' : actionNeededCount}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                  {group.label === 'Management' && isOwner && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === 'team'}
                        onClick={() => setActiveTab('team')}
                        tooltip="Team"
                        size="lg"
                        className={
                          activeTab === 'team'
                            ? 'border-l-[3px] border-sidebar-primary rounded-tl-none rounded-bl-none pl-[calc(0.5rem-3px)]'
                            : ''
                        }
                      >
                        <ShieldCheck />
                        <span>Team</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {/* ── User footer ── */}
        <SidebarFooter className="pb-4">
          <SidebarSeparator className="mb-2" />

          {/* Expanded state */}
          <div className="px-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <Avatar className="h-8 w-8 shrink-0">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
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
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
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
            {getTabLabel(activeTab)}
          </h1>
          <div className="flex-1" />
          <span className="hidden text-sm text-muted-foreground md:block">
            {user.displayName}
          </span>
        </header>

        {/* Scrollable page content */}
        <main className={`flex-1 ${activeTab === 'messages' ? 'overflow-hidden p-6' : 'overflow-auto p-6'}`}>
          {activeTab === 'announcements' && <AdminAnnouncementsTab user={user} />}
          {activeTab === 'blog' && <AdminBlogTab user={user} />}
          {activeTab === 'messages' && (
            <AdminMessagesTab user={user} />
          )}
          {activeTab === 'families' && <AdminUsersTab user={user} />}
          {activeTab === 'feedback' && <AdminFeedbackTab />}
          {activeTab === 'leads' && <AdminEnrollmentLeadsTab />}
          {activeTab === 'availability' && <AdminAvailabilitySettings />}
          {activeTab === 'profile' && (
            <AdminProfileTab user={user} onClose={() => setActiveTab('announcements')} onRefreshUser={onRefreshUser} />
          )}
          {activeTab === 'team' && isOwner && <AdminTeamTab user={user} />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
