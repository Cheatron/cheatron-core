import { test, expect } from 'bun:test';
import { Target } from '@cheatron/core';
import * as Native from '@cheatron/native';

test('Target > initialization and dynamic info storage', () => {
  const target = Target.fromPid(Native.currentProcess.pid);
  expect(target.pid).toBe(Native.currentProcess.pid);
  expect(target.name).toBeDefined();

  target.setInfo('arch', 'x64');
  expect(target.getInfo<string>('arch')).toBe('x64');

  target.setInfo('modules', [{ name: 'test.dll' }]);
  const mods = target.getInfo<{ name: string }[]>('modules')!;
  expect(mods.length).toBe(1);
  expect(mods[0].name).toBe('test.dll');

  expect(target.hasInfo('arch')).toBe(true);
  target.removeInfo('arch');
  expect(target.hasInfo('arch')).toBe(false);

  // Test addWindow helper
  const fakeWin = new Native.Window(1234n);
  target.addWindow(fakeWin);
  const matchedWindows = target.getInfo<Native.Window[]>('windows')!;
  expect(matchedWindows.length).toBe(1);
  expect(matchedWindows[0]).toBe(fakeWin);
});
