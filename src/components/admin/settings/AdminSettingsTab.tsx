import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ProfileSection } from './ProfileSection';
import { PersonalNotificationSettings } from './PersonalNotificationSettings';
import type { User } from '../../../lib/types';

type AdminSettingsTabProps = {
  user: NonNullable<User>;
  onRefreshUser: () => Promise<void>;
};

export function AdminSettingsTab({ user, onRefreshUser }: AdminSettingsTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') === 'notifications' ? 'notifications' : 'profile';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your account and preferences</p>
      </div>

      <Tabs
        value={section}
        onValueChange={(value) => setSearchParams({ tab: 'settings', section: value }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <ProfileSection user={user} onRefreshUser={onRefreshUser} />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <PersonalNotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
