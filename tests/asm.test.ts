import { describe, it, expect } from 'bun:test';
import {
  Asm,
  asm,
  AsmOptType,
  AsmSyntax,
  AsmError,
  DisasmError,
  OpType,
  Reg,
} from '@cheatron/core';

describe('Asm – unified assembler / disassembler', () => {
  // -- assemble --

  it('should assemble MOV RAX, RBX', () => {
    const bytes = asm.asm('MOV RAX, RBX');
    // 48 89 D8
    expect(bytes).toEqual([0x48, 0x89, 0xd8]);
  });

  it('should assemble multi-instruction sequences', () => {
    const bytes = asm.asm('NOP; INT3');
    // 90 CC
    expect(bytes).toEqual([0x90, 0xcc]);
  });

  it('should assemble with a base address', () => {
    // JMP $+0  at address 0x1000 → relative jump should encode correctly
    const bytes = asm.asm('NOP', 0x1000);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('should throw on invalid assembly', () => {
    expect(() => asm.asm('INVALID_MNEMONIC RAX')).toThrow();
  });

  // -- disassemble --

  it('should disassemble MOV RAX, RBX', () => {
    const buf = Buffer.from([0x48, 0x89, 0xd8]);
    const insns = asm.disasm(buf, 0n);

    expect(insns.length).toBe(1);
    expect(insns[0].mnemonic).toBe('mov');
    expect(insns[0].size).toBe(3);
  });

  it('should disassemble multiple instructions', () => {
    // NOP ; INT3
    const buf = Buffer.from([0x90, 0xcc]);
    const insns = asm.disasm(buf, 0n);

    expect(insns.length).toBe(2);
    expect(insns[0].mnemonic).toBe('nop');
    expect(insns[1].mnemonic).toBe('int3');
  });

  it('should respect count parameter', () => {
    const buf = Buffer.from([0x90, 0x90, 0x90]);
    const insns = asm.disasm(buf, 0n, 1);

    expect(insns.length).toBe(1);
  });

  it('should honour base address', () => {
    const buf = Buffer.from([0x90]);
    const insns = asm.disasm(buf, 0x4000n);

    expect(insns[0].address).toBe(0x4000n);
  });

  // -- roundtrip --

  it('should roundtrip asm → disasm', () => {
    const source = 'PUSH RBP; MOV RBP, RSP; POP RBP; RET';
    const bytes = asm.asm(source);
    const insns = asm.disasm(Buffer.from(bytes), 0n);

    expect(insns.length).toBe(4);
    expect(insns[0].mnemonic).toBe('push');
    expect(insns[1].mnemonic).toBe('mov');
    expect(insns[2].mnemonic).toBe('pop');
    expect(insns[3].mnemonic).toBe('ret');
  });

  // -- detail mode --

  it('should provide operand details when detail is on', () => {
    const a = new Asm();
    a.onDetail();

    const buf = Buffer.from(a.asm('MOV RAX, RBX'));
    const insns = a.disasm(buf, 0n);

    expect(insns[0].detail).toBeDefined();
    expect(insns[0].detail!.x86.op_count).toBe(2);
    expect(insns[0].detail!.x86.operands[0].type).toBe(OpType.REG);

    a.close();
  });

  // -- enum aliases --

  it('should export OpType enum values', () => {
    expect(OpType.INVALID).toBe(0);
    expect(OpType.REG).toBe(1);
    expect(OpType.IMM).toBe(2);
    expect(OpType.MEM).toBe(3);
  });

  it('should export AsmSyntax enum values', () => {
    expect(AsmSyntax.INTEL).toBeDefined();
    expect(AsmSyntax.ATT).toBeDefined();
    expect(AsmSyntax.NASM).toBeDefined();
  });

  it('should export AsmError enum values', () => {
    expect(AsmError.OK).toBe(0);
  });

  it('should export DisasmError enum values', () => {
    expect(DisasmError.OK).toBe(0);
  });

  it('should export Reg enum', () => {
    // RAX should be present
    expect(Reg.RAX).toBeDefined();
    expect(Reg.RSP).toBeDefined();
  });

  // -- version --

  it('should report keystone version', () => {
    const v = Asm.keystoneVersion;
    expect(v.major).toBeGreaterThanOrEqual(0);
    expect(v.minor).toBeGreaterThanOrEqual(0);
  });

  it('should report capstone version', () => {
    const v = Asm.capstoneVersion;
    expect(v.major).toBeGreaterThanOrEqual(0);
    expect(v.minor).toBeGreaterThanOrEqual(0);
  });

  // -- regName / insnName --

  it('should return register name by id', () => {
    const name = asm.regName(Reg.RAX);
    expect(name).toBe('rax');
  });

  // -- syntax switching --

  it('should allow switching assembler syntax', () => {
    const a = new Asm();
    // switch to NASM and assemble
    a.asmOption(AsmOptType.SYNTAX, AsmSyntax.NASM);
    const bytes = a.asm('mov rax, rbx');
    expect(bytes).toEqual([0x48, 0x89, 0xd8]);
    a.close();
  });
});
