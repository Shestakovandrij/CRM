import { cn } from "@/lib/utils";

const variants = {
  NEW: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  CONTACTED: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  NEGOTIATION: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  WON: "bg-green-500/15 text-green-400 border-green-500/20",
  LOST: "bg-red-500/15 text-red-400 border-red-500/20",
  TODO: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  IN_PROGRESS: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  DONE: "bg-green-500/15 text-green-400 border-green-500/20",
  LOW: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  HIGH: "bg-red-500/15 text-red-400 border-red-500/20",
  PLANNING: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  DESIGN: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  DEVELOPMENT: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  TESTING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  COMPLETED: "bg-green-500/15 text-green-400 border-green-500/20",
} as const;

const labels: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  PLANNING: "Planning",
  DESIGN: "Design",
  DEVELOPMENT: "Dev",
  TESTING: "Testing",
  COMPLETED: "Completed",
};

export function Badge({ value }: { value: string }) {
  const cls = variants[value as keyof typeof variants] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", cls)}>
      {labels[value] ?? value}
    </span>
  );
}
