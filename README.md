# `@cheatron/core`

The core umbrella package for the Cheatron ecosystem. It re-exports and extends the essential tools required for advanced x64 game hacking and non-invasive thread hijacking on Windows.

## Features

- **Single Entry-Point:** Re-exports everything you need from `@cheatron/native`, `@cheatron/nthread`, `@cheatron/capstone`, and `@cheatron/keystone`.
- **Advanced Thread Hijacking:** Provides `AdvancedNThread` and `AdvancedProxyThread` which extend the base payload injection features with high-level primitives like `loadLibrary` and `pwd`.
- **Unified Assembly/Disassembly API:** Wrap Keystone and Capstone into a clean `Asm` class tailored for `x86_64`, abstracting away complex handles and C-style enum names into idiomatic TypeScript.

## Installation

```bash
bun add @cheatron/core
```

## Quick Start

### Assembly & Disassembly

```typescript
import { Asm } from '@cheatron/core';

// Assemble
const asm = new Asm();
const machineCode = asm.asm('mov rax, 1; nop');
console.log(machineCode);

// Disassemble
const instructions = asm.disasm(Buffer.from(machineCode), 0x1000n);
for (const ins of instructions) {
  console.log(`0x${ins.address.toString(16)}: ${ins.mnemonic} ${ins.opStr}`);
}
```

### Advanced Thread Hijacking

The `AdvancedNThread` seamlessly hijacks an executing thread without requiring a debugger, giving you safe, synchronous execution control over the remote process.

```typescript
import { AdvancedNThread, AdvancedProxyThread } from '@cheatron/core';
import * as Native from '@cheatron/native';

async function main() {
  const processId = 12345;
  const targetProcess = Native.Process.open(processId);
  const targetThread = targetProcess.getThreads()[0];

  const nthread = new AdvancedNThread();
  const [proxy, captured] = await nthread.inject(targetThread.id);

  try {
    // High-level wrapper over LoadLibraryW / LoadLibraryA
    // Safely allocates the path in remote memory and executes LoadLibrary via the hijacked thread.
    const hModule = await nthread.loadLibrary(proxy, 'C:\\my_cheat.dll');
    console.log(`Injected successfully at 0x${hModule.address.toString(16)}`);

    // Retrieve remote process's current working directory
    const cwd = await nt.pwd(proxy);
    console.log(`Target process is running from: ${cwd}`);
  } finally {
    // Resume original execution flow effortlessly
    await proxy.close();
    captured.close();
  }
}
```

## Development

The project is built with `bun` and strictly typed using TypeScript. It heavily relies on the `koffi` FFI library for Windows API bindings.

```bash
# Build the typescript files
bun run build

# Run tests
bun test

# Formatter and Linter
bun run lint
bun run format
```

## License

MIT
