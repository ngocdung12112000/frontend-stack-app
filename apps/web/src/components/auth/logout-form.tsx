import { Button } from "@stackshop/ui";

type Props = {
  allDevices?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
  label?: string;
  className?: string;
};

/**
 * Plain HTML form post to the logout route handler (works without JS, and the browser sends
 * the Origin header the handler checks). `rt` is only sent to /api/auth, so this must be a
 * request to that path.
 */
export function LogoutForm({
  allDevices = false,
  variant = "outline",
  label = allDevices ? "Log out of all devices" : "Log out",
  className,
}: Props) {
  return (
    <form action="/api/auth/logout" method="post" className={className}>
      {allDevices && <input type="hidden" name="allDevices" value="1" />}
      <Button type="submit" variant={variant}>
        {label}
      </Button>
    </form>
  );
}
