export function buildSolvablePuzzle(seed: number, size = 3, steps?: number) {
  const cellCount = size * size;
  const solved = [...Array.from({ length: cellCount - 1 }, (_, i) => i + 1), 0];
  const next = [...solved];
  let s = seed || 1;
  const moveCount = typeof steps === "number" && Number.isFinite(steps)
    ? Math.max(8, Math.floor(steps))
    : 24 + (seed % 16);

  const neighbors = (idx: number) => {
    const row = Math.floor(idx / size);
    const col = idx % size;
    const out: number[] = [];
    if (row > 0) out.push(idx - size);
    if (row < size - 1) out.push(idx + size);
    if (col > 0) out.push(idx - 1);
    if (col < size - 1) out.push(idx + 1);
    return out;
  };

  for (let i = 0; i < moveCount; i++) {
    const blank = next.indexOf(0);
    const opts = neighbors(blank);
    s = (s * 9301 + 49297) % 233280;
    const pick = opts[Math.floor((s / 233280) * opts.length)];
    [next[blank], next[pick]] = [next[pick], next[blank]];
  }
  return next;
}

export function isSolvedPuzzle(board: number[]) {
  const size = Math.sqrt(board.length);
  if (!Number.isInteger(size)) return false;
  const last = board.length - 1;
  for (let i = 0; i < last; i++) if (board[i] !== i + 1) return false;
  return board[last] === 0;
}

export function canMoveTile(board: number[], idx: number) {
  const size = Math.sqrt(board.length);
  if (!Number.isInteger(size)) return false;
  const blank = board.indexOf(0);
  const row = Math.floor(idx / size);
  const col = idx % size;
  const brow = Math.floor(blank / size);
  const bcol = blank % size;
  return Math.abs(row - brow) + Math.abs(col - bcol) === 1;
}
