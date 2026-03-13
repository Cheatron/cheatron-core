import { describe, it, expect, afterAll, beforeAll } from 'bun:test';
import { Target } from '../src/target';
import { TestProcess } from './helpers';

describe('Target Multi-Thread Injection', () => {
  let testProc: TestProcess;

  beforeAll(async () => {
    testProc = new TestProcess();
    await testProc.start(['notepad.exe']);
  });

  afterAll(() => {
    testProc.stop();
  });

  it('should race multiple threads and pick the first successful one', async () => {
    const target = Target.fromPid(testProc.process!.pid);

    // Attempt to inject into all threads, but we only want 1
    const generator = target.injectAll({ count: 1 });

    const results = [];
    for await (const [proxy, captured] of generator) {
      results.push({ proxy, captured });
      // The generator should finish after yielding 1 item due to count: 1
    }

    expect(results.length).toBe(1);
    expect(target.channels.length).toBe(1);

    // Verify cleanup
    await target.detachAll();
    expect(target.channels.length).toBe(0);
  });

  it('should yield multiple threads sequentially when count > 1', async () => {
    const target = Target.fromPid(testProc.process!.pid);

    // Notepad usually has several threads
    const generator = target.injectAll({ count: 2 });

    const results = [];
    for await (const res of generator) {
      results.push(res);
      if (results.length === 2) break;
    }

    expect(results.length).toBe(2);
    expect(target.channels.length).toBe(2);

    await target.detachAll();
  });
});
