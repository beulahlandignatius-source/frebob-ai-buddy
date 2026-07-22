// Auto-starts the guided tour once for new demo users. Mounted in __root
// via the shell so it fires wherever the user lands after entering demo.
import { useDemo } from "@/lib/demo/context";
import { useAutoStartTourInDemo } from "./GuidedTour";

export function TourAutoStart() {
  const { active } = useDemo();
  useAutoStartTourInDemo(active);
  return null;
}
