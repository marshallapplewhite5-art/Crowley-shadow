import axios from 'axios';
import { callKindroidAI } from '../src/kindroidAPI';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('kindroidAPI', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      KINDROID_INFER_URL: 'https://api.test/v1/discord-bot',
      KINDROID_API_KEY: 'test-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('successfully calls Kindroid AI', async () => {
    const mockResponse = {
      data: {
        success: true,
        reply: 'Hello from AI!',
      },
    };
    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const conversation = [
      { username: 'User', text: 'Hello', timestamp: '2023-01-01T00:00:00Z' },
    ];

    const result = await callKindroidAI('shared-code', conversation);

    expect(result).toEqual({ type: 'success', reply: 'Hello from AI!' });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.test/v1/discord-bot',
      {
        share_code: 'shared-code',
        conversation,
        enable_filter: false,
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'X-Kindroid-Requester': expect.any(String),
        }),
      })
    );
  });

  it('handles rate limits', async () => {
    const mockError = {
      isAxiosError: true,
      response: {
        status: 429,
        data: { error: 'Rate limit exceeded' },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(mockError);
    mockedAxios.isAxiosError.mockReturnValueOnce(true);

    const conversation = [{ username: 'User', text: 'Hello' }];
    const result = await callKindroidAI('shared-code', conversation);

    expect(result).toEqual({ type: 'rate_limited' });
  });

  it('throws error on empty conversation', async () => {
    await expect(callKindroidAI('shared-code', [])).rejects.toThrow(
      'Conversation array cannot be empty'
    );
  });
});
