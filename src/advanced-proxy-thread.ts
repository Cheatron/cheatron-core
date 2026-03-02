import * as Native from '@cheatron/native';
import { ProxyThread, type Arg } from '@cheatron/nthread';

/**
 * AdvancedProxyThread extends ProxyThread with higher-level bound functions.
 *
 * New functions are declared as typed properties and wired via `bind()`
 * in AdvancedNThread.inject() — same pattern as the CRT functions
 * (malloc, fopen, etc.) on the base ProxyThread.
 */
export class AdvancedProxyThread extends ProxyThread {
  /** `kernel32!LoadLibraryA(lpLibFileName)` → HMODULE */
  declare loadLibraryA: (lpLibFileName: Arg) => Promise<Native.NativePointer>;

  /** `kernel32!LoadLibraryW(lpLibFileName)` → HMODULE */
  declare loadLibraryW: (lpLibFileName: Arg) => Promise<Native.NativePointer>;

  /** `kernel32!GetCurrentDirectoryW(nBufferLength, lpBuffer)` → DWORD (length) */
  declare getCurrentDirectoryW: (
    nBufferLength: Arg,
    lpBuffer: Arg,
  ) => Promise<Native.NativePointer>;
}
