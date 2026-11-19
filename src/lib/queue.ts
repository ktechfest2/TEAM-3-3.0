export interface QueueCounts {
  ticket: number;       // my ticket number
  waiting: number;      // pu_queue_state.waiting_count (includes me)
  accredited: number;   // pu_queue_state.accredited_count
  voted: number;        // pu_queue_state.voted_count
}

/**
 * Estimate how many people are ahead of me when the exact server count is unavailable.
 * Tickets are handed out in order, so people who already moved past "waiting" are mostly
 * ahead of me. This is an upper-bound estimate, clamped by who is actually waiting.
 */
export function estimateAhead(c: QueueCounts): number {
  const issuedBeforeMe = Math.max(0, c.ticket - 1);
  const departed = Math.max(0, c.accredited) + Math.max(0, c.voted);
  const ahead = Math.max(0, issuedBeforeMe - departed);
  const othersWaiting = Math.max(0, c.waiting - 1);
  return Math.min(ahead, othersWaiting);
}

/** Human-friendly wait guess. Deliberately vague: this line is unofficial. */
export function waitBucket(ahead: number): "next" | "few" | "some" | "many" {
  if (ahead <= 0) return "next";
  if (ahead <= 5) return "few";
  if (ahead <= 25) return "some";
  return "many";
}
