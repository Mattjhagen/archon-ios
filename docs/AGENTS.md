# Archon iOS — Docs Site Changelog & Plans

## Recent Changes

### v2.2 — Collapsible Submenus, Bug Fixes, Cloudflare Pages (July 2026)

#### Bug Fixes
- **Gamification JS rewrite**: Added Java to LANGUAGES/LESSON_IDS, removed broken `export` keyword, fixed quiz XP race condition (dataset.answered check vs delegated handler), added try/catch around all localStorage/JSON.parse, fixed toast stacking overlap, reset sessionLessons per page load
- **Java simulator rewrite**: Handles string concatenation (`"text" + var`), `final` keyword, `char` literals, variable replacement in expressions
- **Sidebar links**: Added `lesson-link` class to all 31 active sidebar links so progress saves correctly
- **Hero background**: Added `position: relative` to `.main` so `.learn-hero-bg` renders properly
- **Nav links**: Added `Learn` link to header nav on all pages, removed 31 duplicate Learn links

#### Collapsible Sidebar Submenus
- New `js/sidebar.js` — Toggle groups open/closed with ▾ chevron, state saved to localStorage
- CSS: `.sidebar-group.collapsed .sidebar-group-items { display: none }` with smooth transitions
- All sidebar links wrapped in `.sidebar-group-items` divs across 56 HTML files

#### Cloudflare Pages Deployment
- Project: `archon-docs` at https://relayapp.pro
- Custom domain: `relayapp.pro` (set up via dashboard)
- Deploy: `CLOUDFLARE_API_TOKEN=... npx wrangler pages deploy docs --project-name=archon-docs --commit-dirty=true`
- Build output dir: `docs` (no build step, pure static)
- `_headers` and `_redirects` files configured for caching and security

### v2.0 — Gamified Learning Platform (July 2026)

#### New: Java Fundamentals Module
- `learn/java/01-what-is-java.html` — What is Java? (JVM, platform independence, basic structure)
- `learn/java/02-variables-types.html` — Variables & Types (primitives, casting, final keyword)
- `learn/java/03-oop-basics.html` — OOP Basics (classes, objects, constructors, this keyword)
- `learn/java/04-collections.html` — Collections (ArrayList, HashMap, iteration, generics)
- `learn/java/05-streams-lambdas.html` — Streams & Lambdas (functional interfaces, filter, map, method refs)

#### New: Gamification System
- **XP Scoring**: +25 XP per correct quiz answer, +50 XP per lesson completion, streak bonuses
- **Streak Tracking**: Consecutive correct answers with fire badge at 3+, resets on wrong answer
- **9 Achievement Badges**: First Steps, Quiz Whiz, Polyglot, Perfectionist, Scholar, Grandmaster, Speed Learner, Night Owl, Early Bird
- **Floating XP Popups**: Animated "+25 XP" text that floats up and fades on quiz correct
- **Toast Notifications**: Slide-in achievement unlock notifications with auto-dismiss
- **Confetti Burst**: Particle animation on achievement unlock using design system colors
- **Stats Bar**: Total XP, lessons completed (X/30), best streak, achievements on learn/index.html
- **Language Progress Bars**: Per-language progress bars on path cards showing X/5 lessons
- **localStorage Persistence**: All scores, progress, and achievements saved locally

#### New Files
- `css/learn-gamification.css` — All gamification styles, animations, and responsive layouts
- `js/learn-gamification.js` — Complete gamification engine (XP, badges, streaks, confetti, toasts)

#### Updated Files
- `learn/index.html` — Added Java module card, gamification stats container, animated hero background
- `css/docs.css` — Added `.lang-badge.java` style
- `js/learn.js` — Added Java code simulator for live editors
- All 30 existing lesson pages — Added gamification CSS/JS references, Java sidebar link

#### Design Tokens (Matching Archon iOS App)
- Background: `#06060a` (void), `#0c0c14` (secondary), `#12121e` (tertiary)
- Accent: `#7c5cfc` (purple), `#9078ff` (hover)
- Semantic: `#34d399` (green), `#f87171` (red), `#fb923c` (orange), `#22d3ee` (cyan)
- Borders: `#1a1a2e` (default), `#252540` (light)
- Typography: Inter (sans), JetBrains Mono (code)
- All animations respect `prefers-reduced-motion`

---

## Planned Features

### v2.1 — Enhanced Learning Experience
- [ ] **Code Challenges with Validation**: Check user code output against expected results
- [ ] **Learning Paths**: Curated sequences (e.g., "Web Dev Beginner", "iOS Developer")
- [ ] **Leaderboard**: Local leaderboard comparing XP across sessions
- [ ] **Daily Streaks**: Bonus XP for consecutive daily learning sessions
- [ ] **Hint System**: Progressive hints for challenge boxes
- [ ] **Video Embed Support**: Embed tutorial videos in lessons

### v2.2 — Additional Languages
- [ ] **Rust Fundamentals** — Ownership, borrowing, lifetimes, pattern matching
- [ ] **Go Basics** — Goroutines, channels, interfaces, error handling
- [ ] **Kotlin for Android** — Null safety, coroutines, data classes, extension functions
- [ ] **SQL Fundamentals** — Queries, joins, indexes, database design

### v2.3 — Social & Sharing
- [ ] **Share Progress**: Share XP and achievements via URL
- [ ] **Course Completion Certificates**: Generate shareable completion badges
- [ ] **Community Challenges**: Weekly coding challenges

### v2.4 — Advanced Features
- [ ] **AI-Powered Hints**: Use AI to generate contextual hints for challenges
- [ ] **Code Review Mode**: Compare user code with optimal solutions
- [ ] **Offline Mode**: Service worker for offline lesson access
- [ ] **Dark/Light Theme Toggle**: Match Archon app's appearance modes

---

## Architecture

```
docs/
├── css/
│   ├── docs.css                    # Core design system
│   ├── ascii-header.css            # ASCII header animations
│   └── learn-gamification.css      # Gamification styles
├── js/
│   ├── docs.js                     # Core interactions (accordion, tabs, sidebar)
│   ├── learn.js                    # Live editors, quizzes, progress
│   ├── learn-gamification.js       # XP, badges, streaks, confetti
│   ├── sidebar.js                  # Collapsible submenu toggles
│   └── ascii-header.js             # ASCII header animation engine
├── learn/
│   ├── index.html                  # Learn hub with stats + language cards
│   ├── html/ (5 lessons)
│   ├── css/ (5 lessons)
│   ├── typescript/ (5 lessons)
│   ├── python/ (5 lessons)
│   ├── swift/ (5 lessons)
│   └── java/ (5 lessons)
├── features/ (5 pages)
├── dev-docs/ (14 pages)
└── [root pages] (6 pages)
```

**Total lesson count**: 35 lessons across 7 languages (5 per language)
**Total page count**: ~56 HTML pages
**Deployment**: Cloudflare Pages at `relayapp.pro` (project: `archon-docs`)
