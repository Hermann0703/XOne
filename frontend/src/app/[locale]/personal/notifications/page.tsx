import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const NotificationList = dynamic(
  () => import("@/plugins/builtin/personal/notifications/NotificationList"),
  {
    loading: () => (
      <div className="flex flex-col gap-3 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    ),
  }
);

export default function NotificationsPage() {
  return <NotificationList />;
}
