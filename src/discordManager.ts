import {
  Client,
  GatewayIntentBits,
  Message,
  TextChannel,
  DMChannel,
  ChannelType,
  BaseGuildTextChannel,
  PermissionFlagsBits,
  Partials,
} from "discord.js";
import { ephemeralFetchConversation } from "./messageFetch";
import { callKindroidAI } from "./kindroidAPI";
import { BotConfig, DMConversationCount, UserShadowData } from "./types";
import { ShadowStorage } from "./storage";
import {
  identifyShadowTrait,
  isCrisis,
  CRISIS_RESOURCES,
  SIGNATURE_LINE,
  getRandomRitual,
} from "./shadowLogic";

//Bot back and forth (prevent infinite loop but allow for mentioning other bots in conversation)
type BotConversationChain = {
  chainCount: number; // how many consecutive bot messages
  lastBotId: string; // ID of the last bot
  lastActivity: number; // timestamp of last message in chain
};

const botToBotChains = new Map<string, BotConversationChain>();

// Track active bot instances
const activeBots = new Map<string, Client>();

// Track DM conversation counts with proper typing
const dmConversationCounts = new Map<string, DMConversationCount>();

// Helper function to check if the bot can respond to a channel before responding
function shouldAllowBotMessage(message: Message): boolean {
  // If in DM, skip chain logic entirely
  if (message.channel.type === ChannelType.DM) {
    return false;
  }

  const channelId = message.channel.id;

  // Get (or initialize) the chain data for this channel
  const chainData = botToBotChains.get(channelId) || {
    chainCount: 0,
    lastBotId: "",
    lastActivity: 0,
  };

  const now = Date.now();
  const timeSinceLast = now - chainData.lastActivity;

  // Example threshold settings
  const MAX_BOT_CHAIN = 3; // max back-and-forth between bots
  const INACTIVITY_RESET = 600_000; // reset chain after 10 min

  // If too much time passed, reset the chain
  if (timeSinceLast > INACTIVITY_RESET) {
    chainData.chainCount = 0;
    chainData.lastBotId = "";
  }

  // If this message is from a *different* bot ID than before, increment chain
  if (chainData.lastBotId && chainData.lastBotId !== message.author.id) {
    chainData.chainCount++;
  }

  // Update tracking
  chainData.lastBotId = message.author.id;
  chainData.lastActivity = now;

  // Disallow if we've hit or exceeded the max chain limit
  if (chainData.chainCount >= MAX_BOT_CHAIN) {
    return false;
  }

  // Otherwise store updated data & allow
  botToBotChains.set(channelId, chainData);
  return true;
}

// Helper function to check if the bot can respond to a channel before responding
async function canRespondToChannel(
  channel: Message["channel"]
): Promise<boolean> {
  try {
    // For DM channels, we only need to check if we can send messages
    if (channel.type === ChannelType.DM) {
      return true;
    }

    // For all guild-based channels that support messages
    if (channel.isTextBased() && !channel.isDMBased()) {
      const permissions = channel.permissionsFor(channel.client.user);
      if (!permissions) return false;

      // Basic permissions needed for any text-based channel
      const requiredPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ];

      // Add thread permissions if the channel is a thread
      if (channel.isThread()) {
        requiredPermissions.push(PermissionFlagsBits.SendMessagesInThreads);
      }

      return permissions.has(requiredPermissions);
    }

    return false;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
}

/**
 * Creates and initializes a Discord client for a specific bot configuration
 * @param botConfig - Configuration for this bot instance
 */
async function createDiscordClientForBot(
  botConfig: BotConfig
): Promise<Client> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  // Set up event handlers
  client.once("ready", () => {
    console.log(`Bot [${botConfig.id}] logged in as ${client.user?.tag}`);
  });

  // Handle incoming messages
  client.on("messageCreate", async (message: Message) => {
    // Crisis check first
    if (isCrisis(message.content)) {
      await message.reply(CRISIS_RESOURCES);
      return;
    }

    // If the message is from the same bot, skip (avoid self-mention loops)
    if (message.author.bot && message.author.id === client.user?.id) {
      return;
    }

    if (message.author.bot) {
      if (!shouldAllowBotMessage(message)) {
        // If chain limit exceeded, do not respond.
        return;
      }
    } else {
      const channelId = message.channel.id;
      if (botToBotChains.has(channelId)) {
        botToBotChains.delete(channelId);
      }
    }

    if (!(await canRespondToChannel(message.channel))) return;

    // Unified command and protocol handling (works for DMs and Server messages)
    const isDM = message.channel.type === ChannelType.DM;

    // Handle ShadowSync commands
    if (message.content.toLowerCase() === "!start" || message.content.toLowerCase() === "!scan") {
      await handleStartCommand(message);
      return;
    }

    if (message.content.toLowerCase() === "!pro") {
      await message.reply("**ShadowSync Pro** ($19/mo)\n- Daily dialogue with your Saboteur\n- Personalized Reclamation Rituals\n- Pattern tracking across 30 days\n\n*This is a v1.0 prototype feature.*");
      return;
    }

    // Get user data for state machine
    const userData = ShadowStorage.getUserData(message.author.id);
    const isActiveProtocol = userData.currentProtocolStep !== undefined;

    // Get the bot's user information
    const botUser = client.user;
    if (!botUser) return; // Guard against undefined client.user
    const botUsername = botUser.username.toLowerCase();

    // Check if the message mentions or references the bot
    const isMentioned = message.mentions.users.has(botUser.id);
    const containsBotName = message.content.toLowerCase().includes(botUsername);

    // Skip AI call if we're not mentioned/referenced and not in an active protocol (unless it's a DM)
    if (!isDM && !isMentioned && !containsBotName && !isActiveProtocol) return;

    try {
      // Show typing indicator
      if (message.channel.isTextBased()) {
        await message.channel.sendTyping();
      }

      let replyText: string | undefined;

      // Special handling for SCAN step (hardcoded logic)
      if (userData.currentProtocolStep === "SCAN") {
        const lines = message.content.split("\n").filter(l => l.includes("—") || l.includes("-"));
        if (lines.length > 0) {
          const firstLine = lines[0];
          const trigger = firstLine.split(/[—-]/)[1]?.trim();
          const trait = identifyShadowTrait(trigger);

          if (trait) {
            const count = await ShadowStorage.trackPattern(message.author.id, trigger);
            replyText = `You judge "${trigger}". Shadow trait: **${trait.reclaimedTrait}**.\n\n${trait.description}\n\nThis runs your conflict patterns. ${count > 1 ? `This is the ${count}x this has come up.` : ""}\n\n**ShadowSync Pro** unlocks daily dialogue and rituals. Say "!pro" to learn more, or tell me: what does this part want?`;
            await ShadowStorage.updateUserData(message.author.id, { currentProtocolStep: "PERSONIFY" });
          }
        }
      }

      // If we don't have a hardcoded reply yet, call Kindroid AI
      if (!replyText) {
        const conversationArray = await ephemeralFetchConversation(
          message.channel as TextChannel | DMChannel,
          30,
          5000
        );

        const aiResult = await callKindroidAI(
          botConfig.sharedAiCode,
          conversationArray,
          botConfig.enableFilter
        );

        if (aiResult.type === "rate_limited") {
          return;
        }

        replyText = aiResult.reply;
      }

      // Randomly append signature line for insightful responses
      if (replyText.length > 100 && Math.random() > 0.7) {
        replyText += `\n\n${SIGNATURE_LINE}`;
      }

      // Respond (Reply for mentions/DMs/Protocol, otherwise send normal message)
      if (isDM || isMentioned || isActiveProtocol) {
        await message.reply(replyText);
      } else {
        await message.channel.send(replyText);
      }

      // If it was a DM, also track it for the old DM counter (optional, but for compatibility)
      if (isDM) {
        const dmKey = `${botConfig.id}-${message.author.id}`;
        const currentData = dmConversationCounts.get(dmKey) || { count: 0, lastMessageTime: 0 };
        dmConversationCounts.set(dmKey, { count: currentData.count + 1, lastMessageTime: Date.now() });
      }
    } catch (error) {
      console.error(`[Bot ${botConfig.id}] Error:`, error);
      const errorMessage =
        "Beep boop, something went wrong. Please contact the Kindroid owner if this keeps up!";
      if (isMentioned) {
        await message.reply(errorMessage);
      } else if (
        message.channel instanceof BaseGuildTextChannel ||
        message.channel instanceof DMChannel
      ) {
        await message.channel.send(errorMessage);
      }
    }
  });

  // Handle errors
  client.on("error", (error: Error) => {
    console.error(`[Bot ${botConfig.id}] WebSocket error:`, error);
  });

  // Login
  try {
    await client.login(botConfig.discordBotToken);
    activeBots.set(botConfig.id, client);
  } catch (error) {
    console.error(`Failed to login bot ${botConfig.id}:`, error);
    throw error;
  }

  return client;
}

/**
 * Handles the !start or !scan command
 */
async function handleStartCommand(message: Message): Promise<void> {
  const firstMessage = `**ShadowSync v1.0**
I show you what you're hiding from yourself. Most people aren't afraid of their darkness — they're afraid of their power.

What person or situation is living rent-free in your head right now?

To start a **Projection Scan**, list 3 people you can't stand and one word for why:
Example:
*Boss — Controlling*
*Ex — Fake*
*Influencer — Arrogant*`;

  await ShadowStorage.updateUserData(message.author.id, {
    currentProtocolStep: "SCAN",
    lastScanTime: Date.now()
  });
  await message.reply(firstMessage);
}

/**
 * Initialize all bots from their configurations
 * @param botConfigs - Array of bot configurations
 */
async function initializeAllBots(botConfigs: BotConfig[]): Promise<Client[]> {
  console.log(`Initializing ${botConfigs.length} bots...`);
  await ShadowStorage.load();

  const initPromises = botConfigs.map((config) =>
    createDiscordClientForBot(config).catch((error) => {
      console.error(`Failed to initialize bot ${config.id}:`, error);
      return null;
    })
  );

  const results = await Promise.all(initPromises);
  const successfulBots = results.filter(
    (client): client is Client => client !== null
  );

  console.log(
    `Successfully initialized ${successfulBots.length} out of ${botConfigs.length} bots`
  );

  return successfulBots;
}

/**
 * Gracefully shutdown all active bots
 */
async function shutdownAllBots(): Promise<void> {
  console.log("Shutting down all bots...");

  const shutdownPromises = Array.from(activeBots.entries()).map(
    async ([id, client]) => {
      try {
        await client.destroy();
        console.log(`Bot ${id} shutdown successfully`);
      } catch (error) {
        console.error(`Error shutting down bot ${id}:`, error);
      }
    }
  );

  await Promise.all(shutdownPromises);
  activeBots.clear();
  dmConversationCounts.clear();
}

export { initializeAllBots, shutdownAllBots };
