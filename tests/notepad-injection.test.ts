import { test, expect, describe } from 'bun:test';
import { Target, AdvancedNThread } from '@cheatron/core';
import { TestProcess } from './helper';

describe('Notepad Target Injection', () => {
  test('should discover notepad by window name and inject into its main thread', async () => {
    const tp = new TestProcess();

    // Spawn Notepad
    await tp.start(['notepad.exe']);

    try {
      // 1000ms extra wait to ensure the OS creates the Window handle completely
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Locate Notepad strictly by Window title Regex matching
      const target = Target.fromWindowName(/Notepad/i);
      console.log(target);

      // Verify basic target properties
      expect(target.name.toLowerCase()).toContain('notepad.exe');
      expect(target.pid).toBe(tp.process!.pid);

      // Verify the auto-populated dynamic info
      const mainThreadId = target.getInfo<number>('mainThreadId');
      expect(mainThreadId).toBeDefined();
      expect(mainThreadId).toBeGreaterThan(0);

      const windows = target.getInfo<any[]>('windows');
      expect(windows).toBeDefined();
      expect(windows!.length).toBe(1);

      // Inject into the deeply discovered main GUI thread
      const nt = new AdvancedNThread();
      const [proxy, captured] = await nt.inject(mainThreadId!);

      try {
        expect(proxy).toBeDefined();

        // Ensure execution control by fetching its working directory via the injected proxy
        const pwd = await nt.pwd(proxy);
        expect(typeof pwd).toBe('string');
        expect(pwd.length).toBeGreaterThan(0);
      } finally {
        // Safe disconnection
        await proxy.close();
        captured.close();
      }
    } finally {
      // Force kill the spawned test executable
      tp.stop();
    }
  });
});
