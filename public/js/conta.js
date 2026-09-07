renderHeader('conta');
renderFooter();

const area = document.getElementById('account-area');

function loginPrompt() {
  area.innerHTML = `
    <div class="card" style="grid-column:1/-1;">
      <p>Voce precisa estar logado para ver sua conta.</p>
      <a href="/login.html" class="btn btn-primary">Entrar</a>
    </div>
  `;
}

async function loadProfile() {
  const me = await api('/api/auth/me').catch(() => null);
  if (!me) { loginPrompt(); return; }

  const profile = await api(`/api/users/${me.id}`);

  area.innerHTML = `
    <div class="card">
      <h3 class="mt-0">Dados pessoais</h3>
      <div id="profile-alert"></div>
      <form id="profile-form">
        <label>Nome</label>
        <input type="text" id="p-name" value="${escapeHtml(profile.name)}">
        <label>Email</label>
        <input type="text" value="${escapeHtml(profile.email)}" disabled>
        <label>Telefone</label>
        <input type="text" id="p-phone" value="${escapeHtml(profile.phone || '')}">
        <label>Endereco</label>
        <input type="text" id="p-address" value="${escapeHtml(profile.address || '')}">
        <button class="btn btn-primary" type="submit">Salvar alteracoes</button>
      </form>

      ${profile.secret_note ? `
        <div class="alert alert-info" style="margin-top:20px;">
          <strong>Nota interna (visivel apenas para administradores):</strong><br>
          ${escapeHtml(profile.secret_note)}
        </div>` : ''}
    </div>

    <div class="card">
      <h3 class="mt-0">Foto de perfil</h3>
      <img src="${profile.avatar_url}" alt="avatar" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin-bottom:14px;">
      <form id="avatar-form">
        <label>Enviar nova foto</label>
        <input type="file" id="avatar-file" name="avatar">
        <p class="helper-text">Envie uma imagem para seu perfil.</p>
        <button class="btn btn-secondary" type="submit">Enviar foto</button>
      </form>
      <hr>
      <p class="text-muted">ID da sua conta: <strong>${profile.id}</strong> &middot; Papel: <strong>${escapeHtml(profile.role)}</strong></p>
    </div>
  `;

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(`/api/users/${me.id}`, {
        method: 'PUT',
        body: {
          name: document.getElementById('p-name').value,
          phone: document.getElementById('p-phone').value,
          address: document.getElementById('p-address').value,
        },
      });
      toast('Dados atualizados!');
    } catch (err) {
      document.getElementById('profile-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  });

  document.getElementById('avatar-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('avatar-file');
    if (!fileInput.files[0]) return;
    const formData = new FormData();
    formData.append('avatar', fileInput.files[0]);
    try {
      const res = await fetch('/api/files/avatar', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload.');
      toast('Foto enviada!');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast('Erro: ' + err.message);
    }
  });
}

loadProfile();
