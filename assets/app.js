'use strict';

// Global state
const WORDS_URL = './data/words.json';
let words = [];
let currentWords = [];
let wordCount = 3;
let timerDuration = 30;
let timerRemaining = 0;
let timerInterval = null;
let totalScore = 0;
let currentLang = 'en';

const historyKey = 'clg_history';

// Tips
const tipsTPR = [
  'Act out throwing each word like a ninja star!',
  'Mime the action of the verb with your whole body.',
  'Pretend the noun is extremely heavy.',
  'Use your face to show the adjective strongly.'
];
const tipsExaggeration = [
  'Picture it 100 times bigger than normal.',
  'Imagine the word singing opera loudly.',
  'Think of the word wearing a silly costume.',
  'Visualize the word made of jelly.'
];
const tipPool = [...tipsTPR, ...tipsExaggeration];
let tipIdx = 0;

// i18n strings
const i18n = {
  en: {
    title: 'Chain Linking',
    newWords: 'New Words',
    hint: 'Hint',
    tpr: 'TPR idea',
    reset: 'Reset',
    check: 'Check',
    timer30: 'Timer:30s',
    timer60: 'Timer:60s',
    copyLink: 'Copy Round Link',
    score: 'Score:',
    history: 'Previous Attempts',
    storyPlaceholder: 'Write a funny story...',
    langButton: '日本語',
    feedbackSuccess: ['Fantastic! 😂', 'LOL! Great job!', 'Hilarious! 🎉'],
    feedbackFail: ['Try again! Missing: ', 'Oops! You forgot: '],
    timeUp: 'Time\'s up!',
    linkCopied: 'Link copied!'
  },
  jp: {
    title: '連想チェーン',
    newWords: '新しい言葉',
    hint: 'ヒント',
    tpr: 'TPR案',
    reset: 'リセット',
    check: 'チェック',
    timer30: 'タイマー:30秒',
    timer60: 'タイマー:60秒',
    copyLink: 'リンクをコピー',
    score: 'スコア:',
    history: '最近の挑戦',
    storyPlaceholder: '面白いストーリーを書いて…',
    langButton: 'English',
    feedbackSuccess: ['最高！😂', '爆笑！素晴らしい！', 'ナイスチェーン！🎉'],
    feedbackFail: ['もう一度！足りない：', 'あれ？忘れた：'],
    timeUp: '時間切れ！',
    linkCopied: 'リンクをコピーしました'
  }
};

document.addEventListener('DOMContentLoaded', init);

/**
 * Initialize the app: load word data, set up events, and start first round.
 */
function init() {
  fetch(WORDS_URL)
    .then(r => r.json())
    .then(data => {
      words = data;
      setupEvents();
      loadFromQuery();
      displayHistory();
      updateLang();
      showTip();
    })
    .catch(err => console.error('Failed to load words.json', err));
}

/**
 * Bind UI event listeners.
 */
function setupEvents() {
  document.getElementById('check').addEventListener('click', checkStory);
  document.getElementById('new-words').addEventListener('click', () => {
    currentWords = selectRandomWords(wordCount);
    resetRound();
  });
  document.getElementById('hint').addEventListener('click', showHint);
  document.getElementById('tpr').addEventListener('click', showTPRIdea);
  document.getElementById('reset').addEventListener('click', resetGame);
  document.getElementById('copy-link').addEventListener('click', copyLink);
  document.getElementById('word-plus').addEventListener('click', () => {
    if (wordCount < 5) {
      wordCount++;
      currentWords = selectRandomWords(wordCount);
      resetRound();
    }
  });
  document.getElementById('word-minus').addEventListener('click', () => {
    if (wordCount > 3) {
      wordCount--;
      currentWords = selectRandomWords(wordCount);
      resetRound();
    }
  });
  document.getElementById('lang-toggle').addEventListener('click', toggleLang);
  document.getElementById('timer-toggle').addEventListener('click', toggleTimer);
}

/**
 * Load words from URL query if present, otherwise start a new random round.
 */
function loadFromQuery() {
  const params = new URLSearchParams(location.search);
  const wParam = params.get('w');
  if (wParam) {
    const indices = wParam.split('-').map(n => parseInt(n, 10))
      .filter(n => !isNaN(n) && words[n]);
    currentWords = indices.map(i => ({ ...words[i], index: i }));
    wordCount = currentWords.length;
    displayWords();
    startTimer();
  } else {
    currentWords = selectRandomWords(wordCount);
    resetRound();
  }
}

/**
 * Reset round UI after selecting new words.
 */
function resetRound() {
  displayWords();
  document.getElementById('story').value = '';
  document.getElementById('feedback').textContent = '';
  showTip();
  startTimer();
  updateQuery();
}

/**
 * Choose random unique words.
 */
function selectRandomWords(count) {
  const used = new Set();
  const result = [];
  while (result.length < count && words.length > 0) {
    const idx = Math.floor(Math.random() * words.length);
    if (!used.has(idx)) {
      used.add(idx);
      result.push({ ...words[idx], index: idx });
    }
  }
  return result;
}

/**
 * Render current words on screen.
 */
function displayWords() {
  const list = document.getElementById('word-list');
  list.innerHTML = '';
  currentWords.forEach(w => {
    const div = document.createElement('div');
    div.className = 'word';
    div.textContent = `${w.jp} (${w.romaji}) - ${w.en}`;
    list.appendChild(div);
  });
  document.getElementById('word-count').textContent = currentWords.length;
}

/**
 * Check story for word inclusion and update score.
 */
function checkStory() {
  const storyEl = document.getElementById('story');
  const story = storyEl.value.trim();
  if (!story) return;

  const lower = story.toLowerCase();
  let used = 0;
  const missing = [];

  currentWords.forEach(w => {
    const jpUsed = story.includes(w.jp);
    const romajiUsed = lower.includes(w.romaji.toLowerCase());
    const enUsed = lower.includes(w.en.toLowerCase());
    if (jpUsed || romajiUsed || enUsed) used++;
    else missing.push(w.jp);
  });

  const card = document.getElementById('game-card');
  if (missing.length === 0) {
    const bonus = Math.floor(story.length / 40) + (story.match(/\p{Emoji}/gu) || []).length;
    const roundScore = used + bonus;
    totalScore += roundScore;
    document.getElementById('feedback').textContent =
      randomItem(i18n[currentLang].feedbackSuccess) + ` (+${roundScore})`;
    document.getElementById('score').textContent = totalScore;
    card.classList.add('success');
    emojiBurst();
  } else {
    document.getElementById('feedback').textContent =
      randomItem(i18n[currentLang].feedbackFail) + missing.join(', ');
    card.classList.add('fail');
  }

  saveAttempt(story);
  displayHistory();

  setTimeout(() => card.classList.remove('success', 'fail'), 600);
}

/**
 * Create an example chain story hint.
 */
function showHint() {
  if (!currentWords.length) return;
  const en = currentWords.map(w => w.en);
  let hint = '';
  if (en.length === 3) {
    hint = `The ${en[0]} ${en[1]}s with a ${en[2]}.`;
  } else if (en.length === 4) {
    hint = `A ${en[0]} ${en[1]}s while the ${en[2]} meets the ${en[3]}.`;
  } else {
    hint = `When the ${en[0]} ${en[1]}s, the ${en[2]} and ${en[3]} admire a ${en[4]}.`;
  }
  document.getElementById('feedback').textContent = hint;
}

/**
 * Show a random TPR idea.
 */
function showTPRIdea() {
  document.getElementById('tip').textContent = randomItem(tipsTPR);
}

/**
 * Toggle language.
 */
function toggleLang() {
  currentLang = currentLang === 'en' ? 'jp' : 'en';
  updateLang();
}

/**
 * Update UI text for current language.
 */
function updateLang() {
  document.getElementById('title').textContent = i18n[currentLang].title;
  document.getElementById('new-words').textContent = i18n[currentLang].newWords;
  document.getElementById('hint').textContent = i18n[currentLang].hint;
  document.getElementById('tpr').textContent = i18n[currentLang].tpr;
  document.getElementById('reset').textContent = i18n[currentLang].reset;
  document.getElementById('check').textContent = i18n[currentLang].check;
  document.getElementById('copy-link').textContent = i18n[currentLang].copyLink;
  document.getElementById('score-label').textContent = i18n[currentLang].score;
  document.getElementById('history-title').textContent = i18n[currentLang].history;
  document.getElementById('story').placeholder = i18n[currentLang].storyPlaceholder;
  document.getElementById('lang-toggle').textContent = i18n[currentLang].langButton;
  const timerBtn = document.getElementById('timer-toggle');
  timerBtn.textContent = timerDuration === 30 ? i18n[currentLang].timer30 : i18n[currentLang].timer60;
  if (timerRemaining > 0) {
    document.getElementById('timer').textContent = `${timerRemaining}s`;
  }
}

/**
 * Toggle timer duration between 30s and 60s.
 */
function toggleTimer() {
  timerDuration = timerDuration === 30 ? 60 : 30;
  startTimer();
  updateLang();
}

/**
 * Start or restart the round timer.
 */
function startTimer() {
  clearInterval(timerInterval);
  timerRemaining = timerDuration;
  const timerEl = document.getElementById('timer');
  timerEl.textContent = `${timerRemaining}s`;
  timerInterval = setInterval(() => {
    timerRemaining--;
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerEl.textContent = i18n[currentLang].timeUp;
    } else {
      timerEl.textContent = `${timerRemaining}s`;
    }
  }, 1000);
}

/**
 * Show rotating tip text.
 */
function showTip() {
  const tip = tipPool[tipIdx % tipPool.length];
  document.getElementById('tip').textContent = tip;
  tipIdx++;
}

/**
 * Save attempt to localStorage.
 */
function saveAttempt(story) {
  const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
  history.unshift({
    words: currentWords.map(w => w.jp),
    story,
    time: Date.now()
  });
  localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 10)));
}

/**
 * Render attempt history.
 */
function displayHistory() {
  const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
  const ul = document.getElementById('history');
  ul.innerHTML = '';
  history.forEach(h => {
    const li = document.createElement('li');
    const date = new Date(h.time).toLocaleDateString();
    li.textContent = `[${date}] ${h.words.join(', ')} - ${h.story.slice(0, 30)}`;
    ul.appendChild(li);
  });
}

/**
 * Clear game state.
 */
function resetGame() {
  totalScore = 0;
  document.getElementById('score').textContent = '0';
  localStorage.removeItem(historyKey);
  displayHistory();
  currentWords = selectRandomWords(wordCount);
  resetRound();
}

/**
 * Update URL with current word indices for sharing.
 */
function updateQuery() {
  const indices = currentWords.map(w => w.index).join('-');
  history.replaceState(null, '', `${location.pathname}?w=${indices}`);
}

/**
 * Copy round link to clipboard.
 */
function copyLink() {
  navigator.clipboard && navigator.clipboard.writeText(location.href)
    .then(() => {
      document.getElementById('feedback').textContent = i18n[currentLang].linkCopied;
    })
    .catch(() => { /* ignore */ });
}

/**
 * Generate emoji burst on success.
 */
function emojiBurst() {
  const container = document.getElementById('emoji-container');
  const emojis = ['😂', '🎉', '✨', '😄', '🥳'];
  for (let i = 0; i < 10; i++) {
    const span = document.createElement('span');
    span.className = 'burst';
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.style.left = (Math.random() * 80 + 10) + '%';
    span.style.animationDelay = (Math.random() * 0.5) + 's';
    container.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
  }
}

/**
 * Utility: get random item from array.
 */
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
