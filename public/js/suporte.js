renderHeader('suporte');
renderFooter();

document.getElementById('support-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = document.getElementById('support-alert');
  try {
    await api('/api/support', {
      method: 'POST',
      body: {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value,
      },
    });
    alertBox.innerHTML = '<div class="alert alert-success">Mensagem enviada! Em breve entraremos em contato.</div>';
    e.target.reset();
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
});
