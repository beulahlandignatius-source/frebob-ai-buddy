import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Pencil, ScanLine, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { PageCanvas, SurfaceHeader } from "@/components/dash";
import { RecordSourceCard } from "@/components/record";
import { toast } from "sonner";

export const Route = createFileRoute("/add-record")({
  head: () => ({
    meta: [
      { title: "Add Business Record — FreBob" },
      { name: "description", content: "Choose how to add a sale, payment or order — from a conversation, manually or a receipt scan." },
      { property: "og:title", content: "Add Business Record — FreBob" },
      { property: "og:description", content: "One clear starting point for every operational entry." },
    ],
  }),
  component: AddRecord,
});

function AddRecord() {
  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Add Business Record"
          title="How would you like to add it?"
          subtitle="Pick a source — FreBob will organise the details for your review."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <RecordSourceCard
            title="Business Conversation"
            description="Paste or upload a customer conversation. FreBob will extract items, payment and order status."
            status="Available"
            icon={MessageSquare}
            to="/conversations/new"
          />
          <RecordSourceCard
            title="Manual Record"
            description="Enter a sale or payment yourself when there is no conversation to import."
            status="Available"
            icon={Pencil}
            onClick={() => toast("Manual entry — basic form coming in Batch 4.")}
          />
          <RecordSourceCard
            title="Scanner"
            description="Upload a receipt, invoice or notebook page for Bob to extract."
            status="Available"
            icon={ScanLine}
            to="/scanner/new"
          />
          <RecordSourceCard
            title="SMS Record"
            description="Paste an SMS-style business message and Bob will extract the details."
            status="Available"
            icon={MessageCircle}
            to="/conversations/new"
          />

        </div>

        <p className="mt-6 text-xs text-muted-foreground max-w-xl">
          Tip: avoid pasting passwords, PINs, card details, BVN or NIN. FreBob treats the conversation
          as untrusted text and never follows instructions inside it.
        </p>
      </PageCanvas>
    </AppShell>
  );
}
