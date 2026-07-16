import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  ShieldCheck,
  ShieldOff,
  UserX,
  UserCheck,
  Loader2,
  MoreHorizontal,
  MailPlus,
  MailX,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { SignedAvatarImage } from '../SignedAvatarImage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { getAdminProfiles, getAdminEmails } from '../../lib/supabase/queries';
import {
  deactivateAdmin,
  reactivateAdmin,
  setOwnerStatus,
} from '../../lib/supabase/mutations';
import { invokeEdgeFunction } from '../../lib/supabase/functions';
import { queryKeys } from '../../lib/queryKeys';
import { getInitials, formatRelativeTime } from '../../lib/format';
import type { User } from '../../lib/types';

type AdminRow = {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  is_owner: boolean;
  is_active: boolean;
  is_pending: boolean;
  invited_at: string | null;
  last_sign_in_at: string | null;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function rowSortKey(a: AdminRow): number {
  if (a.is_active && !a.is_pending) return a.is_owner ? 0 : 1;
  if (a.is_pending) return 2;
  return 3;
}

type TeamView = 'active' | 'former';

const TEAM_VIEWS: { id: TeamView; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'former', label: 'Former' },
];

export function AdminTeamTab({
  user,
  onRefreshUser,
}: {
  user: NonNullable<User>;
  onRefreshUser: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [teamView, setTeamView] = useState<TeamView>('active');
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const profilesQuery = useQuery({
    queryKey: queryKeys.admins(),
    queryFn: getAdminProfiles,
  });

  const emailsQuery = useQuery({
    queryKey: queryKeys.adminEmails(),
    queryFn: getAdminEmails,
  });

  const isLoading = profilesQuery.isLoading || emailsQuery.isLoading;
  const isError = profilesQuery.isError || emailsQuery.isError;

  const admins: AdminRow[] = (profilesQuery.data ?? [])
    .map((p) => {
      const emailRow = (emailsQuery.data ?? []).find(
        (e) => e.user_id === p.user_id,
      );
      return {
        user_id: p.user_id,
        display_name: p.display_name,
        email: emailRow?.email ?? '-',
        avatar_url: p.avatar_url,
        is_owner: p.is_owner,
        is_active: p.is_active,
        is_pending:
          p.is_active && !!emailRow && emailRow.last_sign_in_at === null,
        invited_at: emailRow?.invited_at ?? null,
        last_sign_in_at: emailRow?.last_sign_in_at ?? null,
      };
    })
    .sort((a, b) => {
      const diff = rowSortKey(a) - rowSortKey(b);
      if (diff !== 0) return diff;
      return a.display_name.localeCompare(b.display_name);
    });

  const otherActiveOwnerExists = admins.some(
    (a) => a.is_owner && a.is_active && a.user_id !== user.id,
  );

  const activeAdmins = admins.filter((a) => a.is_active);
  const formerAdmins = admins.filter((a) => !a.is_active);
  const visibleAdmins = teamView === 'active' ? activeAdmins : formerAdmins;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admins() });
    queryClient.invalidateQueries({ queryKey: queryKeys.adminEmails() });
  };

  const runConfirmed = async (
    fn: () => Promise<void>,
    successMessage: string,
    errorFallback: string,
  ) => {
    setConfirmLoading(true);
    try {
      await fn();
      toast.success(successMessage);
      invalidate();
      setConfirmState(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : errorFallback);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleInvite = async () => {
    if (isInviting) return;
    const email = inviteEmail.trim();
    if (!isValidEmail(email)) {
      toast.error('Enter a valid email address');
      return;
    }
    setIsInviting(true);
    try {
      await invokeEdgeFunction('invite-admin', {
        action: 'invite',
        email,
        name: inviteName.trim() || undefined,
      });
      toast.success(`Invite sent to ${email}`);
      setInviteEmail('');
      setInviteName('');
      setIsInviteOpen(false);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleResend = async (admin: AdminRow) => {
    if (busyId) return;
    setBusyId(admin.user_id);
    try {
      await invokeEdgeFunction('invite-admin', {
        action: 'resend',
        email: admin.email,
      });
      toast.success(`Invite email resent to ${admin.email}`);
      invalidate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to resend invite',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = (admin: AdminRow) => {
    setConfirmState({
      title: `Revoke invite for ${admin.display_name}?`,
      description: `${admin.email} will no longer be able to join as an admin. You can invite them again later.`,
      confirmLabel: 'Revoke Invite',
      destructive: true,
      onConfirm: () =>
        runConfirmed(
          () =>
            invokeEdgeFunction('invite-admin', {
              action: 'revoke',
              email: admin.email,
            }),
          'Invite revoked',
          'Failed to revoke invite',
        ),
    });
  };

  const handleDeactivate = (admin: AdminRow) => {
    setConfirmState({
      title: `Deactivate ${admin.display_name}?`,
      description:
        'They will lose access to the admin portal immediately. Their history is preserved and you can reactivate them later.',
      confirmLabel: 'Deactivate',
      destructive: true,
      onConfirm: () =>
        runConfirmed(
          () => deactivateAdmin(admin.user_id),
          `${admin.display_name} deactivated`,
          'Failed to deactivate',
        ),
    });
  };

  const handleReactivate = async (admin: AdminRow) => {
    if (busyId) return;
    setBusyId(admin.user_id);
    try {
      await reactivateAdmin(admin.user_id);
      toast.success(`${admin.display_name} reactivated`);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reactivate');
    } finally {
      setBusyId(null);
    }
  };

  const handleSetOwner = (admin: AdminRow, makeOwner: boolean) => {
    setConfirmState({
      title: `${makeOwner ? 'Grant owner status to' : 'Remove owner status from'} ${admin.display_name}?`,
      description: makeOwner
        ? 'They will be able to manage admins and owners.'
        : 'They will remain an admin but lose owner controls.',
      confirmLabel: makeOwner ? 'Make Owner' : 'Remove Owner',
      onConfirm: () =>
        runConfirmed(
          () => setOwnerStatus(admin.user_id, makeOwner),
          makeOwner
            ? `${admin.display_name} is now an owner`
            : `Owner status removed from ${admin.display_name}`,
          'Failed to update owner status',
        ),
    });
  };

  const handleStepDown = () => {
    setConfirmState({
      title: 'Step down as owner?',
      description:
        'You will remain an admin but lose owner controls, including this Team page.',
      confirmLabel: 'Step Down',
      destructive: true,
      onConfirm: () =>
        runConfirmed(
          async () => {
            await setOwnerStatus(user.id, false);
            await onRefreshUser();
          },
          'You are no longer an owner',
          'Failed to update owner status',
        ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold">Team</h2>
          <p className="text-muted-foreground mt-1">
            Manage admin accounts and ownership
          </p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Admins</CardTitle>
            <div className="flex gap-1.5">
              {TEAM_VIEWS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setTeamView(v.id)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    teamView === v.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v.label} (
                  {v.id === 'active'
                    ? activeAdmins.length
                    : formerAdmins.length}
                  )
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="divide-y">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-4">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && isError && (
            <div className="px-6 py-10 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Couldn't load the team list.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  profilesQuery.refetch();
                  emailsQuery.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          )}

          {!isLoading && !isError && (
            <div className="divide-y">
              {visibleAdmins.map((admin) => {
                const isYou = admin.user_id === user.id;
                const isBusy = busyId === admin.user_id;
                const showMenu =
                  !isYou || (admin.is_owner && otherActiveOwnerExists);

                return (
                  <div
                    key={admin.user_id}
                    className={`flex items-center gap-3 px-4 sm:px-6 py-4 ${isYou ? 'bg-accent/50' : ''} ${!admin.is_active ? 'opacity-60' : ''}`}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <SignedAvatarImage
                        path={admin.avatar_url}
                        alt={admin.display_name}
                      />
                      <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                        {getInitials(admin.display_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {admin.display_name}
                        </span>
                        {admin.is_owner && (
                          <Badge className="bg-[#EEF2FF] text-[#3730A3] border border-[rgba(55,48,163,0.2)] rounded-full text-xs">
                            Owner
                          </Badge>
                        )}
                        {isYou && (
                          <span className="text-xs text-muted-foreground italic">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {admin.email}
                        {admin.is_pending && admin.invited_at && (
                          <> · Invited {formatRelativeTime(admin.invited_at)}</>
                        )}
                        {!admin.is_pending && admin.last_sign_in_at && (
                          <>
                            {' '}
                            · Last signed in{' '}
                            {formatRelativeTime(admin.last_sign_in_at)}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {admin.is_pending ? (
                        <Badge className="rounded-full text-xs bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                          Invited
                        </Badge>
                      ) : (
                        <Badge
                          className={`rounded-full text-xs ${
                            admin.is_active
                              ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
                              : 'bg-[#F1F0EF] text-[#6B6866] border border-[#E8E6E3]'
                          }`}
                        >
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}

                      {showMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isBusy}
                              aria-label={`Actions for ${admin.display_name}`}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isYou &&
                              admin.is_owner &&
                              otherActiveOwnerExists && (
                                <DropdownMenuItem onClick={handleStepDown}>
                                  <ShieldOff className="mr-2 h-4 w-4" />
                                  Step down as owner
                                </DropdownMenuItem>
                              )}
                            {!isYou && admin.is_pending && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleResend(admin)}
                                >
                                  <MailPlus className="mr-2 h-4 w-4" />
                                  Resend invite
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleRevoke(admin)}
                                >
                                  <MailX className="mr-2 h-4 w-4" />
                                  Revoke invite
                                </DropdownMenuItem>
                              </>
                            )}
                            {!isYou && !admin.is_pending && admin.is_active && (
                              <>
                                {admin.is_owner ? (
                                  <DropdownMenuItem
                                    onClick={() => handleSetOwner(admin, false)}
                                  >
                                    <ShieldOff className="mr-2 h-4 w-4" />
                                    Remove owner
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleSetOwner(admin, true)}
                                  >
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Make owner
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeactivate(admin)}
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              </>
                            )}
                            {!isYou && !admin.is_active && (
                              <DropdownMenuItem
                                onClick={() => handleReactivate(admin)}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}

              {visibleAdmins.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  {teamView === 'active'
                    ? 'No admins found.'
                    : 'No former admins.'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isInviteOpen}
        onOpenChange={(open) => {
          if (!open && isInviting) return;
          setIsInviteOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Invite a new admin</DialogTitle>
            <DialogDescription>
              They'll receive a magic link and skip family onboarding.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInvite();
            }}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Name</Label>
                <Input
                  id="invite-name"
                  placeholder="Full name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="name@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {confirmState && (
        <ConfirmDialog
          open={true}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          destructive={confirmState.destructive}
          loading={confirmLoading}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
