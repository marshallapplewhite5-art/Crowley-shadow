export interface BotConfig {
  id: string;
  discordBotToken: string;
  sharedAiCode: string;
  enableFilter: boolean;
}

export interface ConversationMessage {
  username: string;
  text: string;
  timestamp?: string;
}

export interface KindroidResponse {
  success: boolean;
  reply: string;
  stop_reason?: string | null;
  error?: string;
}

export interface DMConversationCount {
  count: number;
  lastMessageTime: number;
}

export interface ShadowTrait {
  trigger: string;
  reclaimedTrait: string;
  description: string;
}

export interface Ritual {
  trait: string;
  action: string;
}

export interface UserShadowData {
  userId: string;
  isPro: boolean;
  patterns: Map<string, number>; // trait -> count
  activeRitual?: Ritual;
  completedRituals: Ritual[];
  currentProtocolStep?: "SCAN" | "PERSONIFY" | "DIALOGUE" | "RECLAIM" | "INTEGRATE";
  lastScanTime?: number;
}

export type KindroidAIResult =
  | {
      type: "success";
      reply: string;
    }
  | {
      type: "rate_limited";
    };
