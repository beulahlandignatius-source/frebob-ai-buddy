import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — FreBob" },
      { name: "description", content: "Create your FreBob account and start running your business smarter." },
      { property: "og:title", content: "Create account — FreBob" },
      { property: "og:description", content: "Join FreBob — the AI operations assistant for SMEs." },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
