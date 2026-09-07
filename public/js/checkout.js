renderHeader('checkout');
renderFooter();

async function renderSummary() {
  const cart = getCart();
  const summary = document.getElementById('checkout-summary');
  if (cart.length === 0) {
    summary.innerHTML = '<p class="empty-state">Carrinho vazio.</p>';
    return;
  }
  const products = await Promise.all(cart.map((i) => api(`/api/products/${i.productId}`).catch(() => null)));
  let total = 0;
  const rows = cart.map((item, idx) => {
    const p = products[idx];
    if (!p) return '';
    total += p.price * item.quantity;
    return `<div class="flex-between"><span>${item.quantity}x ${escapeHtml(p.name)}</span><strong>${formatBRL(p.price * item.quantity)}</strong></div>`;
  }).join('');
  summary.innerHTML = `${rows}<hr><div class="flex-between"><strong>Total</strong><strong>${formatBRL(total)}</strong></div>`;
}

renderSummary();

document.getElementById('checkout-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cart = getCart();
  const alertBox = document.getElementById('checkout-alert');
  if (cart.length === 0) {
    alertBox.innerHTML = '<div class="alert alert-error">Seu carrinho esta vazio.</div>';
    return;
  }
  try {
    const order = await api('/api/orders', {
      method: 'POST',
      body: { items: cart, shipping_address: document.getElementById('address').value },
    });
    saveCart([]);
    toast('Pedido realizado com sucesso!');
    setTimeout(() => (window.location.href = `/pedidos.html?id=${order.id}`), 700);
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)} ${err.status === 401 ? '<a href="/login.html">Fazer login</a>' : ''}</div>`;
  }
});
