import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Pencil, ScanLine, MessageCircle, Brain } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { PageCanvas, SurfaceHeader } from "@/components/dash";
import { RecordSourceCard } from "@/components/record";


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
            description="Enter a sale, payment or reservation yourself, or import a text file for Bob to extract."
            status="Available"
            icon={Pencil}
            to="/records/manual"
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
          <RecordSourceCard
            title="Business Memory"
            description="See every approved record — the source of truth Bob answers from."
            status="Open"
            icon={Brain}
            to="/business-memory"
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
