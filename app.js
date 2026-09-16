const state = {
  exams: [], exam: null, questionBank: [], sectionCounts: {},
  setupMode: null, selectedSectionIds: [], order: 'ordered', examCount: 10, unlearnedOnly: false,
  questions: [], currentIndex: 0, sessionType: null, selectedAnswer: null,
  sessionSource: null, answerChecked: false, correctCount: 0, examAnswers: {}, wrongQuestions: [],
  wrongNoteStore: { version: 1, exams: {} }, learningStore: { version: 1, exams: {} }, removeWrongConfirming: false
};

const WRONG_NOTE_STORAGE_KEY = 'baristaStudy.wrongNotes.v1';
const LEARNING_STORAGE_KEY = 'baristaStudy.learningRecords.v1';
let deferredInstallPrompt = null;

const $ = (selector) => document.querySelector(selector);
const elements = {
  appTitle: $('#app-title'), intro: $('#intro'), examView: $('#exam-view'), menuView: $('#menu-view'), setupView: $('#setup-view'),
  installGuide: $('#install-guide'), installButton: $('#install-button'), installMessage: $('#install-message'),
  wrongNoteView: $('#wrong-note-view'), wrongNoteMenuButton: $('#wrong-note-menu-button'), wrongNoteMenuCount: $('#wrong-note-menu-count'),
  wrongNoteTotal: $('#wrong-note-total'), wrongNoteSections: $('#wrong-note-sections'), wrongNoteEmpty: $('#wrong-note-empty'),
  startWrongNoteButton: $('#start-wrong-note-button'), removeWrongNoteButton: $('#remove-wrong-note-button'),
  studyView: $('#study-view'), resultView: $('#result-view'), examList: $('#exam-list'),
  status: $('#status-message'), setupLabel: $('#setup-label'), selectionToolbar: $('#selection-toolbar'),
  selectionSummary: $('#selection-summary'), sectionList: $('#section-list'), selectAll: $('#select-all'),
  clearAll: $('#clear-all'), orderPanel: $('#order-panel'), examCountPanel: $('#exam-count-panel'),
  countOptions: $('#count-options'), customCountWrap: $('#custom-count-wrap'), customCount: $('#custom-count'),
  countMessage: $('#count-message'), setupMessage: $('#setup-message'), startButton: $('#start-button'),
  unlearnedOnlyOption: $('#unlearned-only-option'), unlearnedOnly: $('#unlearned-only'),
  overallProgressText: $('#overall-progress-text'), overallProgressBar: $('#overall-progress-bar'),
  resetProgressButton: $('#reset-progress-button'), resetConfirm: $('#reset-confirm'), cancelResetButton: $('#cancel-reset-button'),
  confirmResetButton: $('#confirm-reset-button'), resumeChoice: $('#resume-choice'), resumeButton: $('#resume-button'), restartButton: $('#restart-button'),
  questionProgress: $('#question-progress'),
  progressBar: $('#progress-bar'), questionHeading: $('#question-heading'),
  choiceList: $('#choice-list'), answerFeedback: $('#answer-feedback'), learningNotes: $('#learning-notes'),
  examCompleteNotice: $('#exam-complete-notice'), studyActions: $('#study-actions'),
  previousButton: $('#previous-button'), checkButton: $('#check-button'), nextButton: $('#next-button'),
  submitButton: $('#submit-button'), submitWarning: $('#submit-warning'), submitWarningText: $('#submit-warning-text'),
  continueExamButton: $('#continue-exam-button'), confirmSubmitButton: $('#confirm-submit-button'),
  quitButton: $('#quit-button'), resultHeading: $('#result-heading'), resultTotal: $('#result-total'),
  resultCorrect: $('#result-correct'), resultWrong: $('#result-wrong'), unansweredWrap: $('#result-unanswered-wrap'),
  resultUnanswered: $('#result-unanswered'), resultRateWrap: $('#result-rate-wrap'), resultRate: $('#result-rate'), sectionResults: $('#section-results'),
  resultMark: $('#result-mark'), examVerdict: $('#exam-verdict'), verdictText: $('#verdict-text'), scoreText: $('#score-text'),
  retryWrongButton: $('#retry-wrong-button'), returnButton: $('#return-button')
};

const viewIntros = {
  exam: '시험을 선택하세요.', menu: '학습 방법을 선택하세요.', setup: '학습 범위와 출제 방식을 설정하세요.',
  wrongNote: '저장된 오답을 확인하고 다시 학습하세요.', study: '문제를 풀고 정답을 확인하세요.',
  mock: '실전처럼 문제를 풀고 시험을 제출하세요.', result: '학습 결과를 확인하세요.'
};

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isIOSSafari() {
  return isIOSDevice() && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent);
}

function isKakaoInAppBrowser() {
  return /KAKAOTALK/i.test(navigator.userAgent);
}

function hideInstallGuide() {
  elements.installGuide.hidden = true;
  elements.installMessage.hidden = true;
}

function showInstallMessage(message) {
  elements.installMessage.textContent = message;
  elements.installMessage.hidden = false;
}

function showInstallPending() {
  elements.installButton.textContent = '설치 중…';
  elements.installButton.disabled = true;
  showInstallMessage('앱을 설치하고 있습니다. 홈 화면에 아이콘이 나타날 때까지 잠시 기다려 주세요.');
}

function showInstallComplete() {
  elements.installGuide.hidden = false;
  elements.installButton.hidden = true;
  showInstallMessage('✓ 설치 요청이 처리되었습니다. 홈 화면 추가 안내가 나타나면 안내에 따라 완료해 주세요.');
}

async function requestAppInstall() {
  if (isStandaloneMode()) {
    hideInstallGuide();
    return;
  }

  if (isAndroidDevice() && isKakaoInAppBrowser()) {
    showInstallMessage("카카오톡에서는 바로 설치할 수 없습니다. 화면의 ⋮ 메뉴를 누르고 '다른 브라우저로 열기'를 선택한 뒤 앱을 설치하세요.");
    return;
  }

  if (deferredInstallPrompt) {
    const installPrompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') showInstallPending();
    return;
  }

  if (isIOSSafari()) {
    showInstallMessage("Safari의 공유 버튼을 누른 뒤 '홈 화면에 추가'를 선택하세요.");
  } else if (isIOSDevice()) {
    showInstallMessage("Safari에서 이 페이지를 연 뒤 공유 → '홈 화면에 추가'를 선택하세요.");
  } else if (isAndroidDevice()) {
    showInstallMessage('이 브라우저에서 설치 메뉴가 보이지 않으면 Chrome에서 이 페이지를 열어주세요.');
  } else {
    showInstallMessage("브라우저 메뉴에서 '앱 설치' 또는 '홈 화면에 추가'를 선택하세요.");
  }
}

function initializeInstallGuide() {
  if (isStandaloneMode()) {
    hideInstallGuide();
    return;
  }
  elements.installGuide.hidden = false;
}

function showView(name) {
  ['exam', 'menu', 'setup', 'wrongNote', 'study', 'result'].forEach((view) => { elements[`${view}View`].hidden = view !== name; });
  elements.intro.textContent = name === 'study' && state.sessionType === 'exam' ? viewIntros.mock : viewIntros[name];
  if (name === 'menu') updateWrongNoteMenuCount();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function emptyWrongNoteStore() { return { version: 1, exams: {} }; }

function loadWrongNoteStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WRONG_NOTE_STORAGE_KEY) || 'null');
    if (!parsed || parsed.version !== 1 || !parsed.exams || typeof parsed.exams !== 'object' || Array.isArray(parsed.exams)) return emptyWrongNoteStore();
    const safeStore = emptyWrongNoteStore();
    Object.entries(parsed.exams).forEach(([examId, records]) => {
      if (!records || typeof records !== 'object' || Array.isArray(records)) return;
      const safeRecords = {};
      Object.entries(records).forEach(([questionId, record]) => {
        if (!record || typeof record !== 'object') return;
        if (!Number.isInteger(record.wrongCount) || record.wrongCount < 1 || typeof record.lastWrongAt !== 'string') return;
        safeRecords[questionId] = { wrongCount: record.wrongCount, lastWrongAt: record.lastWrongAt };
      });
      safeStore.exams[examId] = safeRecords;
    });
    return safeStore;
  } catch (_) {
    return emptyWrongNoteStore();
  }
}

function saveWrongNoteStore() {
  try { localStorage.setItem(WRONG_NOTE_STORAGE_KEY, JSON.stringify(state.wrongNoteStore)); } catch (_) { /* 메모리 상태는 유지 */ }
}

function emptyLearningStore() { return { version: 1, exams: {} }; }

function loadLearningStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEARNING_STORAGE_KEY) || 'null');
    if (!parsed || parsed.version !== 1 || !parsed.exams || typeof parsed.exams !== 'object' || Array.isArray(parsed.exams)) return emptyLearningStore();
    const safeStore = emptyLearningStore();
    Object.entries(parsed.exams).forEach(([examId, records]) => {
      if (!records || typeof records !== 'object' || Array.isArray(records)) return;
      const safeRecords = {};
      Object.entries(records).forEach(([questionId, record]) => {
        if (!record || record.completed !== true || typeof record.lastStudiedAt !== 'string') return;
        if (![record.attemptCount, record.correctCount, record.incorrectCount].every((value) => Number.isInteger(value) && value >= 0)) return;
        if (!['correct', 'incorrect'].includes(record.lastResult)) return;
        safeRecords[questionId] = { completed: true, lastStudiedAt: record.lastStudiedAt, attemptCount: record.attemptCount, correctCount: record.correctCount, incorrectCount: record.incorrectCount, lastResult: record.lastResult };
      });
      safeStore.exams[examId] = safeRecords;
    });
    return safeStore;
  } catch (_) { return emptyLearningStore(); }
}

function saveLearningStore() {
  try { localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(state.learningStore)); } catch (_) { /* 문제풀이는 계속 진행 */ }
}

function currentLearningRecords() { return state.exam ? (state.learningStore.exams[state.exam.id] || {}) : {}; }
function isLearned(question) { return Boolean(currentLearningRecords()[question.id]?.completed); }

function recordLearningAnswer(question, isCorrect) {
  if (!state.exam || state.sessionSource !== 'regular') return;
  if (!state.learningStore.exams[state.exam.id]) state.learningStore.exams[state.exam.id] = {};
  const records = state.learningStore.exams[state.exam.id];
  const previous = records[question.id] || { attemptCount: 0, correctCount: 0, incorrectCount: 0 };
  records[question.id] = {
    completed: true, lastStudiedAt: new Date().toISOString(), attemptCount: previous.attemptCount + 1,
    correctCount: previous.correctCount + (isCorrect ? 1 : 0), incorrectCount: previous.incorrectCount + (isCorrect ? 0 : 1),
    lastResult: isCorrect ? 'correct' : 'incorrect'
  };
  saveLearningStore(); updateProgressUI(); renderSections();
}

function learnedCount(sectionId = null) {
  return state.questionBank.filter((question) => (!sectionId || question.sectionId === sectionId) && isLearned(question)).length;
}

function updateProgressUI() {
  if (!state.exam) return;
  const learned = learnedCount(); const total = state.questionBank.length; const rate = total ? Math.round((learned / total) * 100) : 0;
  elements.overallProgressText.textContent = `${learned} / ${total}`;
  elements.overallProgressBar.style.width = `${rate}%`;
  elements.overallProgressBar.parentElement.setAttribute('aria-valuenow', String(rate));
}

function currentWrongNoteRecords() {
  if (!state.exam) return {};
  return state.wrongNoteStore.exams[state.exam.id] || {};
}

function wrongNoteQuestions() {
  const ids = new Set(Object.keys(currentWrongNoteRecords()));
  return state.questionBank.filter((question) => ids.has(question.id));
}

function updateWrongNoteMenuCount() {
  if (!state.exam) return;
  elements.wrongNoteMenuCount.textContent = `${wrongNoteQuestions().length}문제`;
}

function recordWrongAnswer(question) {
  if (!state.exam || state.sessionSource !== 'regular') return;
  if (!state.wrongNoteStore.exams[state.exam.id]) state.wrongNoteStore.exams[state.exam.id] = {};
  const records = state.wrongNoteStore.exams[state.exam.id];
  const previous = records[question.id];
  records[question.id] = { wrongCount: previous ? previous.wrongCount + 1 : 1, lastWrongAt: new Date().toISOString() };
  saveWrongNoteStore(); updateWrongNoteMenuCount();
}

function renderWrongNote() {
  const questions = wrongNoteQuestions();
  elements.wrongNoteTotal.textContent = `${questions.length}문제`;
  elements.wrongNoteSections.replaceChildren();
  state.exam.sections.forEach((section) => {
    const count = questions.filter((question) => question.sectionId === section.id).length;
    if (!count) return;
    const row = document.createElement('p'); const name = document.createElement('span'); const value = document.createElement('strong');
    name.textContent = section.name; value.textContent = `${count}문제`; row.append(name, value); elements.wrongNoteSections.append(row);
  });
  elements.wrongNoteEmpty.hidden = questions.length > 0;
  elements.wrongNoteSections.hidden = questions.length === 0;
  elements.startWrongNoteButton.hidden = questions.length === 0;
  elements.startWrongNoteButton.disabled = questions.length === 0;
  updateWrongNoteMenuCount(); showView('wrongNote');
}

function isValidExamData(data) {
  return data && Array.isArray(data.exams) && data.exams.every((exam) =>
    typeof exam.id === 'string' && typeof exam.name === 'string' && typeof exam.questionsFile === 'string' &&
    (exam.passingScore === undefined || (Number.isFinite(exam.passingScore) && exam.passingScore >= 0 && exam.passingScore <= 100)) &&
    Array.isArray(exam.sections) && exam.sections.every((section) => typeof section.id === 'string' && typeof section.name === 'string'));
}

function isValidQuestionData(data, exam) {
  const ids = new Set(exam.sections.map((section) => section.id));
  return Array.isArray(data) && data.every((question) => typeof question.id === 'string' && ids.has(question.sectionId) &&
    typeof question.question === 'string' && Array.isArray(question.choices) && question.choices.length > 0 &&
    question.choices.every((choice) => typeof choice.label === 'string' && typeof choice.text === 'string') &&
    question.choices.some((choice) => choice.label === question.answer));
}

function renderExams() {
  elements.examList.replaceChildren();
  state.exams.forEach((exam) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'exam-button'; button.textContent = exam.name;
    button.dataset.examId = exam.id; button.setAttribute('role', 'radio'); button.setAttribute('aria-checked', 'false');
    button.addEventListener('click', () => selectExam(exam.id));
    elements.examList.append(button);
  });
}

async function selectExam(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return;
  elements.status.classList.remove('error'); elements.status.textContent = '문제은행을 불러오는 중입니다.';
  try {
    const response = await fetch(exam.questionsFile);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const questions = await response.json();
    if (!isValidQuestionData(questions, exam)) throw new Error('문제 데이터 형식이 올바르지 않습니다.');
    state.exam = exam; state.questionBank = questions;
    const learningTitle = `${exam.name} 필기 학습`;
    elements.appTitle.textContent = learningTitle;
    document.title = learningTitle;
    state.sectionCounts = Object.fromEntries(exam.sections.map((section) => [section.id, questions.filter((question) => question.sectionId === section.id).length]));
    elements.status.textContent = ''; updateProgressUI();
    showView('menu');
  } catch (error) {
    console.error('문제은행을 불러오지 못했습니다.', error);
    elements.status.classList.add('error'); elements.status.textContent = '문제은행을 불러오지 못했습니다.';
  }
}

function openSetup(mode) {
  state.setupMode = mode; state.selectedSectionIds = []; state.order = 'ordered'; state.examCount = 10; state.unlearnedOnly = false;
  elements.setupLabel.textContent = mode === 'single' ? '개별 단원 학습' : mode === 'multi' ? '여러 단원 학습' : '모의 평가 시험';
  elements.selectionToolbar.hidden = mode === 'single';
  elements.orderPanel.hidden = mode === 'exam'; elements.examCountPanel.hidden = mode !== 'exam';
  elements.unlearnedOnlyOption.hidden = mode !== 'multi'; elements.unlearnedOnly.checked = false;
  elements.resumeChoice.hidden = true; elements.resetConfirm.hidden = true; elements.setupMessage.textContent = '';
  elements.startButton.textContent = mode === 'exam' ? '시험 시작' : '학습 시작';
  $('input[name="question-order"][value="ordered"]').checked = true;
  renderSections(); renderCountOptions(); updateProgressUI(); updateSetup(); showView('setup');
}

function renderSections() {
  elements.sectionList.replaceChildren();
  state.exam.sections.forEach((section) => {
    const label = document.createElement('label'); label.className = 'section-card';
    const input = document.createElement('input'); input.type = state.setupMode === 'single' ? 'radio' : 'checkbox';
    input.name = 'sections'; input.value = section.id; input.checked = state.selectedSectionIds.includes(section.id);
    input.addEventListener('change', handleSectionChange);
    const content = document.createElement('span'); content.className = 'section-card-content';
    const mark = document.createElement('span'); mark.className = 'check-mark'; mark.setAttribute('aria-hidden', 'true'); mark.textContent = '✓';
    const text = document.createElement('span'); text.className = 'section-name'; text.textContent = section.name;
    const count = document.createElement('small'); count.className = 'section-count'; count.textContent = `${learnedCount(section.id)} / ${state.sectionCounts[section.id]} 학습`;
    content.append(mark, text, count); label.append(input, content); elements.sectionList.append(label);
  });
}

function handleSectionChange(event) {
  const id = event.currentTarget.value;
  if (state.setupMode === 'single') state.selectedSectionIds = event.currentTarget.checked ? [id] : [];
  else if (event.currentTarget.checked) state.selectedSectionIds = [...new Set([...state.selectedSectionIds, id])];
  else state.selectedSectionIds = state.selectedSectionIds.filter((sectionId) => sectionId !== id);
  renderSections(); updateSetup();
}

function setAllSections(selected) {
  state.selectedSectionIds = selected ? state.exam.sections.map((section) => section.id) : [];
  renderSections(); updateSetup();
}

function selectedPool(includeUnlearnedFilter = true) {
  const ids = new Set(state.selectedSectionIds);
  return state.questionBank.filter((question) => ids.has(question.sectionId) && (!includeUnlearnedFilter || !state.unlearnedOnly || !isLearned(question)));
}

function renderCountOptions() {
  elements.countOptions.replaceChildren();
  [10, 20, 30, 50].forEach((count) => {
    const label = document.createElement('label'); label.className = 'count-option';
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'exam-count'; input.value = String(count);
    input.addEventListener('change', () => { state.examCount = count; elements.customCountWrap.hidden = true; validateCount(); });
    const span = document.createElement('span'); span.textContent = `${count}문제`; label.append(input, span); elements.countOptions.append(label);
  });
  const custom = document.createElement('label'); custom.className = 'count-option';
  const input = document.createElement('input'); input.type = 'radio'; input.name = 'exam-count'; input.value = 'custom';
  input.addEventListener('change', () => { elements.customCountWrap.hidden = false; state.examCount = Number(elements.customCount.value); validateCount(); });
  const span = document.createElement('span'); span.textContent = '직접 입력'; custom.append(input, span); elements.countOptions.append(custom);
}

function updateSetup() {
  const total = selectedPool().length;
  elements.selectionSummary.textContent = `${state.selectedSectionIds.length}개 단원 / 총 ${total}문제`;
  elements.selectAll.disabled = state.selectedSectionIds.length === state.exam.sections.length;
  elements.clearAll.disabled = state.selectedSectionIds.length === 0;
  if (state.setupMode === 'exam') {
    elements.countOptions.querySelectorAll('input').forEach((input) => {
      if (input.value !== 'custom') input.disabled = Number(input.value) > total;
    });
    const selectedCount = $('input[name="exam-count"]:checked');
    if (!selectedCount || (selectedCount.value !== 'custom' && Number(selectedCount.value) > total)) {
      const firstAvailable = [...elements.countOptions.querySelectorAll('input')].find((input) => input.value !== 'custom' && !input.disabled);
      if (firstAvailable) { firstAvailable.checked = true; state.examCount = Number(firstAvailable.value); elements.customCountWrap.hidden = true; }
    }
    elements.customCount.max = String(total);
    validateCount();
  } else {
    elements.startButton.disabled = total === 0;
    elements.setupMessage.textContent = state.setupMode === 'multi' && state.unlearnedOnly && state.selectedSectionIds.length && total === 0 ? '선택한 단원의 모든 문제를 이미 학습했습니다.' : '';
  }
}

function validateCount() {
  const total = selectedPool().length;
  const selected = $('input[name="exam-count"]:checked');
  if (selected?.value === 'custom') state.examCount = Number(elements.customCount.value);
  const valid = state.selectedSectionIds.length > 0 && Number.isInteger(state.examCount) && state.examCount >= 1 && state.examCount <= total;
  elements.countMessage.textContent = !state.selectedSectionIds.length ? '먼저 출제 단원을 선택하세요.' : valid ? `선택한 ${total}문제 중 ${state.examCount}문제를 출제합니다.` : `1부터 ${total} 사이의 문항 수를 입력하세요.`;
  elements.countMessage.classList.toggle('error', !valid); elements.startButton.disabled = !valid;
  return valid;
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function startConfiguredSession(forceChoice = null) {
  if (!state.selectedSectionIds.length || (state.setupMode === 'exam' && !validateCount())) return;
  let questions = selectedPool();
  if (state.setupMode === 'multi' && state.unlearnedOnly && questions.length === 0) { elements.setupMessage.textContent = '선택한 단원의 모든 문제를 이미 학습했습니다.'; return; }
  if (state.setupMode === 'single' && forceChoice === null && selectedPool(false).some(isLearned)) {
    elements.resetConfirm.hidden = true; elements.resetProgressButton.setAttribute('aria-expanded', 'false');
    elements.resumeChoice.hidden = false; elements.resumeChoice.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return;
  }
  if (state.setupMode === 'single') questions = forceChoice === 'resume' ? selectedPool(false).filter((question) => !isLearned(question)) : selectedPool(false);
  if (state.setupMode === 'single' && forceChoice === 'resume' && questions.length === 0) { elements.setupMessage.textContent = '이 단원의 모든 문제를 학습했습니다. 처음부터 학습을 선택해 주세요.'; return; }
  if (state.setupMode === 'exam') questions = shuffle(questions).slice(0, state.examCount);
  else if (state.order === 'random') questions = shuffle(questions);
  startSession(questions, state.setupMode === 'exam' ? 'exam' : 'study', state.setupMode === 'exam' ? 'exam' : 'regular');
}

function startSession(questions, type, source = type) {
  state.questions = [...questions]; state.sessionType = type; state.sessionSource = source; state.currentIndex = 0; state.selectedAnswer = null;
  state.answerChecked = false; state.correctCount = 0; state.examAnswers = {}; state.wrongQuestions = [];
  elements.submitWarning.hidden = true; showView('study'); renderQuestion();
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  const current = state.currentIndex + 1; const total = state.questions.length;
  state.selectedAnswer = state.sessionType === 'exam' ? (state.examAnswers[question.id] || null) : null;
  state.answerChecked = false;
  elements.questionProgress.textContent = `${current} / ${total}`;
  elements.progressBar.style.width = `${(current / total) * 100}%`;
  elements.questionHeading.textContent = question.question.replace(/\s*\(\s*\)\s*$/, '');
  elements.choiceList.replaceChildren(elements.choiceList.querySelector('legend'));
  elements.answerFeedback.hidden = true; elements.answerFeedback.className = 'answer-feedback';
  elements.learningNotes.hidden = true; elements.learningNotes.replaceChildren(); elements.submitWarning.hidden = true;
  elements.examCompleteNotice.hidden = true;
  elements.removeWrongNoteButton.hidden = true; elements.removeWrongNoteButton.disabled = false;
  elements.removeWrongNoteButton.classList.remove('is-confirming'); elements.removeWrongNoteButton.textContent = '오답노트에서 제외';
  state.removeWrongConfirming = false;

  question.choices.forEach((choice) => {
    const label = document.createElement('label'); label.className = 'choice-item';
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'answer'; input.value = choice.label;
    input.checked = state.selectedAnswer === choice.label; input.addEventListener('change', () => selectAnswer(choice.label));
    const content = document.createElement('span'); content.className = 'choice-content';
    const choiceLabel = document.createElement('span'); choiceLabel.className = 'choice-label'; choiceLabel.textContent = choice.label;
    const choiceText = document.createElement('span'); choiceText.textContent = choice.text;
    content.append(choiceLabel, choiceText); label.append(input, content); elements.choiceList.append(label);
  });

  const isExam = state.sessionType === 'exam';
  elements.studyActions.classList.toggle('exam-actions', isExam);
  elements.checkButton.hidden = isExam; elements.nextButton.hidden = isExam; elements.previousButton.hidden = !isExam;
  elements.submitButton.hidden = !isExam;
  if (isExam) {
    elements.previousButton.disabled = state.currentIndex === 0;
    elements.nextButton.hidden = false; elements.nextButton.textContent = state.currentIndex === total - 1 ? '처음으로' : '다음 문제';
    updateExamCompleteNotice();
  } else {
    elements.checkButton.disabled = true; elements.checkButton.hidden = false; elements.nextButton.hidden = true;
  }
  elements.questionHeading.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectAnswer(answer) {
  if (state.sessionType === 'exam') {
    state.examAnswers[state.questions[state.currentIndex].id] = answer; state.selectedAnswer = answer;
    updateExamCompleteNotice();
  } else if (!state.answerChecked) {
    state.selectedAnswer = answer; elements.checkButton.disabled = false;
  }
}

function updateExamCompleteNotice() {
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  const allAnswered = Object.keys(state.examAnswers).length === state.questions.length;
  elements.examCompleteNotice.hidden = state.sessionType !== 'exam' || !isLastQuestion || !allAnswered;
}

function appendResultBadge(item, correct, text) {
  const badge = document.createElement('span'); badge.className = `choice-result-badge ${correct ? 'correct' : 'wrong'}`; badge.textContent = text;
  item.querySelector('.choice-content').append(badge);
}

function checkAnswer() {
  if (state.sessionType !== 'study' || !state.selectedAnswer || state.answerChecked) return;
  const question = state.questions[state.currentIndex]; const isCorrect = state.selectedAnswer === question.answer;
  state.answerChecked = true;
  if (isCorrect) state.correctCount += 1;
  else { state.wrongQuestions.push(question); recordWrongAnswer(question); }
  recordLearningAnswer(question, isCorrect);

  elements.choiceList.querySelectorAll('.choice-item').forEach((item) => {
    const input = item.querySelector('input'); input.disabled = true; item.classList.add('is-locked');
    if (input.value === question.answer) { item.classList.add('is-correct'); appendResultBadge(item, true, '✓ 정답'); }
    else if (input.value === state.selectedAnswer) { item.classList.add('is-wrong'); appendResultBadge(item, false, '✕ 내 답'); }
  });

  renderLearningNotes(question);
  elements.removeWrongNoteButton.hidden = state.sessionSource !== 'wrong-note' || !isCorrect;
  elements.checkButton.hidden = true;
  elements.nextButton.textContent = state.currentIndex === state.questions.length - 1 ? '학습 결과 보기' : '다음 문제'; elements.nextButton.hidden = false; elements.nextButton.focus();
}

function removeCurrentWrongNote() {
  if (state.sessionSource !== 'wrong-note' || !state.answerChecked || state.selectedAnswer !== state.questions[state.currentIndex].answer) return;
  if (!state.removeWrongConfirming) {
    state.removeWrongConfirming = true; elements.removeWrongNoteButton.classList.add('is-confirming');
    elements.removeWrongNoteButton.textContent = '정말 오답노트에서 제외할까요?'; return;
  }
  const records = currentWrongNoteRecords(); const questionId = state.questions[state.currentIndex].id;
  if (Object.prototype.hasOwnProperty.call(records, questionId)) delete records[questionId];
  saveWrongNoteStore(); updateWrongNoteMenuCount();
  state.removeWrongConfirming = false; elements.removeWrongNoteButton.classList.remove('is-confirming');
  elements.removeWrongNoteButton.textContent = '오답노트에서 제외됨'; elements.removeWrongNoteButton.disabled = true;
}

function renderLearningNotes(question) {
  const notes = [['explanation', '💡 핵심 포인트'], ['memoryTip', '📌 쉽게 외우기'], ['examTip', '🎯 함정 체크!']].filter(([field]) => typeof question[field] === 'string' && question[field].trim());
  elements.learningNotes.replaceChildren();
  notes.forEach(([field, title]) => { const card = document.createElement('section'); card.className = 'note-card'; const heading = document.createElement('h3'); heading.textContent = title; const text = document.createElement('p'); appendBoldMarkdown(text, question[field]); card.append(heading, text); elements.learningNotes.append(card); });
  elements.learningNotes.hidden = notes.length === 0;
}

function appendBoldMarkdown(container, value) {
  const pattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(value)) !== null) {
    container.append(document.createTextNode(value.slice(lastIndex, match.index)));
    const strong = document.createElement('strong');
    strong.textContent = match[1];
    container.append(strong);
    lastIndex = pattern.lastIndex;
  }
  container.append(document.createTextNode(value.slice(lastIndex)));
}

function nextQuestion() {
  if (state.sessionType === 'exam') { state.currentIndex = state.currentIndex === state.questions.length - 1 ? 0 : state.currentIndex + 1; renderQuestion(); return; }
  if (!state.answerChecked) return;
  if (state.currentIndex < state.questions.length - 1) { state.currentIndex += 1; renderQuestion(); } else showStudyResult();
}

function previousQuestion() { if (state.sessionType === 'exam' && state.currentIndex > 0) { state.currentIndex -= 1; renderQuestion(); } }

function requestSubmit() {
  const unanswered = state.questions.length - Object.keys(state.examAnswers).length;
  if (!unanswered) { submitExam(); return; }
  elements.submitWarningText.textContent = `아직 답하지 않은 문제가 ${unanswered}개 있습니다. 그래도 제출할까요?`;
  elements.submitWarning.hidden = false; elements.confirmSubmitButton.focus();
}

function submitExam() {
  const answers = state.examAnswers;
  const incorrect = state.questions.filter((question) => answers[question.id] && answers[question.id] !== question.answer);
  const correct = state.questions.filter((question) => answers[question.id] === question.answer).length;
  const unanswered = state.questions.filter((question) => !answers[question.id]).length;
  state.wrongQuestions = incorrect;
  showResult({ total: state.questions.length, correct, wrong: incorrect.length, unanswered, isExam: true });
}

function showStudyResult() {
  showResult({ total: state.questions.length, correct: state.correctCount, wrong: state.questions.length - state.correctCount, unanswered: 0, isExam: false });
}

function showResult(result) {
  elements.resultHeading.textContent = result.isExam ? '시험 결과' : '학습 완료';
  elements.resultTotal.textContent = result.total; elements.resultCorrect.textContent = result.correct;
  elements.resultWrong.textContent = result.wrong; elements.resultUnanswered.textContent = result.unanswered;
  const scoreValue = (result.correct / result.total) * 100;
  const score = Math.round(scoreValue);
  elements.unansweredWrap.hidden = !result.isExam; elements.resultRateWrap.hidden = result.isExam; elements.resultRate.textContent = `${score}%`;
  elements.examVerdict.hidden = !result.isExam;
  if (result.isExam) {
    const passingScore = state.exam.passingScore ?? 60;
    const passed = scoreValue >= passingScore;
    elements.examVerdict.className = `exam-verdict ${passed ? 'pass' : 'fail'}`;
    elements.verdictText.textContent = passed ? '🎉 합격입니다! 😊' : '☕ 불합격입니다. 😢';
    elements.scoreText.textContent = `${score}점`;
    elements.resultMark.className = `result-mark ${passed ? 'pass' : 'fail'}`;
    elements.resultMark.textContent = passed ? '✓' : '!';
  } else {
    elements.examVerdict.className = 'exam-verdict';
    elements.resultMark.className = 'result-mark';
    elements.resultMark.textContent = '✓';
  }
  elements.retryWrongButton.hidden = !result.isExam || state.wrongQuestions.length === 0;
  renderSectionResults(result.isExam); showView('result'); elements.resultHeading.focus({ preventScroll: true });
}

function renderSectionResults(isExam) {
  elements.sectionResults.replaceChildren(); elements.sectionResults.hidden = !isExam;
  if (!isExam) return;
  const heading = document.createElement('h3'); heading.textContent = '단원별 결과'; elements.sectionResults.append(heading);
  state.exam.sections.forEach((section) => {
    const questions = state.questions.filter((question) => question.sectionId === section.id); if (!questions.length) return;
    const correct = questions.filter((question) => state.examAnswers[question.id] === question.answer).length;
    const row = document.createElement('p'); const name = document.createElement('span'); name.textContent = section.name;
    const score = document.createElement('strong'); score.textContent = `${correct} / ${questions.length}`; row.append(name, score); elements.sectionResults.append(row);
  });
}

function retryWrong() { if (state.wrongQuestions.length) startSession(state.wrongQuestions, 'study', 'mock-retry'); }
function startWrongNoteReview() { const questions = wrongNoteQuestions(); if (questions.length) startSession(questions, 'study', 'wrong-note'); }
function returnToSetup() { if (state.sessionSource === 'wrong-note') { renderWrongNote(); return; } showView('setup'); updateSetup(); }
function returnToMenu() { state.questions = []; state.examAnswers = {}; state.wrongQuestions = []; showView('menu'); }

async function initialize() {
  try {
    state.wrongNoteStore = loadWrongNoteStore();
    state.learningStore = loadLearningStore();
    const response = await fetch('data/exams.json'); if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json(); if (!isValidExamData(data)) throw new Error('시험 데이터 형식이 올바르지 않습니다.');
    state.exams = data.exams; renderExams(); elements.status.textContent = '';
  } catch (error) {
    console.error('시험 데이터를 불러오지 못했습니다.', error); elements.status.classList.add('error');
    elements.status.textContent = '시험 데이터를 불러오지 못했습니다. 로컬 웹 서버 또는 GitHub Pages에서 실행해 주세요.';
  }
}

document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => openSetup(button.dataset.mode)));
document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.back)));
document.querySelectorAll('[data-close-view]').forEach((button) => button.addEventListener('click', () => {
  if (button.dataset.closeView === 'menu') { showView('exam'); return; }
  if (window.history.length > 1) window.history.back(); else window.close();
}));
document.querySelectorAll('input[name="question-order"]').forEach((input) => input.addEventListener('change', () => { state.order = input.value; }));
elements.selectAll.addEventListener('click', () => setAllSections(true)); elements.clearAll.addEventListener('click', () => setAllSections(false));
elements.customCount.addEventListener('input', validateCount); elements.startButton.addEventListener('click', () => startConfiguredSession());
elements.unlearnedOnly.addEventListener('change', () => { state.unlearnedOnly = elements.unlearnedOnly.checked; updateSetup(); });
elements.resumeButton.addEventListener('click', () => startConfiguredSession('resume')); elements.restartButton.addEventListener('click', () => startConfiguredSession('restart'));
elements.resetProgressButton.addEventListener('click', () => {
  elements.resumeChoice.hidden = true; elements.resetConfirm.hidden = false; elements.resetProgressButton.setAttribute('aria-expanded', 'true'); elements.cancelResetButton.focus();
});
elements.cancelResetButton.addEventListener('click', () => {
  elements.resetConfirm.hidden = true; elements.resetProgressButton.setAttribute('aria-expanded', 'false'); elements.resetProgressButton.focus();
});
elements.confirmResetButton.addEventListener('click', () => {
  state.learningStore = emptyLearningStore();
  saveLearningStore(); elements.resetConfirm.hidden = true; elements.resetProgressButton.setAttribute('aria-expanded', 'false'); elements.resumeChoice.hidden = true;
  updateProgressUI(); renderSections(); updateSetup(); elements.setupMessage.textContent = '학습 기록을 초기화했습니다.';
});
elements.checkButton.addEventListener('click', checkAnswer); elements.nextButton.addEventListener('click', nextQuestion);
elements.previousButton.addEventListener('click', previousQuestion); elements.submitButton.addEventListener('click', requestSubmit);
elements.continueExamButton.addEventListener('click', () => { elements.submitWarning.hidden = true; }); elements.confirmSubmitButton.addEventListener('click', submitExam);
elements.quitButton.addEventListener('click', returnToSetup); elements.retryWrongButton.addEventListener('click', retryWrong); elements.returnButton.addEventListener('click', returnToMenu);
elements.wrongNoteMenuButton.addEventListener('click', renderWrongNote); elements.startWrongNoteButton.addEventListener('click', startWrongNoteReview);
elements.removeWrongNoteButton.addEventListener('click', removeCurrentWrongNote);
elements.installButton.addEventListener('click', requestAppInstall);

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (!isStandaloneMode()) elements.installGuide.hidden = false;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  showInstallComplete();
});

initializeInstallGuide();
initialize();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.error('서비스 워커를 등록하지 못했습니다.', error);
    });
  });
}
