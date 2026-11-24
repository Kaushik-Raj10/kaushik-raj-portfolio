'use strict';

// Each snapshot stores the array and the counters for exactly one visible step.
function createSortTrace(input, method) {
  const values = input.slice();
  const frames = [];
  let comparisons = 0;
  let swaps = 0;

  function record(kind, pair, message) {
    frames.push({ values: values.slice(), kind, pair, message, comparisons, swaps });
  }

  function compare(left, right) {
    comparisons++;
    record('compare', [left, right], 'Compare ' + values[left] + ' and ' + values[right] + '.');
    return values[left] - values[right];
  }

  function swap(left, right) {
    const a = values[left];
    const b = values[right];
    [values[left], values[right]] = [b, a];
    swaps++;
    record('swap', [left, right], 'Swap ' + a + ' and ' + b + '.');
  }

  record('start', [], 'Ready to sort this array.');
  if (method === 'bubble') {
    for (let end = values.length - 1; end > 0; end--) {
      let changed = false;
      for (let left = 0; left < end; left++) {
        if (compare(left, left + 1) > 0) {
          swap(left, left + 1);
          changed = true;
        }
      }
      if (!changed) break;
    }
  } else if (method === 'insertion') {
    for (let next = 1; next < values.length; next++) {
      let position = next;
      while (position > 0 && compare(position - 1, position) > 0) {
        swap(position - 1, position);
        position--;
      }
    }
  } else if (method === 'selection') {
    for (let first = 0; first < values.length - 1; first++) {
      let smallest = first;
      for (let cursor = first + 1; cursor < values.length; cursor++) {
        if (compare(cursor, smallest) < 0) smallest = cursor;
      }
      if (smallest !== first) swap(first, smallest);
    }
  } else {
    throw new Error('Unknown sorting algorithm');
  }
  record('done', [], 'In order! ' + comparisons + ' comparisons and ' + swaps + ' swaps.');
  return frames;
}
