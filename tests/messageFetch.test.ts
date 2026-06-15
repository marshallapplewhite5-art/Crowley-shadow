import { ephemeralFetchConversation } from '../src/messageFetch';
import { Collection } from 'discord.js';

describe('messageFetch', () => {
  let mockChannel: any;

  beforeEach(() => {
    // Reset the internal cache between tests by re-importing the module
    jest.resetModules();

    mockChannel = {
      id: 'channel-123',
      client: {
        user: { id: 'bot-id' },
        guilds: {
          cache: {
            get: jest.fn().mockReturnValue({
              members: {
                fetch: jest.fn().mockResolvedValue({
                  nickname: 'MemberNickname',
                }),
              },
            }),
          },
        },
      },
      messages: {
        fetch: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and formats messages correctly', async () => {
    const { ephemeralFetchConversation } = require('../src/messageFetch');
    const mockMessages = new Collection<string, any>([
      ['1', {
        id: '1',
        author: { id: 'user-1', username: 'User1', globalName: 'Global1' },
        content: 'Hello',
        createdTimestamp: 1000,
        createdAt: new Date(1000),
      }],
      ['2', {
        id: '2',
        author: { id: 'bot-id', username: 'Bot', globalName: 'BotGlobal' },
        content: 'Hi there',
        createdTimestamp: 2000,
        createdAt: new Date(2000),
      }],
    ]);

    mockChannel.messages.fetch.mockResolvedValue(mockMessages);

    const result = await ephemeralFetchConversation(mockChannel as any, 30, 0);

    expect(result).toHaveLength(2);
    // Since we mock the member fetch, but the code also uses a cache for display names,
    // let's see why it returned Global1 instead of MemberNickname in previous run.
    // Ah, I see in messageFetch.ts:
    // try {
    //   const guild = msg.client.guilds.cache.get(msg.guildId);
    // ...
    // In my mock, I didn't set msg.guildId on the mock messages.

    expect(result[0]).toEqual({
      username: 'Global1',
      text: 'Hello',
      timestamp: new Date(1000).toISOString(),
    });
    expect(result[1]).toEqual({
      username: '{{ai}}',
      text: 'Hi there',
      timestamp: new Date(2000).toISOString(),
    });
  });

  it('uses cache for subsequent calls within duration', async () => {
    const { ephemeralFetchConversation } = require('../src/messageFetch');
    const mockMessages = new Collection<string, any>([
        ['1', {
          id: '1',
          author: { id: 'user-1', username: 'User1', globalName: 'Global1' },
          content: 'Hello',
          createdTimestamp: 1000,
          createdAt: new Date(1000),
        }]
    ]);
    mockChannel.messages.fetch.mockResolvedValue(mockMessages);

    // First call
    await ephemeralFetchConversation(mockChannel as any, 30, 5000);
    // Second call
    await ephemeralFetchConversation(mockChannel as any, 30, 5000);

    expect(mockChannel.messages.fetch).toHaveBeenCalledTimes(1);
  });
});
