import { spawn, type Subprocess } from 'bun';
import * as Native from '@cheatron/native';
import { Process } from '@cheatron/native';
import { KeystoneX86 } from '@cheatron/keystone';

export interface SpawnedThread {
  loopAddr: Native.NativePointer;
  thread: Native.Thread;
  tid: number;
}

export async function spawnLoopThread(): Promise<SpawnedThread> {
  const ks = new KeystoneX86();
  const loopBuffer = Buffer.from(ks.asm('jmp .'));
  const proc = Native.currentProcess;
  const loopAddr = proc.memory.alloc(
    loopBuffer.length,
    Native.MemoryProtection.EXECUTE_READWRITE,
    Native.MemoryState.COMMIT,
  );
  proc.memory.write(loopAddr, loopBuffer);
  const thread = Native.Thread.create(loopAddr, null);
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { loopAddr, thread, tid: thread.tid };
}

export function cleanupThread(spawned: SpawnedThread): void {
  if (spawned.thread.isValid()) {
    spawned.thread.terminate(0);
    spawned.thread.close();
  }
  Native.currentProcess.memory.free(spawned.loopAddr);
}

export class TestProcess {
  private child: Subprocess | null = null;
  public process: Process | null = null;

  async start(command: string[] = ['notepad.exe']): Promise<Process> {
    this.child = spawn(command, {
      stdout: 'ignore',
      stderr: 'ignore',
    });

    // Wait briefly for the process to actually start
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!this.child.pid) {
      throw new Error('Failed to spawn test process');
    }

    this.process = Process.open(this.child.pid);
    return this.process;
  }

  stop() {
    if (this.process) {
      this.process.close();
      this.process = null;
    }
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }
}
