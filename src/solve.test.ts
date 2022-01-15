import {loadIdioms, solve} from './solve';
import {gzipSync} from 'zlib';

jest.mock('fs');
import * as fs from 'fs';

test('normal case', () => {
  const spy = jest.spyOn(fs, 'readFileSync').mockReturnValue(gzipSync('AB\nAC\nAD\nAE\nBC'));

  const idioms = loadIdioms();
  expect(idioms).toStrictEqual(new Map([
    ['A', new Set(['B', 'C', 'D', 'E'])],
    ['B', new Set(['C'])],
  ]));

  spy.mockReset();
  spy.mockRestore();
});

describe('solve', () => {
  const idioms = new Map<string, Set<string>>([
    ['A', new Set(['B', 'D'])],
    ['B', new Set(['C'])],
    ['C', new Set(['D'])],
    ['D', new Set(['B'])],
  ]);

  test('自明ケース', () => {
    const path = solve(idioms, 'A', 'B');
    expect(path).toStrictEqual(['A', 'B']);
  });
  test('pathがあるケース', () => {
    const path = solve(idioms, 'A', 'C');
    expect(path).toStrictEqual(['A', 'B', 'C']);
  });
  test('pathがないケース', () => {
    const path = solve(idioms, 'C', 'A');
    expect(path).toBe(null);
  });
});

test('test in real data', () => {
  const actualFs = jest.requireActual('fs');
  jest.spyOn(fs, 'readFileSync').mockImplementation(actualFs.readFileSync);

  const idioms = loadIdioms();

  const path = solve(idioms, '天', '餅');
  expect(path).toStrictEqual(['天', '寒', '餅']);
});
