let currentQuestions = [];
let currentTopic = '';
let selectedNum = 3;

window.addEventListener('load', async () => {
    const res = await fetch('/api/me');
    if (!res.ok) { window.location.href = '/'; return; }
    const data = await res.json();
    document.getElementById('welcome-msg').textContent = data.username;
    loadHistory();
});

function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(name + '-section').classList.add('active');
    event.target.classList.add('active');
}

function selectNum(btn, num) {
    document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedNum = num;
}

async function generateQuiz() {
    const topic = document.getElementById('topic-input').value.trim();
    if (!topic) { alert('Please enter a topic!'); return; }

    const btn = document.getElementById('generate-btn');
    btn.textContent = 'Generating...';
    btn.disabled = true;

    const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, numQuestions: selectedNum })
    });

    btn.textContent = 'Generate Quiz';
    btn.disabled = false;

    if (!res.ok) { alert('Failed to generate quiz. Check your API key.'); return; }

    const data = await res.json();
    currentQuestions = data.questions;
    currentTopic = topic;
    renderQuiz();
}

function renderQuiz() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('quiz-section').classList.add('active');
    document.getElementById('quiz-topic-label').textContent = currentTopic;
    document.getElementById('quiz-progress').textContent = `${currentQuestions.length} questions`;

    const container = document.getElementById('questions-container');
    container.innerHTML = currentQuestions.map((q, i) => `
    <div class="question-card" style="animation-delay: ${i * 0.08}s">
      <div class="question-num">Q${i + 1}</div>
      <p class="question-text">${q.question}</p>
      <div class="options-grid">
        ${q.options.map(opt => `
          <label class="option-label">
            <input type="radio" name="q${i}" value="${opt}">
            <span class="option-box">${opt}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function submitQuiz() {
    let score = 0;
    let reviewHTML = '';

    currentQuestions.forEach((q, i) => {
        const selected = document.querySelector(`input[name="q${i}"]:checked`);
        const userAnswer = selected ? selected.value : 'No answer';
        const correct = userAnswer === q.answer;
        if (correct) score++;

        reviewHTML += `
      <div class="review-card ${correct ? 'correct' : 'wrong'}">
        <div class="review-header">
          <span class="review-q">Q${i + 1}</span>
          <span class="review-badge">${correct ? 'Correct' : 'Incorrect'}</span>
        </div>
        <p class="review-question">${q.question}</p>
        <p class="review-answer">Your answer: <strong>${userAnswer}</strong></p>
        ${!correct ? `<p class="review-correct">Correct answer: <strong>${q.answer}</strong></p>` : ''}
      </div>`;
    });

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('results-section').classList.add('active');

    const pct = Math.round((score / currentQuestions.length) * 100);
    document.getElementById('score-text').textContent = `${pct}%`;
    document.getElementById('score-display').textContent =
        `You got ${score} out of ${currentQuestions.length} correct`;

    // Animate score ring
    const circle = document.getElementById('score-circle');
    const circumference = 314;
    const offset = circumference - (pct / 100) * circumference;
    setTimeout(() => {
        circle.style.transition = 'stroke-dashoffset 1s ease';
        circle.style.strokeDashoffset = offset;
        circle.style.stroke = pct >= 70 ? '#4ade80' : pct >= 40 ? '#facc15' : '#f87171';
    }, 100);

    document.getElementById('answers-review').innerHTML = reviewHTML;

    fetch('/api/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: currentTopic, score, total: currentQuestions.length })
    }).then(() => loadHistory());
}

function resetQuiz() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('setup-section').classList.add('active');
    document.querySelectorAll('.nav-item')[0].classList.add('active');
    document.getElementById('topic-input').value = '';
    currentQuestions = [];
    document.getElementById('score-circle').style.strokeDashoffset = '314';
}

async function loadHistory() {
    const res = await fetch('/api/history');
    if (!res.ok) return;
    const { results } = await res.json();
    const list = document.getElementById('history-list');
    if (!results.length) {
        list.innerHTML = '<p class="empty-state">No quizzes taken yet. Start your first quiz!</p>';
        return;
    }
    list.innerHTML = results.map(r => `
    <div class="history-card">
      <div class="history-topic">${r.topic}</div>
      <div class="history-meta">
        <span class="history-score ${(r.score/r.total) >= 0.7 ? 'good' : (r.score/r.total) >= 0.4 ? 'mid' : 'bad'}">
          ${r.score}/${r.total}
        </span>
        <span class="history-date">${new Date(r.taken_at).toLocaleDateString()}</span>
      </div>
    </div>`).join('');
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
}