import { SettingsPage } from "@/components/settings/settings-page";
import { requireWorkspace } from "@/lib/auth/workspace";

export default async function SettingsRoute() {
  const workspace = await requireWorkspace();

  return <SettingsPage workspace={workspace} />;
}
