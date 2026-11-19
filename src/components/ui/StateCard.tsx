import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { Button } from "./Button";

export function StateCard({ icon = "info", title, body, action }: { icon?: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card state" role="status">
      <Icon name={icon} size={30} />
      <div className="headline">{title}</div>
      {body && <p className="callout">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorCard({ message, onRetry, retryLabel = "Try again" }: { message?: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <StateCard icon="alert" title={message ?? "Something went wrong"} action={onRetry ? <Button size="sm" onClick={onRetry}>{retryLabel}</Button> : undefined} />
  );
}
