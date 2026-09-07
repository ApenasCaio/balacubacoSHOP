renderHeader('carrinho');
renderFooter();

async function render() {
  const cart = getCart();
  const container = document.getElementById('cart-items');

  if (cart.length === 0) {
    container.innerHTML = '<p class="empty-state">Seu carrinho esta vazio. <a href="/produtos.html">Ver produtos</a></p>';
    document.getElementById('cart-subtotal').textContent = formatBRL(0);
    document.getElementById('cart-total').textContent = formatBRL(0);
    return;
  }

  const products = await Promise.all(cart.map((i) => api(`/api/products/${i.productId}`).catch(() => null)));

  let total = 0;
  container.innerHTML = cart.map((item, idx) => {
    const p = products[idx];
    if (!p) return '';
    total += p.price * item.quantity;
    return `
      <div class="cart-row">
        <img src="${p.image_url}" alt="${escapeHtml(p.name)}">
        <div style="flex:1;">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="text-muted">${formatBRL(p.price)}</div>
        </div>
        <div class="qty-controls">
          <button data-action="dec" data-id="${p.id}">-</button>
          <span>${item.quantity}</span>
          <button data-action="inc" data-id="${p.id}">+</button>
        </div>
        <strong>${formatBRL(p.price * item.quantity)}</strong>
        <button class="btn btn-ghost btn-sm" data-action="remove" data-id="${p.id}">Remover</button>
      </div>
    `;
  }).join('');

  document.getElementById('cart-subtotal').textContent = formatBRL(total);
  document.getElementById('cart-total').textContent = formatBRL(total);

  container.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const cart = getCart();
      const item = cart.find((i) => i.productId === id);
      if (!item) return;
      if (btn.dataset.action === 'inc') item.quantity += 1;
      if (btn.dataset.action === 'dec') item.quantity = Math.max(1, item.quantity - 1);
      const next = btn.dataset.action === 'remove' ? cart.filter((i) => i.productId !== id) : cart;
      saveCart(next);
      render();
    });
  });
}

render();
