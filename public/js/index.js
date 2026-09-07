renderHeader('home');
renderFooter();

function productCard(p) {
  return `
    <a href="/produto.html?id=${p.id}" class="product-card">
      <div class="thumb"><img src="${p.image_url}" alt="${escapeHtml(p.name)}"></div>
      <div class="info">
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="rating">★★★★★ (${p.rating})</div>
        <div class="price">${formatBRL(p.price)}<small>ou 10x sem juros</small></div>
      </div>
    </a>
  `;
}

(async () => {
  try {
    const [{ products }, categories] = await Promise.all([
      api('/api/products'),
      api('/api/products/categories'),
    ]);

    document.getElementById('category-pills').innerHTML = categories.map((c) => `
      <a class="pill" href="/produtos.html?category=${encodeURIComponent(c.slug)}">${escapeHtml(c.name)}</a>
    `).join('');

    const featured = products.slice(0, 8);
    document.getElementById('featured-products').innerHTML = featured.map(productCard).join('');
  } catch (e) {
    document.getElementById('featured-products').innerHTML = `<p class="alert alert-error">Erro ao carregar produtos: ${escapeHtml(e.message)}</p>`;
  }
})();
