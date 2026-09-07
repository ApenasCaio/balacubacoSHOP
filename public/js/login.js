renderHeader('login');
renderFooter();

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const alertBox = document.getElementById('login-alert');
  alertBox.innerHTML = '';

  try {
    const user = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    toast(`Bem-vindo(a), ${user.name}!`);
    setTimeout(() => (window.location.href = '/conta.html'), 500);
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
});
