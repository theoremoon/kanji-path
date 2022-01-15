import {readFileSync} from 'fs';
import {gunzipSync} from 'zlib';

type Graph = Map<string, Set<string>>;

export const loadIdioms = (): Graph => {
  const f = readFileSync('./data/idioms.txt.gz');
  const idioms = gunzipSync(f).toString().trim().split('\n');

  const forward = new Map<string, Set<string>>();
  idioms.forEach((w) => {
    if (!forward.has(w[0])) {
      forward.set(w[0], new Set());
    }
    const f = forward.get(w[0]);
    f.add(w[1]);
    forward.set(w[0], f);
  });
  return forward;
};

export const solve = (idioms: Graph, s: string, e: string): string[]|null => {
  if (!idioms.has(s)) {
    return null;
  }
  const visited = new Set<string>();
  visited.add(s);

  // BFS with 経路
  const queue: string[][] = Array.from(idioms.get(s)).map((w: string) => [s, w]);
  while (queue.length > 0) {
    const cur = queue.shift();
    const x = cur.at(-1);
    visited.add(x);
    if (x === e) {
      return cur;
    }
    if (!idioms.has(x)) {
      continue;
    }

    Array.from(idioms.get(x)).forEach((next: string) => {
      if (!idioms.has(next) || visited.has(next)) {
        return;
      }
      queue.push(cur.concat([next]));
    });
  }
  return null;
};
