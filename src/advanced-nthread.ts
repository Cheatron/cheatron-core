import * as Native from '@cheatron/native';
import {
  type CapturedThread,
  type AllocOptions,
  NThreadFile,
} from '@cheatron/nthread';
import { AdvancedProxyThread } from './advanced-proxy-thread';
import { resolveEncoding } from '@cheatron/native';

/**
 * AdvancedNThread extends NThreadFile with a richer proxy.
 *
 * On `inject()` the base hijacking flow runs, then the resulting
 * ProxyThread is upgraded to an {@link AdvancedProxyThread} with
 * extra bound functions (loadLibraryA, loadLibraryW, etc.).
 */
export class AdvancedNThread extends NThreadFile {
  /**
   * Hijacks a thread and returns an AdvancedProxyThread with extra helpers.
   *
   * @param thread Thread object or Thread ID to hijack.
   * @returns `[AdvancedProxyThread, CapturedThread]`
   */
  override async inject(
    thread: Native.Thread | number,
  ): Promise<[AdvancedProxyThread, CapturedThread]> {
    const [proxy, captured] = await super.inject(thread);

    // Re-type as AdvancedProxyThread (same prototype, declare-only extension)
    const advanced = proxy as unknown as AdvancedProxyThread;

    // Bind kernel32 functions
    advanced.bind(
      'loadLibraryA',
      Native.Module.kernel32.getProcAddress('LoadLibraryA'),
    );
    advanced.bind(
      'loadLibraryW',
      Native.Module.kernel32.getProcAddress('LoadLibraryW'),
    );
    advanced.bind(
      'getCurrentDirectoryW',
      Native.Module.kernel32.getProcAddress('GetCurrentDirectoryW'),
    );

    return [advanced, captured];
  }

  /**
   * Loads a DLL into the target process.
   *
   * Allocates the path string in the remote process, calls LoadLibrary,
   * and frees the temporary string. Uses `resolveEncoding` to automatically
   * pick LoadLibraryA (ASCII paths) or LoadLibraryW (non-ASCII / wide paths).
   *
   * @param proxy   The advanced proxy for the captured thread.
   * @param dllPath Path to the DLL (e.g. `"C:\\my.dll"`).
   * @param opts    Optional alloc options forwarded to `proxy.alloc()`.
   * @returns The HMODULE base address of the loaded library.
   */
  async loadLibrary(
    proxy: AdvancedProxyThread,
    dllPath: string | Native.NativePointer,
    wide: boolean = false,
  ): Promise<Native.NativePointer> {
    if (typeof dllPath === 'string') {
      const [, loadFn] = resolveEncoding(
        proxy.loadLibraryA.bind(proxy),
        proxy.loadLibraryW.bind(proxy),
        dllPath,
      );

      const strPtr = await this.allocString(proxy, dllPath, { readonly: true });
      const hModule = await loadFn(strPtr);

      await proxy.free(strPtr);
      return hModule;
    } else if (wide) {
      const hModule = await proxy.loadLibraryW(dllPath);
      return hModule;
    } else {
      const hModule = await proxy.loadLibraryA(dllPath);
      return hModule;
    }
  }

  /**
   * Retrieves the current working directory of the target process.
   *
   * Allocates a temporary buffer, calls `kernel32!GetCurrentDirectoryW`,
   * reads the UTF-16 string back, and frees the buffer.
   *
   * @param proxy The advanced proxy for the captured thread.
   * @param opts  Optional alloc options forwarded to `proxy.alloc()`.
   * @returns The current working directory as a string.
   */
  async pwd(proxy: AdvancedProxyThread, opts?: AllocOptions): Promise<string> {
    // 2048 wide characters = 4096 bytes is usually enough for any path
    const MAX_PATH_CHARS = 2048;
    const bufSize = MAX_PATH_CHARS * 2;

    const strPtr = await proxy.alloc(bufSize, opts);

    try {
      // GetCurrentDirectoryW(nBufferLength, lpBuffer) returns the length in chars
      const ret = await proxy.getCurrentDirectoryW(MAX_PATH_CHARS, strPtr);
      const lengthChars = Number(ret.address);

      if (lengthChars === 0) {
        throw new Error('GetCurrentDirectoryW failed or returned 0 length');
      }

      // Read the string from the target process memory via ProxyThread
      const bytesToRead = lengthChars * 2; // UTF-16 is 2 bytes per char
      const buf = await proxy.read(strPtr, bytesToRead);

      return buf.toString('utf16le');
    } finally {
      await proxy.free(strPtr);
    }
  }
}
