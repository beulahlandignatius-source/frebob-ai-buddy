import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — FreBob" },
      { name: "description", content: "Sign in to your FreBob account with your email or phone." },
      { property: "og:title", content: "Sign in — FreBob" },
      { property: "og:description", content: "Access your AI-powered SME operations assistant." },
    ],
  }),
  component: () => <AuthForm mode="signin" />,
});
