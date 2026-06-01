/**
 * CODEBASE-TO-COURSE — COMPLETE JS ENGINE
 * Copy this file verbatim into the course output directory.
 * Never regenerate it. It handles all interactivity generically.
 *
 * Engines included:
 *  - Navigation & progress bar
 *  - Scroll-triggered reveal animations
 *  - Keyboard navigation
 *  - Glossary tooltips
 *  - Quiz (multiple-choice & scenario)
 *  - Drag-and-drop matching
 *  - Group chat animation
 *  - Data flow / message flow animation
 *  - Architecture diagram
 *  - "Spot the bug" challenge
 *  - Layer toggle
 */
(function () {
  'use strict';

  /* ── HELPERS ──────────────────────────────────────────────── */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ── NAVIGATION & PROGRESS BAR ────────────────────────────── */
  const progressBar = $('#progress-bar');
  const navDots     = $$('.nav-dot');
  const modules     = $$('.module');

  function updateProgress() {
    if (!progressBar) return;
    const scrollTop    = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct          = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', Math.round(pct));
    updateNavDots();
  }

  function updateNavDots() {
    const scrollMid = window.scrollY + window.innerHeight / 2;
    modules.forEach((mod, i) => {
      const dot = navDots[i];
      if (!dot) return;
      const top    = mod.offsetTop;
      const bottom = top + mod.offsetHeight;
      if (scrollMid >= top && scrollMid < bottom) {
        dot.classList.add('active');
        dot.classList.remove('visited');
      } else if (window.scrollY + window.innerHeight > top) {
        dot.classList.remove('active');
        dot.classList.add('visited');
      } else {
        dot.classList.remove('active', 'visited');
      }
    });
  }

  window.addEventListener('scroll', () => requestAnimationFrame(updateProgress), { passive: true });
  updateProgress();

  // Nav dot click → scroll to module
  navDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const target = $('#' + dot.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ── KEYBOARD NAVIGATION ───────────────────────────────────── */
  function currentModuleIndex() {
    const scrollMid = window.scrollY + window.innerHeight / 2;
    for (let i = 0; i < modules.length; i++) {
      const top    = modules[i].offsetTop;
      const bottom = top + modules[i].offsetHeight;
      if (scrollMid >= top && scrollMid < bottom) return i;
    }
    return 0;
  }

  document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      const next = modules[currentModuleIndex() + 1];
      if (next) { next.scrollIntoView({ behavior: 'smooth' }); e.preventDefault(); }
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      const prev = modules[currentModuleIndex() - 1];
      if (prev) { prev.scrollIntoView({ behavior: 'smooth' }); e.preventDefault(); }
    }
  });

  /* ── SCROLL-TRIGGERED REVEAL ───────────────────────────────── */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  $$('.animate-in').forEach(el => revealObserver.observe(el));

  // Stagger children
  $$('.stagger-children').forEach(parent => {
    Array.from(parent.children).forEach((child, i) => {
      child.style.setProperty('--stagger-index', i);
    });
  });

  /* ── GLOSSARY TOOLTIPS ─────────────────────────────────────── */
  let activeTooltip = null;
  let tooltipHideTimer = null;

  function positionTooltip(term, tip) {
    const rect     = term.getBoundingClientRect();
    const tipWidth = Math.min(520, Math.max(240, window.innerWidth - 16));
    let left = rect.left + rect.width / 2 - tipWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipWidth - 8));
    tip.style.left  = left + 'px';
    tip.style.width = tipWidth + 'px';
    document.body.appendChild(tip);
    const tipHeight = tip.offsetHeight;
    if (rect.top - tipHeight - 12 < 0) {
      tip.style.top = Math.min(rect.bottom + 8, window.innerHeight - tipHeight - 8) + 'px';
      tip.classList.add('flip');
    } else {
      tip.style.top = Math.max(8, rect.top - tipHeight - 8) + 'px';
      tip.classList.remove('flip');
    }
  }

  function showTooltip(term, tip) {
    clearTimeout(tooltipHideTimer);
    if (activeTooltip && activeTooltip !== tip) {
      activeTooltip.classList.remove('visible');
      activeTooltip.remove();
    }
    positionTooltip(term, tip);
    requestAnimationFrame(() => tip.classList.add('visible'));
    activeTooltip = tip;
  }

  function hideTooltip(tip) {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = setTimeout(() => {
      tip.classList.remove('visible');
      setTimeout(() => { if (!tip.classList.contains('visible')) tip.remove(); }, 150);
      if (activeTooltip === tip) activeTooltip = null;
    }, 180);
  }

  $$('.term').forEach(term => {
    const tip = document.createElement('span');
    tip.className = 'term-tooltip';
    tip.textContent = term.dataset.definition;

    term.addEventListener('mouseenter', () => showTooltip(term, tip));
    term.addEventListener('mouseleave', () => hideTooltip(tip));
    tip.addEventListener('mouseenter', () => showTooltip(term, tip));
    tip.addEventListener('mouseleave', () => hideTooltip(tip));
    term.addEventListener('click', e => {
      e.stopPropagation();
      tip.classList.contains('visible') ? hideTooltip(tip) : showTooltip(term, tip);
    });
  });

  document.addEventListener('click', () => {
    clearTimeout(tooltipHideTimer);
    if (activeTooltip) { activeTooltip.classList.remove('visible'); activeTooltip.remove(); activeTooltip = null; }
  });

  /* ── QUIZ ENGINE ───────────────────────────────────────────── */
  window.selectOption = function (btn) {
    const block = btn.closest('.quiz-question-block');
    $$('.quiz-option', block).forEach(o => o.classList.remove('selected'));
    btn.classList.add('selected');
  };

  window.checkQuiz = function (containerId) {
    const container = $('#' + containerId);
    if (!container) return;
    $$('.quiz-question-block', container).forEach(q => {
      const selected  = $('.quiz-option.selected', q);
      const feedback  = $('.quiz-feedback', q);
      const correct   = q.dataset.correct;
      const rightExp  = q.dataset.explanationRight  || '';
      const wrongExp  = q.dataset.explanationWrong  || '';

      if (!selected) {
        feedback.textContent = 'Pick an answer first!';
        feedback.className = 'quiz-feedback show warning';
        return;
      }
      $$('.quiz-option', q).forEach(o => o.disabled = true);

      if (selected.dataset.value === correct) {
        selected.classList.add('correct');
        feedback.innerHTML = '<strong>Exactly!</strong> ' + rightExp;
        feedback.className = 'quiz-feedback show success';
      } else {
        selected.classList.add('incorrect');
        const correctBtn = $(`.quiz-option[data-value="${correct}"]`, q);
        if (correctBtn) correctBtn.classList.add('correct');
        feedback.innerHTML = '<strong>Not quite.</strong> ' + wrongExp;
        feedback.className = 'quiz-feedback show error';
      }
    });
  };

  window.resetQuiz = function (containerId) {
    const container = $('#' + containerId);
    if (!container) return;
    $$('.quiz-option', container).forEach(o => {
      o.classList.remove('selected', 'correct', 'incorrect');
      o.disabled = false;
    });
    $$('.quiz-feedback', container).forEach(f => { f.className = 'quiz-feedback'; f.textContent = ''; });
  };

  /* ── DRAG-AND-DROP ENGINE ──────────────────────────────────── */
  function initDnD(containerEl) {
    if (!containerEl) return;
    const chips = $$('.dnd-chip', containerEl);
    const zones = $$('.dnd-zone', containerEl);

    // Mouse (HTML5 Drag API)
    chips.forEach(chip => {
      chip.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', chip.dataset.answer);
        chip.classList.add('dragging');
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
    });

    zones.forEach(zone => {
      const target = $('.dnd-zone-target', zone);
      if (!target) return;
      target.addEventListener('dragover',  e => { e.preventDefault(); target.classList.add('drag-over'); });
      target.addEventListener('dragleave', ()  => target.classList.remove('drag-over'));
      target.addEventListener('drop', e => {
        e.preventDefault();
        target.classList.remove('drag-over');
        const answer = e.dataTransfer.getData('text/plain');
        const chip   = $(`.dnd-chip[data-answer="${answer}"]`, containerEl);
        if (!chip) return;
        target.textContent    = chip.textContent;
        target.dataset.placed = answer;
        chip.classList.add('placed');
      });
    });

    // Touch
    chips.forEach(chip => {
      chip.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const ghost = chip.cloneNode(true);
        ghost.classList.add('touch-ghost');
        ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;left:${touch.clientX - 40}px;top:${touch.clientY - 20}px;`;
        document.body.appendChild(ghost);
        chip._ghost  = ghost;
        chip._answer = chip.dataset.answer;
      }, { passive: false });

      chip.addEventListener('touchmove', e => {
        e.preventDefault();
        const touch = e.touches[0];
        if (chip._ghost) {
          chip._ghost.style.left = (touch.clientX - 40) + 'px';
          chip._ghost.style.top  = (touch.clientY - 20) + 'px';
        }
        zones.forEach(z => { const t = $('.dnd-zone-target', z); if (t) t.classList.remove('drag-over'); });
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const zt = el && el.closest('.dnd-zone-target');
        if (zt) zt.classList.add('drag-over');
      }, { passive: false });

      chip.addEventListener('touchend', e => {
        if (chip._ghost) { chip._ghost.remove(); chip._ghost = null; }
        const touch = e.changedTouches[0];
        const el    = document.elementFromPoint(touch.clientX, touch.clientY);
        const zt    = el && el.closest('.dnd-zone-target');
        if (zt) {
          zt.textContent    = chip.textContent;
          zt.dataset.placed = chip._answer;
          chip.classList.add('placed');
        }
        zones.forEach(z => { const t = $('.dnd-zone-target', z); if (t) t.classList.remove('drag-over'); });
      });
    });
  }

  window.checkDnD = function (containerId) {
    const container = $('#' + containerId);
    if (!container) return;
    $$('.dnd-zone', container).forEach(zone => {
      const target  = $('.dnd-zone-target', zone);
      if (!target || !target.dataset.placed) return;
      if (target.dataset.placed === zone.dataset.correct) {
        target.classList.add('correct-placed');
      } else {
        target.classList.add('incorrect-placed');
      }
    });
  };

  window.resetDnD = function (containerId) {
    const container = $('#' + containerId);
    if (!container) return;
    $$('.dnd-zone-target', container).forEach(t => {
      t.textContent = 'Drop here';
      delete t.dataset.placed;
      t.classList.remove('correct-placed', 'incorrect-placed');
    });
    $$('.dnd-chip', container).forEach(c => c.classList.remove('placed', 'dragging'));
  };

  // Auto-init all dnd containers
  $$('.dnd-container').forEach(el => initDnD(el));

  /* ── GROUP CHAT ENGINE ─────────────────────────────────────── */
  function initChat(containerEl) {
    if (!containerEl) return;
    const messages    = $$('.chat-message', containerEl);
    const typingEl    = $('.chat-typing', containerEl);
    const typingAvEl  = $('#' + containerEl.id + '-typing-avatar') || $('.chat-avatar', typingEl);
    const progressEl  = $('.chat-progress', containerEl);
    let index = 0;
    let isShowing = false;

    // Build actor map from messages
    const actors = {};
    messages.forEach(msg => {
      const sender = msg.dataset.sender;
      const avatar = $('.chat-avatar', msg);
      if (avatar && !actors[sender]) {
        actors[sender] = { initial: avatar.textContent.trim(), style: avatar.style.background };
      }
    });

    function updateProgress() {
      if (progressEl) progressEl.textContent = index + ' / ' + messages.length + ' 条消息';
      updateControls();
    }

    function updateControls() {
      if (prevBtn) prevBtn.disabled = index <= 1 || isShowing;
      if (nextBtn) {
        if (index >= messages.length) {
          nextBtn.textContent = '已完成播放';
          nextBtn.disabled = true;
        } else {
          nextBtn.textContent = nextBtn.dataset.defaultLabel || '下一条';
          nextBtn.disabled = isShowing;
        }
      }
    }

    function showNext() {
      if (isShowing || index >= messages.length) {
        updateControls();
        return;
      }
      isShowing = true;
      const msg    = messages[index];
      const sender = msg.dataset.sender;

      if (typingEl && actors[sender]) {
        if (typingAvEl) {
          typingAvEl.textContent       = actors[sender].initial;
          typingAvEl.style.background  = actors[sender].style;
        }
        typingEl.style.display = 'flex';
      }

      setTimeout(() => {
        if (typingEl) typingEl.style.display = 'none';
        msg.style.display = 'flex';
        msg.style.animation = 'fadeSlideUp 0.3s var(--ease-out)';
        index++;
        isShowing = false;
        updateProgress();
      }, 800);
      updateControls();
    }

    function showPrev() {
      if (isShowing || index <= 1) {
        updateControls();
        return;
      }
      const msg = messages[index - 1];
      if (msg) {
        msg.style.display = 'none';
        msg.style.animation = '';
      }
      if (typingEl) typingEl.style.display = 'none';
      index--;
      updateProgress();
    }

    function showAll() {
      const iv = setInterval(() => {
        if (index >= messages.length) { clearInterval(iv); return; }
        showNext();
      }, 1200);
    }

    function reset() {
      index = 0;
      isShowing = false;
      messages.forEach(m => { m.style.display = 'none'; m.style.animation = ''; });
      if (typingEl) typingEl.style.display = 'none';
      updateProgress();
      showNext();
    }

    // Bind controls
    const prevBtn  = $('.chat-prev-btn',  containerEl);
    const nextBtn  = $('.chat-next-btn',  containerEl);
    const allBtn   = $('.chat-all-btn',   containerEl);
    const resetBtn = $('.chat-reset-btn', containerEl);
    if (nextBtn) nextBtn.dataset.defaultLabel = nextBtn.textContent.trim() || '下一条';
    if (prevBtn)  prevBtn.addEventListener('click',  showPrev);
    if (nextBtn)  nextBtn.addEventListener('click',  showNext);
    if (allBtn)   allBtn.addEventListener('click',   showAll);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    updateProgress();
    showNext();
  }

  $$('.chat-window').forEach(el => initChat(el));

  /* ── FLOW ANIMATION ENGINE ─────────────────────────────────── */
  function initFlow(containerEl) {
    if (!containerEl) return;
    const stepsData  = JSON.parse(containerEl.dataset.steps || '[]');
    const labelEl    = $('.flow-step-label', containerEl);
    const progressEl = $('.flow-progress',   containerEl);
    const packet     = $('.flow-packet',     containerEl);
    let step = 0;

    function updateProgress() {
      if (progressEl) progressEl.textContent = 'Step ' + step + ' / ' + stepsData.length;
    }

    function animatePacket(fromId, toId) {
      if (!packet) return;
      const fromEl = $('#' + fromId);
      const toEl   = $('#' + toId);
      if (!fromEl || !toEl) return;
      const fromR = fromEl.getBoundingClientRect();
      const toR   = toEl.getBoundingClientRect();
      const contR = containerEl.getBoundingClientRect();
      const fx = fromR.left + fromR.width / 2  - contR.left;
      const fy = fromR.top  + fromR.height / 2 - contR.top;
      const tx = toR.left   + toR.width / 2    - contR.left;
      const ty = toR.top    + toR.height / 2   - contR.top;
      packet.style.setProperty('--packet-from-x', fx + 'px');
      packet.style.setProperty('--packet-from-y', fy + 'px');
      packet.style.setProperty('--packet-to-x',   tx + 'px');
      packet.style.setProperty('--packet-to-y',   ty + 'px');
      packet.style.display    = 'block';
      packet.style.animation  = 'none';
      packet.offsetHeight; // reflow
      packet.style.animation  = 'packetMove 0.8s var(--ease-in-out) forwards';
      setTimeout(() => { packet.style.display = 'none'; }, 850);
    }

    function next() {
      if (step >= stepsData.length) return;
      const s = stepsData[step];
      $$('.flow-actor', containerEl).forEach(a => a.classList.remove('active'));
      if (s.highlight) {
        const hEl = $('#' + s.highlight, containerEl) || $('#flow-' + s.highlight);
        if (hEl) hEl.classList.add('active');
      }
      if (s.packet && s.from && s.to) animatePacket('flow-' + s.from, 'flow-' + s.to);
      if (labelEl) labelEl.textContent = s.label || '';
      step++;
      updateProgress();
    }

    function reset() {
      step = 0;
      $$('.flow-actor', containerEl).forEach(a => a.classList.remove('active'));
      if (labelEl) labelEl.textContent = '点击“下一步”开始';
      if (packet)  packet.style.display = 'none';
      updateProgress();
    }

    const nextBtn  = $('.flow-next-btn',  containerEl);
    const resetBtn = $('.flow-reset-btn', containerEl);
    if (nextBtn)  nextBtn.addEventListener('click',  next);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    updateProgress();
  }

  $$('.flow-animation').forEach(el => initFlow(el));

  /* ── ARCHITECTURE DIAGRAM ──────────────────────────────────── */
  $$('.arch-component').forEach(comp => {
    comp.addEventListener('click', function () {
      const diagram = this.closest('.arch-diagram');
      $$('.arch-component', diagram).forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      const descEl = $('.arch-description', diagram);
      if (descEl) descEl.textContent = this.dataset.desc || '';
    });
  });

  /* ── BUG CHALLENGE ─────────────────────────────────────────── */
  window.checkBugLine = function (el, isCorrect) {
    const challenge = el.closest('.bug-challenge');
    const feedback  = $('.bug-feedback', challenge);
    if (isCorrect) {
      el.classList.add('correct');
      feedback.innerHTML  = '<strong>Found it!</strong> ' + (el.dataset.explanation || '');
      feedback.className  = 'bug-feedback show success';
      $$('.bug-line', challenge).forEach(l => l.style.pointerEvents = 'none');
    } else {
      el.classList.add('incorrect');
      feedback.innerHTML  = (el.dataset.hint || 'Not this line — keep looking...');
      feedback.className  = 'bug-feedback show error';
      setTimeout(() => {
        el.classList.remove('incorrect');
        feedback.className = 'bug-feedback';
      }, 1800);
    }
  };

  /* ── LAYER TOGGLE ──────────────────────────────────────────── */
  window.showLayer = function (layerId, btn) {
    const demo = btn ? btn.closest('.layer-demo') : null;
    if (!demo) return;
    $$('.layer', demo).forEach(l => l.style.display = 'none');
    $$('.layer-tab', demo).forEach(t => t.classList.remove('active'));
    const layer = $('#' + layerId);
    if (layer) layer.style.display = 'block';
    btn.classList.add('active');
  };

})();
