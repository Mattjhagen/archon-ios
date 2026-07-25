/* Archon Learn — Gamification System */

const ARCHON_COLORS = {
  accent: '#8b5cf6',
  green: '#34d399',
  cyan: '#22d3ee',
  orange: '#fb923c',
  red: '#f87171',
};

const LANGUAGES = ['html', 'css', 'ts', 'py', 'swift'];
const LESSONS_PER_LANG = 5;
const TOTAL_LESSONS = LESSONS_PER_LANG * LANGUAGES.length;

const LESSON_IDS = {
  html: ['html-01', 'html-02', 'html-03', 'html-04', 'html-05'],
  css: ['css-01', 'css-02', 'css-03', 'css-04', 'css-05'],
  ts: ['ts-01', 'ts-02', 'ts-03', 'ts-04', 'ts-05'],
  py: ['py-01', 'py-02', 'py-03', 'py-04', 'py-05'],
  swift: ['swift-01', 'swift-02', 'swift-03', 'swift-04', 'swift-05'],
};

const ACHIEVEMENTS = {
  first_steps: { name: 'First Steps', desc: 'Complete your first lesson', icon: '👣' },
  quiz_whiz: { name: 'Quiz Whiz', desc: '5 correct answers in a row', icon: '🧠' },
  polyglot: { name: 'Polyglot', desc: 'Complete a lesson in 3 different languages', icon: '🌍' },
  perfectionist: { name: 'Perfectionist', desc: '10 correct answers in a row', icon: '💎' },
  scholar: { name: 'Scholar', desc: 'Complete all lessons in one language', icon: '📚' },
  grandmaster: { name: 'Grandmaster', desc: 'Complete all lessons in all languages', icon: '👑' },
  speed_learner: { name: 'Speed Learner', desc: 'Complete 3 lessons in one session', icon: '⚡' },
  night_owl: { name: 'Night Owl', desc: 'Complete a lesson after 10pm', icon: '🦉' },
  early_bird: { name: 'Early Bird', desc: 'Complete a lesson before 7am', icon: '🐦' },
};

const STORAGE_KEY = 'archon-learn-gamification';
const PROGRESS_KEY = 'archon-learn-progress';

function createDefaultState() {
  return {
    totalXP: 0,
    languageXP: { html: 0, css: 0, ts: 0, py: 0, swift: 0 },
    completedLessons: [],
    quizCorrect: 0,
    quizTotal: 0,
    streak: 0,
    bestStreak: 0,
    achievements: [],
    sessionLessons: 0,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    const defaults = createDefaultState();
    return { ...defaults, ...parsed, languageXP: { ...defaults.languageXP, ...parsed.languageXP } };
  } catch {
    return createDefaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function detectLanguage(lessonId) {
  if (!lessonId) return null;
  const prefix = lessonId.split('-')[0];
  if (prefix === 'html') return 'html';
  if (prefix === 'css') return 'css';
  if (prefix === 'ts') return 'ts';
  if (prefix === 'py') return 'py';
  if (prefix === 'swift') return 'swift';
  return null;
}

function getHours() {
  return new Date().getHours();
}

function showFloatingXP(amount, anchorEl) {
  if (!anchorEl) return;
  const rect = anchorEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'archon-xp-popup';
  el.textContent = `+${amount} XP`;
  el.style.cssText = `
    position: fixed;
    left: ${rect.left + rect.width / 2}px;
    top: ${rect.top}px;
    transform: translateX(-50%);
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: ${ARCHON_COLORS.green};
    pointer-events: none;
    z-index: 10000;
    text-shadow: 0 0 8px rgba(52,211,153,0.4);
    animation: archon-xp-float 1.2s ease-out forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function injectXPKeyframes() {
  if (document.getElementById('archon-xp-styles')) return;
  const style = document.createElement('style');
  style.id = 'archon-xp-styles';
  style.textContent = `
    @keyframes archon-xp-float {
      0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
    }
  `;
  document.head.appendChild(style);
}

function showToast(achievementKey) {
  const data = ACHIEVEMENTS[achievementKey];
  if (!data) return;

  const toast = document.createElement('div');
  toast.className = 'archon-toast';
  toast.innerHTML = `
    <span class="archon-toast-icon">${data.icon}</span>
    <span class="archon-toast-body">
      <strong class="archon-toast-title">${data.name}</strong>
      <span class="archon-toast-desc">${data.desc}</span>
    </span>
  `;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: rgba(12,12,20,0.92);
    border: 1px solid ${ARCHON_COLORS.accent};
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(139,92,246,0.25);
    font-family: 'Inter', sans-serif;
    color: #e8e8f0;
    z-index: 10001;
    transform: translateX(120%);
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    max-width: 320px;
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function fireConfetti(originEl) {
  const colors = Object.values(ARCHON_COLORS);
  const count = 18;
  const cx = originEl
    ? originEl.getBoundingClientRect().left + originEl.getBoundingClientRect().width / 2
    : window.innerWidth / 2;
  const cy = originEl
    ? originEl.getBoundingClientRect().top
    : window.innerHeight / 2;

  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    const size = 6 + Math.random() * 6;
    const angle = (Math.PI * 2 * i) / count;
    const dist = 40 + Math.random() * 80;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 30;
    dot.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      pointer-events: none;
      z-index: 10002;
      animation: archon-confetti-burst 0.8s ease-out forwards;
      --dx: ${dx}px;
      --dy: ${dy}px;
    `;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 900);
  }
}

function injectConfettiKeyframes() {
  if (document.getElementById('archon-confetti-styles')) return;
  const style = document.createElement('style');
  style.id = 'archon-confetti-styles';
  style.textContent = `
    @keyframes archon-confetti-burst {
      0%   { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(360deg) scale(0.3); }
    }
  `;
  document.head.appendChild(style);
}

function checkAchievements(state, context) {
  const newlyUnlocked = [];

  const unlock = (key) => {
    if (!state.achievements.includes(key)) {
      state.achievements.push(key);
      newlyUnlocked.push(key);
    }
  };

  if (state.completedLessons.length >= 1) unlock('first_steps');
  if (state.bestStreak >= 5) unlock('quiz_whiz');
  if (state.bestStreak >= 10) unlock('perfectionist');
  if (state.sessionLessons >= 3) unlock('speed_learner');
  if (state.completedLessons.length >= TOTAL_LESSONS) unlock('grandmaster');

  const langsCompleted = new Set();
  LANGUAGES.forEach((lang) => {
    const ids = LESSON_IDS[lang];
    if (ids && ids.every((id) => state.completedLessons.includes(id))) {
      langsCompleted.add(lang);
    }
  });
  if (langsCompleted.size >= 3) unlock('polyglot');
  if (langsCompleted.size >= 1) unlock('scholar');

  const hour = getHours();
  if (context === 'lesson' && hour >= 22) unlock('night_owl');
  if (context === 'lesson' && hour < 7) unlock('early_bird');

  return newlyUnlocked;
}

function renderStatsBar(state) {
  const container = document.getElementById('learn-stats');
  if (!container) return;

  const completed = state.completedLessons.length;
  container.innerHTML = `
    <div class="archon-stats-bar">
      <div class="archon-stat">
        <span class="archon-stat-icon">🔥</span>
        <span class="archon-stat-value">${state.totalXP.toLocaleString()}</span>
        <span class="archon-stat-label">Total XP</span>
      </div>
      <div class="archon-stat">
        <span class="archon-stat-icon">📖</span>
        <span class="archon-stat-value">${completed}/${TOTAL_LESSONS}</span>
        <span class="archon-stat-label">Lessons</span>
      </div>
      <div class="archon-stat">
        <span class="archon-stat-icon">🔥</span>
        <span class="archon-stat-value">${state.bestStreak}</span>
        <span class="archon-stat-label">Best Streak</span>
      </div>
      <div class="archon-stat">
        <span class="archon-stat-icon">🏆</span>
        <span class="archon-stat-value">${state.achievements.length}/${Object.keys(ACHIEVEMENTS).length}</span>
        <span class="archon-stat-label">Achievements</span>
      </div>
    </div>
  `;
}

function injectStatsBarStyles() {
  if (document.getElementById('archon-stats-styles')) return;
  const style = document.createElement('style');
  style.id = 'archon-stats-styles';
  style.textContent = `
    .archon-stats-bar {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
      padding: 16px 20px;
      margin-bottom: 24px;
      background: rgba(20,20,35,0.6);
      border: 1px solid rgba(139,92,246,0.15);
      border-radius: 12px;
    }
    .archon-stat {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Inter', sans-serif;
      color: #c8c8d8;
      font-size: 14px;
    }
    .archon-stat-icon { font-size: 16px; }
    .archon-stat-value { font-weight: 700; color: #e8e8f0; }
    .archon-stat-label { font-size: 12px; opacity: 0.6; }
    .archon-progress-bar {
      margin: 8px 0 20px;
    }
    .archon-progress-label {
      display: flex;
      justify-content: space-between;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: #a8a8b8;
      margin-bottom: 6px;
    }
    .archon-progress-track {
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 3px;
      overflow: hidden;
    }
    .archon-progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .archon-streak-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: rgba(251,146,60,0.15);
      border: 1px solid rgba(251,146,60,0.3);
      border-radius: 999px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: ${ARCHON_COLORS.orange};
      margin-left: 8px;
      vertical-align: middle;
    }
  `;
  document.head.appendChild(style);
}

function renderLanguageProgress(state) {
  const cards = document.querySelectorAll('.path-card');
  if (!cards.length) return;

  cards.forEach((card) => {
    const href = card.getAttribute('href') || '';
    const langMatch = href.match(/\/(\w+)\//);
    if (!langMatch) return;
    const lang = langMatch[1];
    if (!LESSON_IDS[lang]) return;

    const ids = LESSON_IDS[lang];
    const completedCount = ids.filter((id) => state.completedLessons.includes(id)).length;
    const pct = Math.round((completedCount / LESSONS_PER_LANG) * 100);

    const color =
      lang === 'html' ? ARCHON_COLORS.orange :
      lang === 'css'  ? ARCHON_COLORS.cyan :
      lang === 'ts'   ? ARCHON_COLORS.accent :
      lang === 'py'   ? ARCHON_COLORS.green :
                         ARCHON_COLORS.red;

    const existing = card.querySelector('.archon-progress-bar');
    if (existing) existing.remove();

    const bar = document.createElement('div');
    bar.className = 'archon-progress-bar';
    bar.innerHTML = `
      <div class="archon-progress-label">
        <span>${completedCount}/${LESSONS_PER_LANG} lessons</span>
        <span>${pct}%</span>
      </div>
      <div class="archon-progress-track">
        <div class="archon-progress-fill" style="width:${pct}%;background:${color};"></div>
      </div>
    `;
    card.appendChild(bar);
  });
}

function injectStreakBadge(state) {
  document.querySelectorAll('.archon-streak-badge').forEach((b) => b.remove());
  if (state.streak < 3) return;

  document.querySelectorAll('.quiz-feedback.correct').forEach((fb) => {
    if (fb.querySelector('.archon-streak-badge')) return;
    const badge = document.createElement('span');
    badge.className = 'archon-streak-badge';
    badge.textContent = `🔥 ${state.streak} streak`;
    fb.appendChild(badge);
  });
}

export function initGamification() {
  const state = loadState();

  injectXPKeyframes();
  injectConfettiKeyframes();
  injectStatsBarStyles();

  renderStatsBar(state);
  renderLanguageProgress(state);

  /* --- Quiz answer tracking --- */
  document.addEventListener('click', (e) => {
    const option = e.target.closest('.quiz-option');
    if (!option) return;
    const quiz = option.closest('.quiz');
    if (!quiz || quiz.dataset.answered) return;

    const correct = quiz.dataset.answer === option.dataset.value;
    state.quizTotal += 1;

    if (correct) {
      state.quizCorrect += 1;
      state.streak += 1;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;

      let xp = 25;
      if (state.streak >= 3) xp += (state.streak - 2) * 10;
      state.totalXP += xp;

      const lang = detectLanguage(quiz.dataset.lesson || quiz.closest('[data-lesson]')?.dataset?.lesson);
      if (lang && state.languageXP[lang] !== undefined) state.languageXP[lang] += xp;

      showFloatingXP(xp, option);
    } else {
      state.streak = 0;
    }

    saveState(state);

    requestAnimationFrame(() => {
      injectStreakBadge(state);
      const achievements = checkAchievements(state, 'quiz');
      achievements.forEach((key) => {
        showToast(key);
        fireConfetti(option);
      });
      renderStatsBar(state);
      saveState(state);
    });
  });

  /* --- Lesson completion tracking --- */
  const observeProgress = () => {
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    Object.keys(progress).forEach((lessonId) => {
      if (progress[lessonId] && !state.completedLessons.includes(lessonId)) {
        trackLessonCompletion(state, lessonId);
      }
    });
  };

  const observeStorage = () => {
    window.addEventListener('storage', (e) => {
      if (e.key === PROGRESS_KEY) observeProgress();
    });
  };

  observeProgress();
  observeStorage();

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.lesson-link');
    if (!link) return;
    const id = link.dataset.lesson;
    if (!id) return;

    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    progress[id] = true;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));

    if (!state.completedLessons.includes(id)) {
      trackLessonCompletion(state, id);
    }
  });

  function trackLessonCompletion(state, lessonId) {
    if (state.completedLessons.includes(lessonId)) return;

    state.completedLessons.push(lessonId);
    state.totalXP += 50;
    state.sessionLessons += 1;

    const lang = detectLanguage(lessonId);
    if (lang && state.languageXP[lang] !== undefined) state.languageXP[lang] += 50;

    saveState(state);

    requestAnimationFrame(() => {
      renderStatsBar(state);
      renderLanguageProgress(state);

      const achievements = checkAchievements(state, 'lesson');
      achievements.forEach((key) => {
        showToast(key);
        fireConfetti(document.body);
      });
      saveState(state);
    });
  }

  return state;
}

document.addEventListener('DOMContentLoaded', () => {
  initGamification();
});
