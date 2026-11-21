import { describe, expect, it } from 'vitest';
import { workersAi } from '../src/providers/workers-ai';

// Judge rebuild after run 9: the stronger Workers AI chat models answer in the chat-completions shape.
describe('the Workers AI rung reads both answer shapes', () => {
  const ai = (out: unknown) => ({ run: async () => out }) as unknown as Ai;
  it('the classic { response } shape', async () => {
    expect(await workersAi(ai({ response: { pass: true } }), 'm')([], {}, 10)).toEqual({ pass: true });
  });
  it('the chat-completions { choices } shape, JSON as text', async () => {
    expect(await workersAi(ai({ choices: [{ message: { content: '{"pass":true}' } }] }), 'm')([], {}, 10)).toEqual({ pass: true });
  });
});
