import { ShadowTrait, Ritual } from "./types";

export const SHADOW_TRAITS: Record<string, ShadowTrait> = {
  controlling: {
    trigger: "Controlling",
    reclaimedTrait: "Disowned Power / Leadership",
    description: "You fear being seen as controlling, so you suppress your own leadership.",
  },
  fake: {
    trigger: "Fake",
    reclaimedTrait: "Disowned Authenticity / Persona Fear",
    description: "You judge 'fakeness' because you're hiding your own authentic expression.",
  },
  arrogant: {
    trigger: "Arrogant",
    reclaimedTrait: "Disowned Self-Worth / Standards",
    description: "You fear being seen as arrogant, so you minimize your achievements.",
  },
  lazy: {
    trigger: "Lazy",
    reclaimedTrait: "Disowned Rest / Fear of Burnout",
    description: "You judge laziness because you don't allow yourself to rest.",
  },
  needy: {
    trigger: "Needy",
    reclaimedTrait: "Disowned Human Connection Needs",
    description: "You fear being needy, so you isolate and avoid asking for help.",
  },
  angry: {
    trigger: "Angry",
    reclaimedTrait: "Disowned Boundary Setting",
    description: "You judge anger because you have trouble setting firm boundaries.",
  },
  weak: {
    trigger: "Weak",
    reclaimedTrait: "Disowned Vulnerability / Surrender",
    description: "You fear weakness, so you never allow yourself to be vulnerable.",
  },
};

export const RECLAMATION_RITUALS: Record<string, string[]> = {
  "Disowned Boundary Setting": [
    "Set one boundary this week without explaining why. Just say 'I can't do that' or 'I'm not available'.",
    "When someone interrupts you, say 'Let me finish that thought' once. Log how it felt.",
  ],
  "Disowned Rest / Fear of Burnout": [
    "Schedule 20 min of 'useless' time. No phone. No goal. Just exist. Your Saboteur will scream. Listen.",
    "Leave one minor task unfinished tonight and go to sleep. Notice the urge to fix it.",
  ],
  "Disowned Power / Leadership": [
    "Make one decision today without asking for any input. Even just a coffee order or where to eat. Notice the urge to outsource the choice.",
    "Delegate one small task and don't check in on it for 24 hours.",
  ],
  "Disowned Authenticity / Persona Fear": [
    "Share one 'unfiltered' opinion today in a safe setting. Don't polish it first.",
    "Ask for what you want directly once this week, without hinting.",
  ],
  "Disowned Self-Worth / Standards": [
    "Accept a compliment this week with a simple 'Thank you'—no self-deprecation allowed.",
    "Write down three things you are genuinely good at and read them aloud.",
  ],
  "Disowned Human Connection Needs": [
    "Ask a friend for a small favor this week. Notice the resistance to 'imposing'.",
    "Reach out to someone and say 'I was thinking of you' without an agenda.",
  ],
  "Disowned Vulnerability / Surrender": [
    "Admit a small mistake or 'I don't know' to someone today.",
    "Leave one minor imperfection in your work unfixed and send it anyway.",
  ],
};

/**
 * Identifies the shadow trait based on a trigger keyword
 */
export function identifyShadowTrait(trigger: string): ShadowTrait | undefined {
  const normalized = trigger.toLowerCase().trim();
  return SHADOW_TRAITS[normalized];
}

/**
 * Gets a random ritual for a reclaimed trait
 */
export function getRandomRitual(reclaimedTrait: string): Ritual {
  const rituals = RECLAMATION_RITUALS[reclaimedTrait] || [
    "Observe your reaction the next time you feel triggered. Don't act, just watch.",
  ];
  const action = rituals[Math.floor(Math.random() * rituals.length)];
  return { trait: reclaimedTrait, action };
}

/**
 * Crisis keywords for interception
 */
export const CRISIS_KEYWORDS = [
  "suicide",
  "kill myself",
  "end it all",
  "self-harm",
  "harm myself",
  "don't want to live",
  "better off dead",
  "abuse",
  "hurting me",
];

export function isCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export const CRISIS_RESOURCES = `I've stopped the Mirror Protocol because safety comes first. Shadow work requires a stable foundation. Please reach out to professional support:
- US/Canada: Call or text 988
- International: https://findahelpline.com
Do not continue shadow work until you are safe.`;

export const SIGNATURE_LINE = "The part you reject runs the show. Reclaim it, or it will claim you.";
