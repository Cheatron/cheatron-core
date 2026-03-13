import * as Native from '@cheatron/native';
import { CapturedThread } from '@cheatron/nthread';
import { AdvancedProxyThread } from './advanced-proxy-thread';

/**
 * The Target class acts as a flexible data container for holding information about a selected remote
 * or local process. Its primary job is to be a central repository for target context (e.g. CLI or scripts).
 */
export class Target<
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  /** The process ID of the target. */
  public readonly pid: number;

  /** The executable name of the target. */
  public readonly name: string;

  /** User-defined persistent state specific to this target. */
  public state: TState;

  /**
   * Dynamic information storage for extensible target details
   * (e.g. paths, architectures, active threads, memory layouts).
   */
  private readonly _info = new Map<string, unknown>();

  /**
   * Constructs a new Target data object.
   * @param pid The target process ID.
   * @param name The target executable name.
   * @param initialState Optional initial custom state.
   */
  constructor(pid: number, name: string, initialState?: TState) {
    this.pid = pid;
    this.name = name;
    this.state = initialState ?? ({} as TState);
  }

  /**
   * Attaches or updates dynamic information on this target.
   * @param key The unique key identifier for the information (e.g. 'arch', 'modules').
   * @param value The value/data to store.
   */
  public setInfo<T>(key: string, value: T): void {
    this._info.set(key, value);
  }

  /**
   * Retrieves attached information from this target.
   * @param key The unique key identifier.
   * @returns The dynamically casted data, or undefined if not set.
   */
  public getInfo<T>(key: string): T | undefined {
    return this._info.get(key) as T | undefined;
  }

  /**
   * Checks if specific information exists on this target.
   * @param key The unique key identifier.
   */
  public hasInfo(key: string): boolean {
    return this._info.has(key);
  }

  /**
   * Removes attached information from this target.
   * @param key The unique key identifier.
   * @returns True if the information existed and was removed.
   */
  public removeInfo(key: string): boolean {
    return this._info.delete(key);
  }

  /**
   * Retrieves a list of all currently attached information keys.
   */
  public getInfoKeys(): string[] {
    return Array.from(this._info.keys());
  }

  /**
   * Helper to quickly attach a Native Window to this target's information storage.
   * Initializes the 'windows' info array if it does not yet exist.
   * @param window The native window object to attach.
   */
  public addWindow(window: Native.Window): void {
    let windows = this.getInfo<Native.Window[]>('windows');
    if (!windows) {
      windows = [];
      this.setInfo('windows', windows);
    }
    if (!windows.some((w) => w === window)) {
      windows.push(window);
    }
  }

  /**
   * Discovers and returns a target data object by searching for a Window title.
   * Automatically resolves the PID and the Window's Main Thread ID, and attaches the matched Window.
   *
   * @param windowTitlePattern The window title to match (supports partial strings or RegEx).
   * @param initialState Optional initial custom state.
   * @returns A new Target instance wrapping the discovered info.
   * @throws Error if the window is not found.
   */
  static fromWindowName<
    S extends Record<string, unknown> = Record<string, unknown>,
  >(windowTitlePattern: string | RegExp, initialState?: S): Target<S> {
    const windows = Native.Window.getWindows();
    let foundWindow: Native.Window | undefined;

    for (const w of windows) {
      const title = w.getText();
      if (!title) continue;

      if (typeof windowTitlePattern === 'string') {
        if (title.toLowerCase().includes(windowTitlePattern.toLowerCase())) {
          foundWindow = w;
          break;
        }
      } else {
        if (windowTitlePattern.test(title)) {
          foundWindow = w;
          break;
        }
      }
    }

    if (!foundWindow) {
      throw new Error(
        `Window matching title '${windowTitlePattern}' not found.`,
      );
    }

    const [tid, pid] = foundWindow.getThreadProcessId();

    const snapshot = new Native.ToolhelpSnapshot(
      Native.ToolhelpSnapshotFlag.SNAPPROCESS,
    );
    let foundName = 'unknown';
    for (const p of snapshot.getProcesses()) {
      if (p.pid === pid) {
        foundName = p.name;
        break;
      }
    }
    snapshot.close();

    const target = new Target<S>(pid, foundName, initialState);
    target.addWindow(foundWindow);
    target.setInfo('mainThreadId', tid);

    return target;
  }

  /**
   * Discovers and returns a target data object by its executable name.
   * Uses ToolhelpSnapshot under the hood for discovery.
   *
   * @param name The executable name (e.g., "calc.exe").
   * @param initialState Optional initial custom state.
   * @returns A new Target instance wrapping the discovered info.
   * @throws Error if the process is not found.
   */
  static fromName<S extends Record<string, unknown> = Record<string, unknown>>(
    name: string,
    initialState?: S,
  ): Target<S> {
    const snapshot = new Native.ToolhelpSnapshot(
      Native.ToolhelpSnapshotFlag.SNAPPROCESS,
    );
    let processEntry;
    for (const p of snapshot.getProcesses()) {
      if (p.name.toLowerCase() === name.toLowerCase()) {
        processEntry = p;
        break;
      }
    }
    snapshot.close();

    if (!processEntry) {
      throw new Error(`Process with name '${name}' not found.`);
    }

    return new Target<S>(processEntry.pid, processEntry.name, initialState);
  }

  /**
   * Discovers and returns a target data object by an explicit Process ID.
   *
   * @param pid The process ID.
   * @param initialState Optional initial custom state.
   * @returns A new Target instance wrapping the discovered info.
   */
  static fromPid<S extends Record<string, unknown> = Record<string, unknown>>(
    pid: number,
    initialState?: S,
  ): Target<S> {
    const snapshot = new Native.ToolhelpSnapshot(
      Native.ToolhelpSnapshotFlag.SNAPPROCESS,
    );
    let foundName = 'unknown';
    for (const p of snapshot.getProcesses()) {
      if (p.pid === pid) {
        foundName = p.name;
        break;
      }
    }
    snapshot.close();

    return new Target<S>(pid, foundName, initialState);
  }

  /**
   * Enumerates all processes that have visible windows, grouping them by PID.
   * Useful for high-level target selection in a CLI or GUI.
   *
   * @returns A list of Target objects discovered.
   */
  static enumerate(): Target[] {
    const windows = Native.Window.getWindows();
    const pidToWindows = new Map<number, Native.Window[]>();

    for (const w of windows) {
      try {
        const title = w.getText();
        if (!title || title.trim().length === 0) continue;

        const [, pid] = w.getThreadProcessId();
        if (pid === 0) continue; // Skip System Idle Process etc.

        if (!pidToWindows.has(pid)) {
          pidToWindows.set(pid, []);
        }
        pidToWindows.get(pid)!.push(w);
      } catch {
        // Some windows might be protected or close during enumeration
        continue;
      }
    }

    const snapshot = new Native.ToolhelpSnapshot(
      Native.ToolhelpSnapshotFlag.SNAPPROCESS,
    );
    const processes = snapshot.getProcesses();
    const results: Target[] = [];

    for (const [pid, group] of pidToWindows.entries()) {
      const procEntry = processes.find((p) => p.pid === pid);
      if (!procEntry) continue;

      const target = new Target(pid, procEntry.name);
      for (const w of group) {
        target.addWindow(w);
      }
      results.push(target);
    }

    snapshot.close();
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Active injection sessions (channels) for this target.
   */
  private _channels: [AdvancedProxyThread, CapturedThread][] = [];

  /**
   * Returns a read-only list of active injection channels.
   */
  public get channels(): ReadonlyArray<[AdvancedProxyThread, CapturedThread]> {
    return this._channels;
  }

  /**
   * Attempts to inject into all threads of the target process in parallel,
   * yielding successful channels as they arrive.
   *
   * @param options Optional configuration including result count limit.
   */
  public async *injectAll(
    options: { count?: number } = {},
  ): AsyncGenerator<[AdvancedProxyThread, CapturedThread]> {
    const { AdvancedNThread } = await import('./advanced-nthread');
    const nt = new AdvancedNThread();

    const proc = Native.Process.open(this.pid);
    const threads = proc.getThreadIds();
    proc.close();

    for await (const channel of nt.injectMany(threads, options)) {
      this._channels.push(channel);
      yield channel;
    }
  }

  /**
   * Detaches from all currently active injection channels.
   */
  public async detachAll(): Promise<void> {
    const sessions = [...this._channels];
    this._channels = [];
    for (const [proxy, captured] of sessions) {
      try {
        await proxy.close();
        captured.close();
      } catch {
        // Ignore individual cleanup errors
      }
    }
  }
}
