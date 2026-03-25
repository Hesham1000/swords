export interface ActionConfig {
  label: string;
  href?: string;
  action?: "back" | "reload";
  variant?: "primary" | "secondary" | "outline";
}

export interface ErrorTypeConfig {
  icon: string;
  iconColor: "red" | "orange" | "yellow" | "blue";
  title: string;
  countdown: number;
  redirectTo: string | null;
  primaryAction: ActionConfig;
  secondaryAction?: ActionConfig;
  severity?: "info" | "warning" | "error" | "critical";
}

export type ErrorType = "auth" | "set-password" | "default";
