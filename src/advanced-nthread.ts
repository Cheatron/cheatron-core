import * as Native from '@cheatron/native';
import {
  type AllocOptions,
  CapturedThread,
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
  protected override async setupProxy(
    cap: CapturedThread,
  ): Promise<[AdvancedProxyThread, CapturedThread]> {
    const [proxy, captured] = await super.setupProxy(cap);

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

  override inject(
    thread: Native.Thread | number | CapturedThread,
  ): Promise<[AdvancedProxyThread, CapturedThread]> {
    return super.inject(thread) as Promise<
      [AdvancedProxyThread, CapturedThread]
    >;
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
    dllPath: string | Native.NativeString | Native.NativePointer,
    wide?: boolean,
  ): Promise<Native.NativePointer> {
    if (typeof dllPath === 'string') {
      const [encodedBuf, loadFn] = resolveEncoding(
        proxy.loadLibraryA.bind(proxy),
        proxy.loadLibraryW.bind(proxy),
        dllPath,
        wide,
      );

      const strPtr = await proxy.alloc(encodedBuf.length, { readonly: true });
      await proxy.write(strPtr, encodedBuf);

      const hModule = await loadFn(strPtr);

      await proxy.dealloc(strPtr);
      return hModule;
    } else {
      let w: boolean;
      if (wide === undefined) {
        if (dllPath instanceof Native.NativeString) {
          w = dllPath.wide;
        } else {
          w = false;
        }
      } else {
        w = wide;
      }

      const hModule = w
        ? await proxy.loadLibraryW(dllPath)
        : await proxy.loadLibraryA(dllPath);
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
      const buf = await proxy.read(strPtr);

      return buf.toString('utf16le');
    } finally {
      await proxy.dealloc(strPtr);
    }
  }
}
