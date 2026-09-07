// BalacubacoSHOP - logica compartilhada de front-end (header, carrinho, helpers).

const CART_KEY = 'balacubaco_cart';
const LAB_PARTICIPANT_KEY = 'balacubaco_lab_participant_id';

function getOrCreateLabParticipantId() {
  try {
    let id = localStorage.getItem(LAB_PARTICIPANT_KEY);
    if (!id) {
      id = (crypto && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `lab_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
      localStorage.setItem(LAB_PARTICIPANT_KEY, id);
    }
    return id;
  } catch (_e) {
    return '';
  }
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function api(path, options = {}) {
  const labHandle = localStorage.getItem('balacubaco_lab_handle') || '';
  const labParticipantId = getOrCreateLabParticipantId();
  const headers = {
    'Content-Type': 'application/json',
    ...(labHandle ? { 'X-Lab-Handle': labHandle } : {}),
    ...(labParticipantId ? { 'X-Lab-Participant-Id': labParticipantId } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(path, {
    credentials: 'include',
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_e) { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Erro na requisicao (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 2600);
}

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (_e) { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}
function addToCart(productId, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((i) => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else cart.push({ productId, quantity });
  saveCart(cart);
  toast('Produto adicionado ao carrinho!');
}
function cartCount() {
  return getCart().reduce((acc, i) => acc + i.quantity, 0);
}
function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = cartCount();
}

async function getCurrentUser() {
  try { return await api('/api/auth/me'); } catch (_e) { return null; }
}

function renderHeader(activePage) {
  const header = document.getElementById('site-header');
  if (!header) return;
  header.innerHTML = `
    <div class="topbar">
      <div class="container">
        <span>Frete gratis para compras acima de R$ 299 em todo o Brasil</span>
        <span><a href="/lab.html">Laboratorio de Seguranca</a></span>
      </div>
    </div>
    <div class="container header-inner">
      <a href="/index.html" class="logo">Balacubaco<span class="dot">SHOP</span></a>
      <form class="search-bar" action="/produtos.html" method="get">
        <input type="text" name="q" placeholder="Buscar produtos, marcas e mais...">
        <button type="submit">Buscar</button>
      </form>
      <div class="header-actions" id="header-actions">
        <a href="/conta.html">Minha conta</a>
        <a href="/pedidos.html">Pedidos</a>
        <a href="/carrinho.html">Carrinho <span class="cart-badge" id="cart-count">0</span></a>
      </div>
    </div>
    <nav class="main-nav">
      <div class="container">
        <a href="/produtos.html">Todos os produtos</a>
        <a href="/produtos.html?category=smartphones">Smartphones</a>
        <a href="/produtos.html?category=notebooks">Notebooks</a>
        <a href="/produtos.html?category=audio">Audio</a>
        <a href="/produtos.html?category=acessorios">Acessorios</a>
        <a href="/produtos.html?category=casa-inteligente">Casa Inteligente</a>
        <a href="/suporte.html">Suporte</a>
        <a href="/lab.html">🛡 Security Lab</a>
      </div>
    </nav>
  `;
  updateCartBadge();

  getCurrentUser().then((user) => {
    const actions = document.getElementById('header-actions');
    if (!actions) return;
    if (user) {
      actions.innerHTML = `
        <a href="/conta.html">Ola, ${escapeHtml(user.name.split(' ')[0])}</a>
        ${user.role === 'admin' ? '<a href="/admin.html">Painel Admin</a>' : ''}
        <a href="/pedidos.html">Pedidos</a>
        <a href="#" id="logout-link">Sair</a>
        <a href="/carrinho.html">Carrinho <span class="cart-badge" id="cart-count">0</span></a>
      `;
      updateCartBadge();
      document.getElementById('logout-link').addEventListener('click', async (e) => {
        e.preventDefault();
        await api('/api/auth/logout', { method: 'POST' });
        toast('Voce saiu da sua conta.');
        setTimeout(() => (window.location.href = '/index.html'), 600);
      });
    }
  });
}

function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;
  footer.innerHTML = `
    <div class="container">
      <div>
        <h4>BalacubacoSHOP</h4>
        <a href="/index.html">Sobre a loja</a>
        <a href="/suporte.html">Fale conosco</a>
        <a href="/lab.html">Laboratorio de Seguranca</a>
      </div>
      <div>
        <h4>Minha Conta</h4>
        <a href="/login.html">Entrar</a>
        <a href="/cadastro.html">Criar conta</a>
        <a href="/pedidos.html">Meus pedidos</a>
      </div>
      <div>
        <h4>Ajuda</h4>
        <a href="/suporte.html">Central de ajuda</a>
        <a href="/suporte.html">Trocas e devolucoes</a>
      </div>
      <div>
        <h4>BalacubacoSHOP</h4>
        <p class="text-muted">Loja ficticia criada para fins educacionais de seguranca da informacao. Nenhum produto real e vendido aqui.</p>
      </div>
    </div>
    <div class="footer-bottom">© 2026 BalacubacoSHOP - Laboratorio educacional. CNPJ ficticio 00.000.000/0001-00.</div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
});
