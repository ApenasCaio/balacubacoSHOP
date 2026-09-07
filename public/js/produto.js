renderHeader('produto');
renderFooter();

const productId = new URLSearchParams(window.location.search).get('id');

function renderProduct(p) {
  document.getElementById('product-detail').innerHTML = `
    <div class="card">
      <div class="thumb" style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:30px;display:flex;align-items:center;justify-content:center;">
        <img src="${p.image_url}" alt="${escapeHtml(p.name)}">
      </div>
    </div>
    <div class="card">
      <h1 class="mt-0">${escapeHtml(p.name)}</h1>
      <div class="rating">★★★★★ (${p.rating}) &middot; ${escapeHtml(String(p.stock))} em estoque</div>
      <p class="text-muted">${escapeHtml(p.description)}</p>
      <div class="price" style="font-size:30px;font-weight:800;color:var(--brand-purple);">${formatBRL(p.price)}</div>
      <p class="helper-text">em ate 10x sem juros no cartao</p>
      <div class="flex gap-10" style="margin-top:16px;">
        <input type="number" id="qty" value="1" min="1" style="width:80px;">
        <button class="btn btn-primary" id="add-to-cart">Adicionar ao carrinho</button>
      </div>
    </div>
  `;
  document.getElementById('add-to-cart').addEventListener('click', () => {
    const qty = parseInt(document.getElementById('qty').value, 10) || 1;
    addToCart(p.id, qty);
  });
}

function renderReviews(reviews) {
  const list = document.getElementById('reviews-list');
  if (reviews.length === 0) {
    list.innerHTML = '<p class="text-muted">Nenhuma avaliacao ainda. Seja o primeiro a avaliar!</p>';
    return;
  }
  list.innerHTML = reviews.map((r) => `
    <div style="border-bottom:1px solid var(--border);padding:14px 0;">
      <strong>${r.author_name}</strong>
      <span class="rating">${'★'.repeat(r.rating)}</span>
      <p>${r.comment}</p>
      <span class="helper-text">${new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
    </div>
  `).join('');
}

(async () => {
  try {
    const [product, reviews] = await Promise.all([
      api(`/api/products/${productId}`),
      api(`/api/products/${productId}/reviews`),
    ]);
    document.title = `${product.name} - BalacubacoSHOP`;
    renderProduct(product);
    renderReviews(reviews);
  } catch (e) {
    document.getElementById('product-detail').innerHTML = `<p class="alert alert-error">Produto nao encontrado.</p>`;
  }
})();

document.getElementById('review-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const author_name = document.getElementById('review-name').value;
  const rating = document.getElementById('review-rating').value;
  const comment = document.getElementById('review-comment').value;
  try {
    await api(`/api/products/${productId}/reviews`, { method: 'POST', body: { author_name, rating, comment } });
    toast('Avaliacao enviada com sucesso!');
    const reviews = await api(`/api/products/${productId}/reviews`);
    renderReviews(reviews);
    e.target.reset();
  } catch (err) {
    toast('Erro ao enviar avaliacao: ' + err.message);
  }
});
