'use strict';

(() => {
  const numbers = [7, 3, 11, 2, 9, 5, 12, 1, 10, 4, 8, 6];
  const descriptions = {
    bubble: 'Compare neighbors and swap the pair when the larger value is on the left. Each pass carries a large value to the end.',
    insertion: 'Start with one value in order. Move each new value left past its larger neighbors until it fits.',
    selection: 'Find the smallest value in the remaining group and swap it into the next open position.'
  };
  const byId = (id) => document.getElementById(id);
  const chart = byId('bars');
  const method = byId('algorithm');
  const speed = byId('speed');
  const play = byId('play');
  const step = byId('step');
  const announcement = byId('sort-announcement');

  const bars = numbers.map(() => {
    const cell = document.createElement('div');
    const column = document.createElement('span');
    const label = document.createElement('span');
    cell.className = 'bar-cell';
    column.className = 'bar-column';
    label.className = 'bar-number';
    cell.append(column, label);
    chart.append(cell);
    return { cell, column, label };
  });

  let trace = [];
  let index = 0;
  let timer = null;

  function paint() {
    const frame = trace[index];
    frame.values.forEach((value, position) => {
      const bar = bars[position];
      bar.column.style.height = (12 + value * 6.6) + '%';
      const isActive = frame.pair.includes(position);
      bar.cell.dataset.state = frame.kind === 'done' ? 'done' : isActive ? frame.kind : 'idle';
      bar.label.textContent = value;
    });
    chart.setAttribute('aria-label', 'Array from left to right: ' + frame.values.join(', '));
    byId('comparisons').textContent = frame.comparisons;
    byId('swaps').textContent = frame.swaps;
    byId('step-number').textContent = index + ' / ' + (trace.length - 1);
    byId('event-text').textContent = frame.message;
    step.disabled = frame.kind === 'done';
    play.textContent = timer !== null ? 'Pause' : frame.kind === 'done' ? 'Replay' : 'Play';
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function advance(manual = false) {
    if (index < trace.length - 1) index++;
    if (index === trace.length - 1) stop();
    paint();
    if (manual || index === trace.length - 1) announcement.textContent = trace[index].message;
  }

  function start() {
    stop();
    if (index === trace.length - 1) index = 0;
    timer = setInterval(advance, Number(speed.value));
    paint();
  }

  function reset() {
    stop();
    index = 0;
    trace = createSortTrace(numbers, method.value);
    byId('method-name').textContent = method.selectedOptions[0].textContent;
    byId('method-note').textContent = descriptions[method.value];
    announcement.textContent = '';
    paint();
  }

  play.addEventListener('click', () => {
    if (timer === null) start();
    else { stop(); paint(); }
  });
  step.addEventListener('click', () => { stop(); advance(true); });
  byId('restart').addEventListener('click', reset);
  byId('shuffle').addEventListener('click', () => {
    for (let end = numbers.length - 1; end > 0; end--) {
      const other = Math.floor(Math.random() * (end + 1));
      [numbers[other], numbers[end]] = [numbers[end], numbers[other]];
    }
    reset();
    announcement.textContent = 'Numbers shuffled.';
  });
  method.addEventListener('change', reset);
  speed.addEventListener('change', () => { if (timer !== null) start(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop(); paint(); }
  });
  reset();
})();
