import { ErrorTypeConfig } from "./error-types";

export const ERROR_REGISTRY = {
  auth: {
    icon: "ShieldAlert",
    iconColor: "red",
    title: "Authentication Error",
    countdown: 5,
    redirectTo: "/sign-in",
    primaryAction: {
      label: "Login",
      href: "/sign-in",
      variant: "primary",
    },
    secondaryAction: {
      label: "Resend Email",
      href: "/forgot-password",
      variant: "outline",
    },
    severity: "error",
  },
  unauthorized: {
    icon: "ShieldAlert",
    iconColor: "red",
    title: "Authentication Error",
    countdown: 5,
    redirectTo: "/sign-in",
    primaryAction: {
      label: "Login",
      href: "/sign-in",
      variant: "primary",
    },
    secondaryAction: undefined,
    severity: "error",
  },
  "thread-errors": {
    icon: "AlertCircle",
    iconColor: "red",
    title: "Error Loading Thread !",
    countdown: 5,
    redirectTo: "/chat",
    primaryAction: {
      label: "Go to Projects",
      href: "/chat",
      variant: "primary",
    },
    secondaryAction: undefined,
    severity: "error",
  },
  "set-password": {
    icon: "AlertCircle",
    iconColor: "red",
    title: "Password Setup Link Invalid",
    countdown: 0,
    redirectTo: null,
    primaryAction: {
      label: "Request New Link",
      href: "/resend-setup-email",
      variant: "primary",
    },
    secondaryAction: {
      label: "Back to Login",
      href: "/sign-in",
      variant: "outline",
    },
    severity: "error",
  },
  "github-auth": {
    icon: "ShieldAlert",
    iconColor: "red",
    title: "Authentication Error",
    countdown: 5,
    redirectTo: "/sign-in",
    primaryAction: {
      label: "Login",
      href: "/sign-in",
      variant: "primary",
    },
    secondaryAction: {
      label: "Continue with GitHub",
      href: "/github-auth",
      variant: "outline",
    },
    severity: "error",
  },
  default: {
    icon: "AlertCircle",
    iconColor: "orange",
    title: "Something Went Wrong",
    countdown: 10,
    redirectTo: "/sign-up",
    primaryAction: {
      label: "Sign Up",
      href: "/sign-up",
      variant: "primary",
    },
    severity: "warning",
  },
} as const satisfies Record<string, ErrorTypeConfig>;

export type RegisteredErrorType = keyof typeof ERROR_REGISTRY;
