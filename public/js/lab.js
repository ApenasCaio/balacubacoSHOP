renderHeader('lab');
renderFooter();

const HANDLE_KEY = 'balacubaco_lab_handle';
let heartbeatTimer = null;

function getHandle() {
  return localStorage.getItem(HANDLE_KEY) || '';
}
function setHandle(h) {
  localStorage.setItem(HANDLE_KEY, h);
  document.cookie = `balacubaco_handle=${encodeURIComponent(h)}; Path=/`;
}

function renderHandleArea() {
  const handle = getHandle();
  const el = document.getElementById('handle-area');
  if (handle) {
    document.cookie = `balacubaco_handle=${encodeURIComponent(handle)}; Path=/`;
    el.innerHTML = `<p>Nome atual: <strong>${escapeHtml(handle)}</strong> &middot; <a href="#" id="change-handle" style="color:#fff;text-decoration:underline;">trocar</a></p>`;
    document.getElementById('change-handle').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem(HANDLE_KEY);
      document.cookie = 'balacubaco_handle=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      init();
    });
  } else {
    el.innerHTML = `
      <form id="handle-form" style="display:flex;gap:8px;max-width:360px;">
        <input type="text" id="handle-input" placeholder="Escolha um nome (ex: ben10)" style="flex:1;">
        <button class="btn btn-secondary" type="submit">Comecar</button>
      </form>
    `;
    document.getElementById('handle-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = document.getElementById('handle-input').value.trim();
      if (!v) return;
      setHandle(v);
      init();
    });
  }
}

function missionCard(m) {
  return `
    <div class="mission-card ${m.solved ? 'solved' : ''}">
      <div class="mtitle">${escapeHtml(m.code)} — ${escapeHtml(m.title)} ${m.solved ? '✅' : ''}</div>
      <div class="mcat">${escapeHtml(m.category)}</div>
      <div class="mdesc">${escapeHtml(m.description)}</div>
      <p class="helper-text"><strong>Objetivo:</strong> ${escapeHtml(m.objective)}</p>
      <div class="mmeta">
        <span class="badge badge-info">${escapeHtml(m.difficulty)}</span>
        <span class="badge badge-warning">${m.points} pts</span>
      </div>
      ${m.solved ? '<p class="text-muted">Missao concluida! 🎉</p>' : `
        <form class="submit-flag-form" data-code="${m.code}">
          <input type="text" placeholder="BALACUBACO{...}" required>
          <button class="btn btn-primary btn-sm" type="submit">Enviar</button>
        </form>
      `}
    </div>
  `;
}

async function loadMissions() {
  const handle = getHandle();
  const missions = await api(`/api/lab/missions?handle=${encodeURIComponent(handle)}`);
  document.getElementById('mission-grid').innerHTML = missions.map(missionCard).join('');

  document.querySelectorAll('.submit-flag-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = form.dataset.code;
      const flag = form.querySelector('input').value.trim();
      try {
        const result = await api('/api/lab/submit', { method: 'POST', body: { handle, code, flag } });
        toast(`Flag correta! +${result.points} pontos.`);
        await refreshScore();
        await loadMissions();
      } catch (err) {
        toast(err.message || 'Flag incorreta.');
      }
    });
  });
}

async function refreshScore() {
  const handle = getHandle();
  if (!handle) return;
  const data = await api(`/api/lab/progress?handle=${encodeURIComponent(handle)}`);
  document.getElementById('score-card').style.display = 'block';
  document.getElementById('score-handle').textContent = handle;
  document.getElementById('score-total').textContent = data.totalScore;
  document.getElementById('score-solved').textContent = `${data.solved.length} / 8`;
}

async function sendHeartbeat() {
  const handle = getHandle();
  if (!handle) return;
  try {
    await api('/api/lab/heartbeat', { method: 'POST', body: { handle } });
  } catch (_err) {
    // Presence is best-effort only.
  }
}

async function init() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  renderHandleArea();
  await loadMissions();
  await refreshScore();
  await sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, 5000);
}

init();
