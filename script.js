const timeDisplay = document.querySelector('#timeDisplay');
const startButton = document.querySelector('#startButton');
const resetButton = document.querySelector('#resetButton');
const soundButton = document.querySelector('#soundButton');
const statusLabel = document.querySelector('#status');
const ringProgress = document.querySelector('#ringProgress');
const customTimeForm = document.querySelector('#customTimeForm');
const customMinutes = document.querySelector('#customMinutes');
const presetButtons = [...document.querySelectorAll('.preset')];
const modeButtons = [...document.querySelectorAll('.mode-button')];
const countdownSettings = document.querySelector('#countdownSettings');
const timerTitle = document.querySelector('#timerTitle');

const circumference = 2 * Math.PI * 145;
let totalSeconds = 5 * 60;
let remainingSeconds = totalSeconds;
let running = false;
let endTime = null;
let intervalId = null;
let soundEnabled = true;
let mode = 'countdown';
let stopwatchElapsedMs = 0;
let stopwatchStartedAt = null;

ringProgress.style.strokeDasharray = circumference;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function render() {
  const displaySeconds = mode === 'countdown'
    ? remainingSeconds
    : Math.floor(stopwatchElapsedMs / 1000);
  timeDisplay.textContent = formatTime(displaySeconds);
  document.title = `${formatTime(displaySeconds)} — Focus Timer`;
  const progress = mode === 'countdown' && totalSeconds ? remainingSeconds / totalSeconds : 1;
  ringProgress.style.strokeDashoffset = mode === 'countdown' ? circumference * (1 - progress) : 0;
  resetButton.disabled = mode === 'countdown'
    ? remainingSeconds === totalSeconds && !running
    : stopwatchElapsedMs === 0 && !running;
}

function setStatus(mode) {
  statusLabel.className = `status ${mode === 'READY' ? '' : mode.toLowerCase()}`;
  statusLabel.innerHTML = `<span></span> ${mode}`;
}

function setRunningUI(isRunning) {
  startButton.classList.toggle('running', isRunning);
  startButton.querySelector('span').textContent = isRunning ? '一時停止' : 'スタート';
  const hasProgress = mode === 'countdown' ? remainingSeconds < totalSeconds : stopwatchElapsedMs > 0;
  setStatus(isRunning ? 'RUNNING' : hasProgress ? 'PAUSED' : 'READY');
}

function updateTimer() {
  if (mode === 'countdown') {
    remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  } else {
    stopwatchElapsedMs = Date.now() - stopwatchStartedAt;
  }
  render();
  if (mode === 'countdown' && remainingSeconds === 0) finishTimer();
}

function startTimer() {
  running = true;
  if (mode === 'countdown') {
    if (remainingSeconds === 0) remainingSeconds = totalSeconds;
    endTime = Date.now() + remainingSeconds * 1000;
  } else {
    stopwatchStartedAt = Date.now() - stopwatchElapsedMs;
  }
  clearInterval(intervalId);
  intervalId = setInterval(updateTimer, 250);
  setRunningUI(true);
  render();
}

function pauseTimer() {
  if (!running) return;
  updateTimer();
  running = false;
  clearInterval(intervalId);
  setRunningUI(false);
}

function resetTimer() {
  running = false;
  clearInterval(intervalId);
  if (mode === 'countdown') {
    remainingSeconds = totalSeconds;
  } else {
    stopwatchElapsedMs = 0;
    stopwatchStartedAt = null;
  }
  setRunningUI(false);
  render();
}

function toggleTimer() {
  running ? pauseTimer() : startTimer();
}

function finishTimer() {
  running = false;
  clearInterval(intervalId);
  setStatus('DONE');
  setRunningUI(false);
  statusLabel.className = 'status running';
  statusLabel.innerHTML = '<span></span> COMPLETE';
  if (soundEnabled) playChime();
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Focus Timer', { body: '設定した時間が終了しました。' });
  }
}

function setDuration(minutes) {
  totalSeconds = minutes * 60;
  remainingSeconds = totalSeconds;
  running = false;
  clearInterval(intervalId);
  presetButtons.forEach(button => {
    button.classList.toggle('active', Number(button.dataset.minutes) === minutes);
  });
  setRunningUI(false);
  render();
}

function switchMode(nextMode) {
  if (mode === nextMode) return;
  if (running) pauseTimer();
  mode = nextMode;
  modeButtons.forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  countdownSettings.classList.toggle('hidden', mode === 'stopwatch');
  timerTitle.textContent = mode === 'countdown' ? 'COUNTDOWN TIMER' : 'STOPWATCH';
  setRunningUI(false);
  render();
}

function playChime() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  [0, 0.18, 0.36].forEach((delay, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = [660, 880, 990][index];
    gain.gain.setValueAtTime(0, context.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.15, context.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delay + 0.45);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + delay);
    oscillator.stop(context.currentTime + delay + 0.48);
  });
}

startButton.addEventListener('click', () => {
  toggleTimer();
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

resetButton.addEventListener('click', resetTimer);

presetButtons.forEach(button => {
  button.addEventListener('click', () => setDuration(Number(button.dataset.minutes)));
});

customTimeForm.addEventListener('submit', event => {
  event.preventDefault();
  const minutes = Number(customMinutes.value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
    customMinutes.setCustomValidity('1〜180の整数を入力してください');
    customMinutes.reportValidity();
    return;
  }
  customMinutes.setCustomValidity('');
  setDuration(minutes);
  customMinutes.blur();
});

customMinutes.addEventListener('input', () => customMinutes.setCustomValidity(''));

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundButton.classList.toggle('muted', !soundEnabled);
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.setAttribute('aria-label', soundEnabled ? '通知音をオフにする' : '通知音をオンにする');
});

modeButtons.forEach(button => {
  button.addEventListener('click', () => switchMode(button.dataset.mode));
});

document.addEventListener('keydown', event => {
  if (event.target.matches('input')) return;
  if (event.code === 'Space') {
    event.preventDefault();
    toggleTimer();
  }
  if (event.key.toLowerCase() === 'r') resetTimer();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && running) updateTimer();
});

render();
