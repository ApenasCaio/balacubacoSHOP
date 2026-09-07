renderHeader('produtos');
renderFooter();

const params = new URLSearchParams(window.location.search);
const q = params.get('q');
const category = params.get('category');

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
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (category) qs.set('category', category);

    const data = await api(`/api/products?${qs.toString()}`);

    const titleEl = document.getElementById('results-title');
    if (data.queryEcho) {
      titleEl.innerHTML = `Resultados da busca por: "${data.queryEcho}"`;
    } else if (category) {
      titleEl.textContent = `Categoria: ${category}`;
    } else {
      titleEl.textContent = 'Todos os produtos';
    }

    const categories = await api('/api/products/categories');
    document.getElementById('category-pills').innerHTML = categories.map((c) => `
      <a class="pill ${c.slug === category ? 'active' : ''}" href="/produtos.html?category=${encodeURIComponent(c.slug)}">${escapeHtml(c.name)}</a>
    `).join('');

    const list = document.getElementById('product-list');
    if (data.products.length === 0) {
      list.innerHTML = '<p class="empty-state">Nenhum produto encontrado.</p>';
    } else {
      list.innerHTML = data.products.map(productCard).join('');
    }
  } catch (e) {
    document.getElementById('product-list').innerHTML = `<p class="alert alert-error">Erro: ${escapeHtml(e.message)}</p>`;
  }
})();
