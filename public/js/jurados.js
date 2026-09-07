renderHeader('admin');
renderFooter();

const boardStatus = document.getElementById('board-status');
const statActive = document.getElementById('stat-active');
const statTotal = document.getElementById('stat-total');
const statUpdated = document.getElementById('stat-updated');
const leaderboardTable = document.getElementById('leaderboard-table');
const filterButtons = document.querySelectorAll('[data-filter]');
const ACTIVE_WINDOW_MS = 60 * 1000;

let currentPayload = null;
let currentFilter = 'all';
let eventSource = null;
let clearModalEl = null;
let pendingClearParticipant = null;

function formatClock(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatAgo(iso) {
  if (!iso) return '--';
  const diff = Math.max(0, Date.now() - Date.parse(iso));
  if (diff < 1000) return 'agora';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  return `${Math.floor(diff / 60000)}m`;
}

function applyFilter(rows) {
  if (currentFilter === 'active') return rows.filter((row) => row.isActive);
  if (currentFilter === 'inactive') return rows.filter((row) => !row.isActive);
  return rows;
}

function refreshActivityState(rows) {
  const now = Date.now();
  return rows.map((row) => {
    const lastSeen = row.lastSeenAt ? Date.parse(row.lastSeenAt) : NaN;
    const isActive = Number.isFinite(lastSeen) && (now - lastSeen) <= ACTIVE_WINDOW_MS;
    return { ...row, isActive };
  });
}

function filterLabel() {
  if (currentFilter === 'active') return 'ativos';
  if (currentFilter === 'inactive') return 'inativos';
  return 'todos';
}

function updateFilterButtons() {
  filterButtons.forEach((button) => {
    const active = button.dataset.filter === currentFilter;
    button.className = `btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`;
  });
}

function renderLeaderboard() {
  if (!currentPayload) {
    leaderboardTable.innerHTML = '<p class="text-muted">Carregando leaderboard...</p>';
    return;
  }

  const rows = refreshActivityState(currentPayload.leaderboard || []);
  const activeRows = rows.filter((row) => row.isActive);
  const filteredRows = applyFilter(rows);
  const activeCount = activeRows.length;
  const totalCount = currentPayload.totalParticipants || 0;

  boardStatus.className = 'badge badge-success';
  boardStatus.textContent = `Ao vivo: ${activeCount} ativo(s)`;
  statActive.textContent = activeCount;
  statTotal.textContent = totalCount;
  statUpdated.textContent = formatClock(currentPayload.updatedAt);
  updateFilterButtons();

  if (!filteredRows.length) {
    leaderboardTable.innerHTML = `<p class="text-muted">Nenhum participante no filtro "${filterLabel()}".</p>`;
    return;
  }

  leaderboardTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Participante</th>
          <th>ID</th>
          <th>Status</th>
          <th>Pontos</th>
          <th>Missoes</th>
          <th>Ultima atividade</th>
          <th>Acoes</th>
        </tr>
      </thead>
      <tbody>
        ${filteredRows.map((row) => `
          <tr>
            <td>${row.position}</td>
            <td>
              <strong>${escapeHtml(row.handle || 'Sem nome')}</strong>
              <div class="helper-text">ID ${escapeHtml(row.participantTag)}</div>
            </td>
            <td>#${escapeHtml(row.participantTag)}</td>
            <td>
              <span class="badge ${row.isActive ? 'badge-success' : 'badge-warning'}">
                ${row.isActive ? 'Ao vivo' : 'Inativo'}
              </span>
            </td>
            <td><strong>${row.score}</strong></td>
            <td>${row.solvedCount}</td>
            <td>${formatClock(row.lastSeenAt)}<div class="helper-text">ha ${formatAgo(row.lastSeenAt)}</div></td>
            <td>
              <button class="btn btn-secondary btn-sm" type="button" data-clear-participant="${escapeHtml(row.participantId)}">
                Limpar resultado
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.querySelectorAll('[data-clear-participant]').forEach((button) => {
    button.addEventListener('click', () => {
      openClearModal({
        participantId: button.dataset.clearParticipant,
        label: button.closest('tr')?.querySelector('strong')?.textContent || 'Participante',
      });
    });
  });
}

function ensureClearModal() {
  if (clearModalEl) return clearModalEl;

  clearModalEl = document.createElement('div');
  clearModalEl.id = 'clear-participant-modal';
  clearModalEl.style.cssText = `
    position:fixed;inset:0;background:rgba(15,23,42,.66);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px;
  `;
  clearModalEl.innerHTML = `
    <div class="card" style="max-width:520px;width:100%;box-shadow:0 30px 80px rgba(0,0,0,.35);">
      <h3 class="mt-0">Limpar resultado</h3>
      <p class="helper-text" id="clear-participant-label"></p>
      <p class="alert alert-info">Isso remove a pontuacao, as missoes concluidas e a presenca atual do participante.</p>
      <form id="clear-participant-form">
        <input id="master-password-clear-input" type="password" placeholder="Senha mestre" required style="width:100%;margin-bottom:12px;">
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" id="clear-participant-cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Limpar</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(clearModalEl);

  clearModalEl.querySelector('#clear-participant-cancel').addEventListener('click', closeClearModal);
  clearModalEl.addEventListener('click', (e) => {
    if (e.target === clearModalEl) closeClearModal();
  });

  clearModalEl.querySelector('#clear-participant-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pendingClearParticipant) return;
    const masterPassword = clearModalEl.querySelector('#master-password-clear-input').value;
    try {
      await api('/api/lab/admin/clear-participant', {
        method: 'POST',
        body: {
          participantId: pendingClearParticipant.participantId,
          masterPassword,
        },
      });
      toast(`Resultado de ${pendingClearParticipant.label} removido.`);
      closeClearModal();
      await refreshLeaderboard();
    } catch (err) {
      toast(err.message || 'Nao foi possivel limpar o resultado.');
    }
  });

  return clearModalEl;
}

function openClearModal(participant) {
  pendingClearParticipant = participant;
  const modal = ensureClearModal();
  modal.querySelector('#clear-participant-label').textContent = `Participante: ${participant.label}`;
  modal.querySelector('#master-password-clear-input').value = '';
  modal.style.display = 'flex';
  modal.querySelector('#master-password-clear-input').focus();
}

function closeClearModal() {
  if (!clearModalEl) return;
  clearModalEl.style.display = 'none';
  pendingClearParticipant = null;
}

function connectStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  const participantId = typeof getOrCreateLabParticipantId === 'function'
    ? getOrCreateLabParticipantId()
    : (localStorage.getItem('balacubaco_lab_participant_id') || '');

  const streamUrl = `/api/lab/leaderboard/stream?participantId=${encodeURIComponent(participantId)}`;
  eventSource = new EventSource(streamUrl);

  eventSource.addEventListener('ready', () => {
    boardStatus.className = 'badge badge-success';
    boardStatus.textContent = 'Conectado ao stream';
  });

  eventSource.addEventListener('leaderboard', (event) => {
    try {
      currentPayload = JSON.parse(event.data);
      renderLeaderboard();
    } catch (_err) {
      boardStatus.className = 'badge badge-danger';
      boardStatus.textContent = 'Falha ao ler dados do stream';
    }
  });

  eventSource.onerror = () => {
    boardStatus.className = 'badge badge-warning';
    boardStatus.textContent = 'Reconectando...';
  };
}

async function refreshLeaderboard() {
  const participantId = typeof getOrCreateLabParticipantId === 'function'
    ? getOrCreateLabParticipantId()
    : (localStorage.getItem('balacubaco_lab_participant_id') || '');
  const streamUrl = `/api/lab/leaderboard?participantId=${encodeURIComponent(participantId)}`;
  currentPayload = await api(streamUrl);
  renderLeaderboard();
}

async function init() {
  if (currentPayload) renderLeaderboard();

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter || 'all';
      renderLeaderboard();
    });
  });

  connectStream();

  window.addEventListener('beforeunload', () => {
    if (eventSource) eventSource.close();
  });
}

init();
