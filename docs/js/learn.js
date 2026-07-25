/* Interactive Learn Components */

// Live Code Editor (renders HTML/CSS/JS output in real-time)
function initLiveEditors() {
  document.querySelectorAll('.live-editor').forEach(function(editor) {
    var codeArea = editor.querySelector('.code-input');
    var outputFrame = editor.querySelector('.output-frame');
    var lang = editor.dataset.lang || 'html';
    var resetBtn = editor.querySelector('.editor-reset');
    var runBtn = editor.querySelector('.editor-run');
    var defaultCode = codeArea.value;

    function render() {
      var code = codeArea.value;
      var doc = outputFrame.contentDocument || outputFrame.contentWindow.document;
      if (lang === 'html') {
        doc.open();
        doc.write(code);
        doc.close();
      } else if (lang === 'css') {
        doc.open();
        doc.write('<html><head><style>' + code + '</style></head><body><div class="demo-box">Styled Element</div><p class="demo-text">Another paragraph</p><a href="#">Link</a><button>Button</button></body></html>');
        doc.close();
      } else if (lang === 'js') {
        doc.open();
        doc.write('<html><head><style>body{font-family:monospace;background:#0c0c14;color:#e8e8f0;padding:16px;font-size:14px;} .log{margin:4px 0;padding:4px 8px;border-radius:4px;} .log-log{color:#e8e8f0;} .log-info{color:#22d3ee;} .log-warn{color:#fb923c;} .log-error{color:#f87171;} pre{white-space:pre-wrap;}</style></head><body><div id="output"></div><script>var _out=document.getElementById(\"output\");var _log=[];function _add(cls,t){var d=document.createElement(\"div\");d.className=\"log \"+cls;d.textContent=t;_out.appendChild(d);}console.log=function(){_add(\"log-log\",Array.from(arguments).join(\" \"));};console.info=function(){_add(\"log-info\",Array.from(arguments).join(\" \"));};console.warn=function(){_add(\"log-warn\",Array.from(arguments).join(\" \"));};console.error=function(){_add(\"log-error\",Array.from(arguments).join(\" \"));};try{' + code + '}catch(e){_add(\"log-error\",e.toString());}<\/script></body></html>');
        doc.close();
      } else if (lang === 'python') {
        doc.open();
        doc.write('<html><head><style>body{font-family:monospace;background:#0c0c14;color:#e8e8f0;padding:16px;font-size:14px;white-space:pre-wrap;} .output{color:#34d399;} .error{color:#f87171;}</style></head><body><div class="output">' + simulatePython(code) + '</div></body></html>');
        doc.close();
      } else if (lang === 'swift') {
        doc.open();
        doc.write('<html><head><style>body{font-family:monospace;background:#0c0c14;color:#e8e8f0;padding:16px;font-size:14px;white-space:pre-wrap;} .output{color:#34d399;} .error{color:#f87171;}</style></head><body><div class="output">' + simulateSwift(code) + '</div></body></html>');
        doc.close();
      }
    }

    codeArea.addEventListener('input', render);
    if (runBtn) runBtn.addEventListener('click', render);
    if (resetBtn) resetBtn.addEventListener('click', function() {
      codeArea.value = defaultCode;
      render();
    });
    render();
  });
}

// Basic Python simulator for demos
function simulatePython(code) {
  var lines = code.split('\n');
  var output = [];
  var vars = {};
  lines.forEach(function(line) {
    line = line.trim();
    if (line.startsWith('#') || line === '' || line.startsWith('def ') || line.startsWith('class ') || line.startsWith('import ') || line.startsWith('from ')) return;
    // print()
    var printMatch = line.match(/^print\((.+)\)$/);
    if (printMatch) {
      var arg = printMatch[1].trim();
      if (arg.startsWith('"') || arg.startsWith("'")) {
        output.push(arg.replace(/^["']|["']$/g, ''));
      } else if (vars[arg] !== undefined) {
        output.push(String(vars[arg]));
      } else {
        output.push(arg.replace(/["']/g, ''));
      }
    }
    // Variable assignment
    var assignMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignMatch && !line.startsWith('print')) {
      var val = assignMatch[2].trim();
      if (val.startsWith('"') || val.startsWith("'")) {
        vars[assignMatch[1]] = val.replace(/^["']|["']$/g, '');
      } else if (!isNaN(val)) {
        vars[assignMatch[1]] = Number(val);
      } else {
        vars[assignMatch[1]] = val;
      }
    }
  });
  return output.length ? output.join('\n') : '<span style="color:#686880">// Output appears here</span>';
}

// Basic Swift simulator for demos
function simulateSwift(code) {
  var lines = code.split('\n');
  var output = [];
  var vars = {};
  lines.forEach(function(line) {
    line = line.trim();
    if (line.startsWith('//') || line === '' || line.startsWith('func ') || line.startsWith('struct ') || line.startsWith('class ') || line.startsWith('import ') || line.startsWith('enum ')) return;
    var printMatch = line.match(/^print\((.+)\)$/);
    if (printMatch) {
      var arg = printMatch[1].trim();
      if (arg.startsWith('"') || arg.startsWith("'")) {
        output.push(arg.replace(/^["']|["']$/g, ''));
      } else if (vars[arg] !== undefined) {
        output.push(String(vars[arg]));
      } else {
        output.push(arg.replace(/["']/g, ''));
      }
    }
    var letMatch = line.match(/^(?:let|var)\s+(\w+)\s*=\s*(.+)$/);
    if (letMatch) {
      var val = letMatch[2].trim();
      if (val.startsWith('"') || val.startsWith("'")) {
        vars[letMatch[1]] = val.replace(/^["']|["']$/g, '');
      } else if (!isNaN(val)) {
        vars[letMatch[1]] = Number(val);
      } else {
        vars[letMatch[1]] = val;
      }
    }
  });
  return output.length ? output.join('\n') : '<span style="color:#686880">// Output appears here</span>';
}

// Quiz component
function initQuizzes() {
  document.querySelectorAll('.quiz').forEach(function(quiz) {
    var correct = quiz.dataset.answer;
    var options = quiz.querySelectorAll('.quiz-option');
    var feedback = quiz.querySelector('.quiz-feedback');

    options.forEach(function(opt) {
      opt.addEventListener('click', function() {
        if (quiz.dataset.answered) return;
        quiz.dataset.answered = 'true';
        var chosen = this.dataset.value;
        if (chosen === correct) {
          this.classList.add('correct');
          feedback.textContent = '✓ Correct!';
          feedback.className = 'quiz-feedback correct';
        } else {
          this.classList.add('wrong');
          feedback.textContent = '✗ Not quite. The correct answer is: ' + correct;
          feedback.className = 'quiz-feedback wrong';
          options.forEach(function(o) {
            if (o.dataset.value === correct) o.classList.add('correct');
          });
        }
      });
    });
  });
}

// Tab groups for lesson navigation
function initLessonTabs() {
  document.querySelectorAll('.lesson-tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var group = this.closest('.lesson-tabs');
      var target = this.dataset.tab;
      group.querySelectorAll('.lesson-tab-btn').forEach(function(b) { b.classList.remove('active'); });
      group.querySelectorAll('.lesson-panel').forEach(function(p) { p.classList.remove('active'); });
      this.classList.add('active');
      group.querySelector('[data-panel="' + target + '"]').classList.add('active');
    });
  });
}

// Progress tracking (localStorage)
function initProgress() {
  var key = 'archon-learn-progress';
  document.querySelectorAll('.lesson-link').forEach(function(link) {
    var id = link.dataset.lesson;
    var progress = JSON.parse(localStorage.getItem(key) || '{}');
    if (progress[id]) {
      link.classList.add('completed');
      var badge = document.createElement('span');
      badge.className = 'check-mark';
      badge.textContent = '✓';
      link.appendChild(badge);
    }
    link.addEventListener('click', function() {
      var p = JSON.parse(localStorage.getItem(key) || '{}');
      p[this.dataset.lesson] = true;
      localStorage.setItem(key, JSON.stringify(p));
    });
  });
}

// Copy code button
function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var code = this.closest('.code-block').querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(function() {
        btn.textContent = '✓ Copied';
        setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
      });
    });
  });
}

// Init everything
document.addEventListener('DOMContentLoaded', function() {
  initLiveEditors();
  initQuizzes();
  initLessonTabs();
  initProgress();
  initCopyButtons();
});
