renderHeader('cadastro');
renderFooter();

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const alertBox = document.getElementById('register-alert');
  alertBox.innerHTML = '';

  try {
    const user = await api('/api/auth/register', { method: 'POST', body: { name, email, password } });
    toast(`Conta criada! Bem-vindo(a), ${user.name}.`);
    setTimeout(() => (window.location.href = '/conta.html'), 500);
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
});
