import {
  KeystoneX86,
  ks_opt_type,
  ks_opt_value,
  ks_err,
} from '@cheatron/keystone';
import {
  CapstoneX86,
  cs_opt_type,
  cs_opt_value,
  cs_err,
  x86_op_type,
  type InstructionX86,
} from '@cheatron/capstone';

// -- Re-export large enums as-is (x86_reg, x86_insn, etc.) --
export {
  x86_reg as Reg,
  x86_insn as Insn,
  x86_prefix as Prefix,
  x86_avx_bcast as AvxBcast,
  x86_avx_cc as AvxCc,
  x86_avx_rm as AvxRm,
  x86_sse_cc as SseCc,
  x86_xop_cc as XopCc,
} from '@cheatron/capstone';

// -- Friendly enum aliases --

/** Assembler syntax option type */
export const AsmOptType = {
  /** Choose syntax for input assembly */
  SYNTAX: ks_opt_type.SYNTAX,
  /** Symbol resolver callback */
  SYM_RESOLVER: ks_opt_type.SYM_RESOLVER,
} as const;
export type AsmOptType = (typeof AsmOptType)[keyof typeof AsmOptType];

/** Assembler syntax values */
export const AsmSyntax = {
  /** x86 Intel syntax (default) */
  INTEL: ks_opt_value.SYNTAX_INTEL,
  /** x86 AT&T syntax */
  ATT: ks_opt_value.SYNTAX_ATT,
  /** x86 NASM syntax */
  NASM: ks_opt_value.SYNTAX_NASM,
  /** x86 MASM syntax */
  MASM: ks_opt_value.SYNTAX_MASM,
  /** x86 GNU GAS syntax */
  GAS: ks_opt_value.SYNTAX_GAS,
  /** Use radix-16 for immediates */
  RADIX16: ks_opt_value.SYNTAX_RADIX16,
} as const;
export type AsmSyntax = (typeof AsmSyntax)[keyof typeof AsmSyntax];

/** Assembler error codes */
export const AsmError = {
  OK: ks_err.OK,
  NOMEM: ks_err.NOMEM,
  ARCH: ks_err.ARCH,
  HANDLE: ks_err.HANDLE,
  MODE: ks_err.MODE,
  VERSION: ks_err.VERSION,
  OPT_INVALID: ks_err.OPT_INVALID,
  // -- expression / directive / token errors --
  EXPR_TOKEN: ks_err.ASM_EXPR_TOKEN,
  DIRECTIVE_VALUE_RANGE: ks_err.ASM_DIRECTIVE_VALUE_RANGE,
  DIRECTIVE_ID: ks_err.ASM_DIRECTIVE_ID,
  DIRECTIVE_TOKEN: ks_err.ASM_DIRECTIVE_TOKEN,
  DIRECTIVE_STR: ks_err.ASM_DIRECTIVE_STR,
  DIRECTIVE_COMMA: ks_err.ASM_DIRECTIVE_COMMA,
  DIRECTIVE_RELOC_NAME: ks_err.ASM_DIRECTIVE_RELOC_NAME,
  DIRECTIVE_RELOC_TOKEN: ks_err.ASM_DIRECTIVE_RELOC_TOKEN,
  DIRECTIVE_FPOINT: ks_err.ASM_DIRECTIVE_FPOINT,
  DIRECTIVE_UNKNOWN: ks_err.ASM_DIRECTIVE_UNKNOWN,
  DIRECTIVE_EQU: ks_err.ASM_DIRECTIVE_EQU,
  DIRECTIVE_INVALID: ks_err.ASM_DIRECTIVE_INVALID,
  VARIANT_INVALID: ks_err.ASM_VARIANT_INVALID,
  EXPR_BRACKET: ks_err.ASM_EXPR_BRACKET,
  SYMBOL_MODIFIER: ks_err.ASM_SYMBOL_MODIFIER,
  SYMBOL_REDEFINED: ks_err.ASM_SYMBOL_REDEFINED,
  SYMBOL_MISSING: ks_err.ASM_SYMBOL_MISSING,
  RPAREN: ks_err.ASM_RPAREN,
  STAT_TOKEN: ks_err.ASM_STAT_TOKEN,
  UNSUPPORTED: ks_err.ASM_UNSUPPORTED,
  MACRO_TOKEN: ks_err.ASM_MACRO_TOKEN,
  MACRO_PAREN: ks_err.ASM_MACRO_PAREN,
  MACRO_EQU: ks_err.ASM_MACRO_EQU,
  MACRO_ARGS: ks_err.ASM_MACRO_ARGS,
  MACRO_LEVELS_EXCEED: ks_err.ASM_MACRO_LEVELS_EXCEED,
  MACRO_STR: ks_err.ASM_MACRO_STR,
  MACRO_INVALID: ks_err.ASM_MACRO_INVALID,
  ESC_BACKSLASH: ks_err.ASM_ESC_BACKSLASH,
  ESC_OCTAL: ks_err.ASM_ESC_OCTAL,
  ESC_SEQUENCE: ks_err.ASM_ESC_SEQUENCE,
  ESC_STR: ks_err.ASM_ESC_STR,
  TOKEN_INVALID: ks_err.ASM_TOKEN_INVALID,
  INSN_UNSUPPORTED: ks_err.ASM_INSN_UNSUPPORTED,
  FIXUP_INVALID: ks_err.ASM_FIXUP_INVALID,
  LABEL_INVALID: ks_err.ASM_LABEL_INVALID,
  FRAGMENT_INVALID: ks_err.ASM_FRAGMENT_INVALID,
  INVALID_OPERAND: ks_err.ASM_INVALIDOPERAND,
  MISSING_FEATURE: ks_err.ASM_MISSINGFEATURE,
  MNEMONIC_FAIL: ks_err.ASM_MNEMONICFAIL,
} as const;
export type AsmError = (typeof AsmError)[keyof typeof AsmError];

/** Disassembler option type */
export const DisasmOptType = {
  INVALID: cs_opt_type.INVALID,
  /** Assembly output syntax */
  SYNTAX: cs_opt_type.SYNTAX,
  /** Break down instruction details */
  DETAIL: cs_opt_type.DETAIL,
  /** Change engine mode at run-time */
  MODE: cs_opt_type.MODE,
  /** Custom memory management */
  MEM: cs_opt_type.MEM,
  /** Skip data when disassembling */
  SKIPDATA: cs_opt_type.SKIPDATA,
  /** User-defined SKIPDATA callback */
  SKIPDATA_SETUP: cs_opt_type.SKIPDATA_SETUP,
  /** Customize instruction mnemonic */
  MNEMONIC: cs_opt_type.MNEMONIC,
  /** Print immediates as unsigned */
  UNSIGNED: cs_opt_type.UNSIGNED,
} as const;
export type DisasmOptType = (typeof DisasmOptType)[keyof typeof DisasmOptType];

/** Disassembler option values */
export const DisasmOptValue = {
  /** Turn OFF an option */
  OFF: cs_opt_value.OFF,
  /** Turn ON an option */
  ON: cs_opt_value.ON,
  /** Default syntax */
  SYNTAX_DEFAULT: cs_opt_value.SYNTAX_DEFAULT,
  /** x86 Intel syntax (default) */
  SYNTAX_INTEL: cs_opt_value.SYNTAX_INTEL,
  /** x86 AT&T syntax */
  SYNTAX_ATT: cs_opt_value.SYNTAX_ATT,
  /** Print register names as numbers */
  SYNTAX_NOREGNAME: cs_opt_value.SYNTAX_NOREGNAME,
  /** x86 MASM syntax */
  SYNTAX_MASM: cs_opt_value.SYNTAX_MASM,
} as const;
export type DisasmOptValue =
  (typeof DisasmOptValue)[keyof typeof DisasmOptValue];

/** Disassembler error codes */
export const DisasmError = {
  OK: cs_err.OK,
  MEM: cs_err.MEM,
  ARCH: cs_err.ARCH,
  HANDLE: cs_err.HANDLE,
  CSH: cs_err.CSH,
  MODE: cs_err.MODE,
  OPTION: cs_err.OPTION,
  DETAIL: cs_err.DETAIL,
  MEMSETUP: cs_err.MEMSETUP,
  VERSION: cs_err.VERSION,
  DIET: cs_err.DIET,
  SKIPDATA: cs_err.SKIPDATA,
  X86_ATT: cs_err.X86_ATT,
  X86_INTEL: cs_err.X86_INTEL,
  X86_MASM: cs_err.X86_MASM,
} as const;
export type DisasmError = (typeof DisasmError)[keyof typeof DisasmError];

/** Operand type */
export const OpType = {
  /** Uninitialized */
  INVALID: x86_op_type.INVALID,
  /** Register operand */
  REG: x86_op_type.REG,
  /** Immediate operand */
  IMM: x86_op_type.IMM,
  /** Memory operand */
  MEM: x86_op_type.MEM,
} as const;
export type OpType = (typeof OpType)[keyof typeof OpType];

// -- Re-export useful types --
export type { InstructionX86 } from '@cheatron/capstone';
export type { X86Detail, X86Op } from '@cheatron/capstone';

// -- Asm class --

/**
 * Unified assembler / disassembler for x86-64.
 *
 * Wraps both Keystone (assembler) and Capstone (disassembler)
 * behind a single, convenient API.
 */
export class Asm {
  private readonly ks: KeystoneX86;
  private readonly cs: CapstoneX86;

  constructor() {
    this.ks = new KeystoneX86();
    this.cs = new CapstoneX86();
  }

  // -- Keystone (assemble) --

  /**
   * Assemble one or more instructions into machine code bytes.
   * @param source  Assembly source (instructions separated by `;` or newline)
   * @param address Optional base address for the assembled code
   * @returns Array of bytes
   */
  asm(source: string, address?: bigint | number): number[] {
    return this.ks.asm(source, address);
  }

  /**
   * Set an assembler option (e.g. syntax).
   * @example asm.asmOption(AsmOptType.SYNTAX, AsmSyntax.NASM)
   */
  asmOption(type: AsmOptType, value: number): void {
    this.ks.option(type, value);
  }

  /** Last assembler error code */
  get asmErrno(): AsmError {
    return this.ks.errno as AsmError;
  }

  /** Human-readable error string for an assembler error code */
  asmStrerror(code: AsmError): string {
    return this.ks.strerror(code);
  }

  // -- Capstone (disassemble) --

  /**
   * Disassemble a buffer of machine code into instructions.
   * @param buffer  Buffer containing raw machine code
   * @param address Virtual address of the first byte
   * @param count   Maximum number of instructions to decode (0 = all)
   * @returns Array of decoded instructions
   */
  disasm(
    buffer: Buffer,
    address: bigint | number,
    count?: number,
  ): InstructionX86[] {
    return this.cs.disasm(buffer, address, count);
  }

  /**
   * Set a disassembler option.
   * @example asm.disasmOption(DisasmOptType.SYNTAX, DisasmOptValue.SYNTAX_ATT)
   */
  disasmOption(type: DisasmOptType, value: DisasmOptValue | number): void {
    this.cs.option(type, value);
  }

  /**
   * Enable detailed instruction information (operands, registers, etc.)
   */
  onDetail(): void {
    this.cs.onDetail();
  }

  /**
   * Disable detailed instruction information.
   */
  offDetail(): void {
    this.cs.offDetail();
  }

  /** Last disassembler error code */
  get disasmErrno(): DisasmError {
    return this.cs.errno() as DisasmError;
  }

  /** Human-readable error string for a disassembler error code */
  disasmStrerror(code: DisasmError): string {
    return this.cs.strerror(code);
  }

  /** Get a register name from its numeric ID */
  regName(regId: number): string {
    return this.cs.regName(regId);
  }

  /** Get an instruction name from its numeric ID */
  insnName(insnId: number): string {
    return this.cs.insnName(insnId);
  }

  /** Keystone version */
  static get keystoneVersion() {
    return KeystoneX86.version();
  }

  /** Capstone version */
  static get capstoneVersion() {
    return CapstoneX86.version();
  }

  /**
   * Release both Keystone and Capstone handles.
   */
  close(): void {
    this.ks.close();
    this.cs.close();
  }
}

/** Global x86-64 assembler / disassembler instance. */
export const asm = new Asm();
