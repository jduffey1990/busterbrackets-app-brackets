// breakdownService.test.ts
//
// The OpenAI call must abort on its own well inside the Lambda timeout, so a
// slow upstream degrades the breakdown to stats-only instead of a 503.
import { BreakdownService, OPENAI_TIMEOUT_MS } from './breakdownService';

describe('BreakdownService OpenAI call', () => {
  const originalKey = process.env.OPENAI_API_KEY;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test';
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    process.env.OPENAI_API_KEY = originalKey;
  });

  it('leaves headroom under the 29s Lambda timeout', () => {
    expect(OPENAI_TIMEOUT_MS).toBeLessThanOrEqual(20_000);
  });

  it('sends the request with an abort signal', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'recap' } }] }), { status: 200 }),
    );

    const content = await (BreakdownService as any).generate('prompt');

    expect(content).toBe('recap');
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('surfaces an aborted request as an error the caller degrades on', async () => {
    fetchSpy.mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));

    await expect((BreakdownService as any).generate('prompt')).rejects.toThrow(/timeout/);
  });
});
