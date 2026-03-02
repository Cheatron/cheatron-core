# Cheatron Core - AI Agent Guidelines

This document provides system instructions, technical context, and coding conventions for autonomous AI agents assisting with the `@cheatron/core` repository. It should be consulted to understand the project's architectural decisions.

## Project Context

`@cheatron/core` is an umbrella module in the Cheatron ecosystem. It targets the Windows OS (`x64` architecture specifically) but the development environment uses Bun and Linux/WSL for tooling.
Its purpose is to provide a single, clean API surface for writing game hacking utilities using Node.js/Bun.

Core capabilities:

1. **Thread Hijacking / Execution Control:** via `@cheatron/nthread`. We extend it here through `AdvancedNThread` and `AdvancedProxyThread` to provide high-level bound functions (`LoadLibrary`, `GetCurrentDirectory`).
2. **Native Memory Interaction:** via `@cheatron/native` providing memory reading/writing, module lookups, window manipulation, and pointers representation (`NativePointer`).
3. **Assembly/Disassembly:** Wraps lightweight versions of `Keystone` and `Capstone` engines for dynamic analysis.

## Development Constraints and Rules

### 1. The Target is Always Windows x64

- Even though tests and IDEs might run on Linux, the executed native bindings (via `koffi` FFI) target the Windows API (`kernel32.dll`, `user32.dll`, `ntdll.dll`, `msvcrt.dll`).
- Always assume 64-bit pointers when working with native memory. Use `bigint` (or `NativePointer`) to securely hold 64-bit addresses, NOT standard JavaScript `number` objects. `number` loses precision after 53 bits.

### 2. TypeScript and Strict Typing

- Do not use `any`. Use strict TypeScript definitions or `unknown` where appropriate.
- When working with C types or external libraries, explicitly import types from `@cheatron/native` or `@cheatron/win32-ext`.
- Use JSDoc comments to document public APIs, especially those that act as wrappers for Win32 API calls.

### 3. File and Module Structure

- All code resides in `src/`. Do not pollute the root directory.
- `src/index.ts` is the barrel file. Any exported primitive must be exported here.
- Enums wrapped from Capstone/Keystone should drop original C prefixes for cleanliness (e.g. wrap `x86_reg` as `Reg` and `x86_op_type` as `OpType`).

### 4. NThread Proxy Binding Pattern

When exposing new native functions to `AdvancedProxyThread`:

1. Use `declare funcName: (args...) => Promise<NativePointer>` inside `AdvancedProxyThread`.
2. Do not attach implementations to the class directly.
3. Use `proxy.bind('funcName', targetAddress)` inside the `AdvancedNThread.inject` setup phase to dynamically wire the FFI call.
4. If a function is complex (like string allocation mapping), wrap the `proxy.funcName` call inside a helper method on `AdvancedNThread` (e.g., `loadLibrary`, `pwd`).

### 5. String Encodings on Windows

- Be mindful of ANSI vs Unicode strings in Windows APIs.
- Win32 APIs typically end in `A` (ANSI) or `W` (Wide / UTF-16).
- For string inputs, rely on the `resolveEncoding` helper from `@cheatron/native` to automatically select `A` vs `W` based on the string content, keeping the public API simple and encoding-agnostic.

### 6. Tests

- Tests are contained in the `tests/` directory and run via `bun test`.
- Use the established `spawnLoopThread()` and `cleanupThread()` helpers inside `tests` to safely initialize a target thread for injection logic validation.
- Remember that hardware breakpoints, system dll loading tests (`user32.dll`), and FFI callbacks will realistically only pass when executed on a real Windows environment or properly configured Wine layer. Do not break tests just because they fail under native Linux.
