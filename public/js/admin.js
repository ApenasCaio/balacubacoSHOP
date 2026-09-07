renderHeader('admin');
renderFooter();

const area = document.getElementById('admin-area');
let deleteModalEl = null;
let pendingDeleteUser = null;

function deniedView() {
  area.innerHTML = `
    <div class="card">
      <p class="alert alert-error">Acesso restrito ao administrador. Faca login com uma conta de administrador.</p>
      <a href="/login.html" class="btn btn-primary">Entrar</a>
    </div>
  `;
}

async function loadAdmin() {
  const me = await api('/api/auth/me').catch(() => null);
  if (!me || me.role !== 'admin') { deniedView(); return; }

  area.innerHTML = `
    <div class="grid-3" id="admin-stats" style="margin-bottom:24px;"></div>
    <div class="card">
      <h3 class="mt-0">Usuarios cadastrados</h3>
      <div id="admin-users"><p class="text-muted">Carregando...</p></div>
    </div>
    <div class="card" style="margin-top:20px;">
      <h3 class="mt-0">Moderacao de avaliacoes</h3>
      <p class="helper-text">As avaliacoes abaixo sao exibidas exatamente como foram enviadas pelos clientes.</p>
      <div id="admin-reviews"><p class="text-muted">Carregando...</p></div>
    </div>
    <div class="card" style="margin-top:20px;">
      <h3 class="mt-0">Chamados de suporte</h3>
      <div id="admin-tickets"><p class="text-muted">Carregando...</p></div>
    </div>
  `;

  const stats = await fetch('/api/admin/dashboard', { credentials: 'include', headers: { 'X-Role': 'admin' } })
    .then((r) => r.json()).catch(() => null);
  if (stats) {
    document.getElementById('admin-stats').innerHTML = `
      <div class="card"><div class="text-muted">Usuarios</div><div style="font-size:28px;font-weight:800;">${stats.totalUsers}</div></div>
      <div class="card"><div class="text-muted">Pedidos</div><div style="font-size:28px;font-weight:800;">${stats.totalOrders}</div></div>
      <div class="card"><div class="text-muted">Receita total</div><div style="font-size:28px;font-weight:800;">${formatBRL(stats.totalRevenue)}</div></div>
    `;
  }

  const users = await api('/api/admin/users').catch(() => []);
  document.getElementById('admin-users').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Nome</th><th>Email</th><th>Papel</th><th>Acoes</th></tr></thead>
      <tbody>
        ${users.map((u) => `
          <tr>
            <td>${u.id}</td>
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td><span class="badge badge-info">${escapeHtml(u.role)}</span></td>
            <td>
              <button class="btn btn-sm btn-secondary" type="button" data-delete-user="${u.id}" ${u.id === 1 ? 'disabled' : ''}>Excluir</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const reviews = await api('/api/admin/reviews').catch(() => []);
  document.getElementById('admin-reviews').innerHTML = reviews.length
    ? reviews.map((r) => `
        <div style="border-bottom:1px solid var(--border);padding:10px 0;">
          <strong>${r.author_name}</strong> em <em>${escapeHtml(r.product_name)}</em>
          <p>${r.comment}</p>
        </div>
      `).join('')
    : '<p class="text-muted">Nenhuma avaliacao ainda.</p>';

  const tickets = await api('/api/admin/tickets').catch(() => []);
  document.getElementById('admin-tickets').innerHTML = tickets.length
    ? `<table>
        <thead><tr><th>Assunto</th><th>Cliente</th><th>Status</th></tr></thead>
        <tbody>${tickets.map((t) => `<tr><td>${escapeHtml(t.subject)}</td><td>${escapeHtml(t.name)}</td><td><span class="badge badge-warning">${escapeHtml(t.status)}</span></td></tr>`).join('')}</tbody>
      </table>`
    : '<p class="text-muted">Nenhum chamado aberto.</p>';

  document.querySelectorAll('[data-delete-user]').forEach((button) => {
    button.addEventListener('click', () => {
      const userId = Number(button.dataset.deleteUser);
      const row = button.closest('tr');
      const name = row ? row.children[1].textContent.trim() : `#${userId}`;
      openDeleteModal({ id: userId, name });
    });
  });
}

function ensureDeleteModal() {
  if (deleteModalEl) return deleteModalEl;

  deleteModalEl = document.createElement('div');
  deleteModalEl.id = 'delete-user-modal';
  deleteModalEl.style.cssText = `
    position:fixed;inset:0;background:rgba(15,23,42,.66);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px;
  `;
  deleteModalEl.innerHTML = `
    <div class="card" style="max-width:520px;width:100%;box-shadow:0 30px 80px rgba(0,0,0,.35);">
      <h3 class="mt-0">Excluir usuario</h3>
      <p class="helper-text" id="delete-user-label"></p>
      <p class="alert alert-info">Confirme com a senha mestre para remover o registro e os dados associados.</p>
      <form id="delete-user-form">
        <input id="master-password-input" type="password" placeholder="Senha mestre" required style="width:100%;margin-bottom:12px;">
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" id="delete-user-cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Excluir</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(deleteModalEl);

  deleteModalEl.querySelector('#delete-user-cancel').addEventListener('click', closeDeleteModal);
  deleteModalEl.addEventListener('click', (e) => {
    if (e.target === deleteModalEl) closeDeleteModal();
  });

  deleteModalEl.querySelector('#delete-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pendingDeleteUser) return;
    const masterPassword = deleteModalEl.querySelector('#master-password-input').value;
    try {
      await api(`/api/users/${pendingDeleteUser.id}`, {
        method: 'DELETE',
        body: { masterPassword },
      });
      toast(`Usuario ${pendingDeleteUser.name} excluido.`);
      closeDeleteModal();
      await loadAdmin();
    } catch (err) {
      toast(err.message || 'Nao foi possivel excluir.');
    }
  });

  return deleteModalEl;
}

function openDeleteModal(user) {
  pendingDeleteUser = user;
  const modal = ensureDeleteModal();
  modal.querySelector('#delete-user-label').textContent = `Usuario: ${user.name} (#${user.id})`;
  modal.querySelector('#master-password-input').value = '';
  modal.style.display = 'flex';
  modal.querySelector('#master-password-input').focus();
}

function closeDeleteModal() {
  if (!deleteModalEl) return;
  deleteModalEl.style.display = 'none';
  pendingDeleteUser = null;
}

loadAdmin();
