import type { StenoDictation } from "@/lib/steno-dictations";
import type { TypingPassage } from "@/lib/typing-passages";

export const passageLanguages = ["English", "Hindi"] as const;
export const typingWordsPerMinute = 80;
export const stenoTopics = ["Legal", "Parliament", "Office", "General"] as const;

export type SavedTypingPassage = TypingPassage & { id: string; createdAt: string };
export type SavedStenoDictation = StenoDictation & { createdAt: string };
