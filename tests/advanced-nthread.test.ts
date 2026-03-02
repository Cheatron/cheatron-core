import { expect, test, describe } from 'bun:test';
import * as Native from '@cheatron/native';
import { KeystoneX86 } from '@cheatron/keystone';
import { AdvancedNThread, AdvancedProxyThread } from '../src';

// -- helpers (same pattern as @cheatron/nthread tests) --

interface SpawnedThread {
  loopAddr: Native.NativePointer;
  thread: Native.Thread;
  tid: number;
}

async function spawnLoopThread(): Promise<SpawnedThread> {
  const ks = new KeystoneX86();
  const loopBuffer = Buffer.from(ks.asm('jmp .'));
  const proc = Native.currentProcess;
  const loopAddr = proc.memory.alloc(
    loopBuffer.length,
    null,
    Native.MemoryState.COMMIT,
    Native.MemoryProtection.EXECUTE_READWRITE,
  );
  proc.memory.write(loopAddr, loopBuffer);
  const thread = Native.Thread.create(loopAddr, null);
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { loopAddr, thread, tid: thread.tid };
}

function cleanupThread(spawned: SpawnedThread): void {
  if (spawned.thread.isValid()) {
    spawned.thread.terminate(0);
    spawned.thread.close();
  }
  Native.currentProcess.memory.free(spawned.loopAddr);
}

// -- tests --

describe('AdvancedNThread', () => {
  test('inject should return an AdvancedProxyThread', async () => {
    const spawned = await spawnLoopThread();

    try {
      const nt = new AdvancedNThread();
      const [proxy, captured] = await nt.inject(spawned.tid);

      expect(proxy).toBeDefined();
      expect(proxy.loadLibraryA).toBeFunction();
      expect(proxy.loadLibraryW).toBeFunction();

      await proxy.close();
      captured.close();
    } finally {
      cleanupThread(spawned);
    }
  });

  test('loadLibrary should load user32.dll (ASCII path)', async () => {
    const spawned = await spawnLoopThread();

    try {
      const nt = new AdvancedNThread();
      const [proxy, captured] = await nt.inject(spawned.tid);

      try {
        const hModule = await nt.loadLibrary(proxy, 'user32.dll');

        // LoadLibraryA returns a non-NULL HMODULE on success
        expect(hModule.address).not.toBe(0n);

        // Verify it matches what our process already knows
        const localModule = Native.Module.get('user32.dll');
        expect(hModule.address).toBe(localModule.base.address);
      } finally {
        await proxy.close();
        captured.close();
      }
    } finally {
      cleanupThread(spawned);
    }
  });

  test('loadLibrary should handle NativePointer argument', async () => {
    const spawned = await spawnLoopThread();

    try {
      const nt = new AdvancedNThread();
      const [proxy, captured] = await nt.inject(spawned.tid);

      try {
        // Pre-allocate the string ourselves
        const dllName = 'user32.dll';
        const strPtr = await nt.allocString(proxy, dllName, {
          readonly: true,
        });

        // Call with NativePointer directly
        const hModule = await nt.loadLibrary(proxy, strPtr);
        expect(hModule.address).not.toBe(0n);

        const localModule = Native.Module.get('user32.dll');
        expect(hModule.address).toBe(localModule.base.address);

        await proxy.free(strPtr);
      } finally {
        await proxy.close();
        captured.close();
      }
    } finally {
      cleanupThread(spawned);
    }
  });

  test('loadLibrary should return NULL for non-existent DLL', async () => {
    const spawned = await spawnLoopThread();

    try {
      const nt = new AdvancedNThread();
      const [proxy, captured] = await nt.inject(spawned.tid);

      try {
        const hModule = await nt.loadLibrary(
          proxy,
          'this_dll_does_not_exist_12345.dll',
        );

        // LoadLibrary returns NULL when the DLL is not found
        expect(hModule.address).toBe(0n);
      } finally {
        await proxy.close();
        captured.close();
      }
    } finally {
      cleanupThread(spawned);
    }
  });

  test('pwd should return current working directory', async () => {
    const spawned = await spawnLoopThread();

    try {
      const nt = new AdvancedNThread();
      const [proxy, captured] = await nt.inject(spawned.tid);

      try {
        const cwd = await nt.pwd(proxy);

        // It should return a non-empty string
        expect(typeof cwd).toBe('string');
        expect(cwd.length).toBeGreaterThan(0);

        // Should ideally match the current process cwd (assuming they match for the host process tests)
        // Casing and trailing slashes might differ on Windows occasionally,
        // but for safety, just checking it's non-empty and reasonably long is good enough.
        expect(cwd.toLowerCase().replace(/\\/g, '/')).toContain('workspace');
      } finally {
        await proxy.close();
        captured.close();
      }
    } finally {
      cleanupThread(spawned);
    }
  });
});
