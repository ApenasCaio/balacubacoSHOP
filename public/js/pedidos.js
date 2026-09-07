renderHeader('pedidos');
renderFooter();

const area = document.getElementById('orders-area');
const orderId = new URLSearchParams(window.location.search).get('id');

function statusBadge(status) {
  const map = { entregue: 'success', enviado: 'info', processando: 'warning', cancelado: 'danger' };
  return `<span class="badge badge-${map[status] || 'info'}">${escapeHtml(status)}</span>`;
}

async function renderOrderDetail(id) {
  try {
    const order = await api(`/api/orders/${id}`);
    area.innerHTML = `
      <div class="card">
        <div class="flex-between">
          <h3 class="mt-0">Pedido #${order.id}</h3>
          ${statusBadge(order.status)}
        </div>
        <p class="text-muted">Realizado em ${new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
        <p><strong>Endereco de entrega:</strong> ${escapeHtml(order.shipping_address || '-')}</p>
        <table>
          <thead><tr><th>Produto</th><th>Qtd</th><th>Preco</th></tr></thead>
          <tbody>
            ${order.items.map((i) => `<tr><td>${escapeHtml(i.product_name)}</td><td>${i.quantity}</td><td>${formatBRL(i.price)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="flex-between" style="margin-top:14px;">
          <strong>Total: ${formatBRL(order.total)}</strong>
          ${order.status !== 'cancelado' ? `<button class="btn btn-danger btn-sm" id="cancel-btn">Cancelar pedido</button>` : ''}
        </div>
        ${order.internal_note ? `<div class="alert alert-info" style="margin-top:14px;"><strong>Nota interna:</strong> ${escapeHtml(order.internal_note)}</div>` : ''}
        <a href="/pedidos.html" class="btn btn-ghost btn-sm" style="margin-top:14px;">&larr; Voltar para meus pedidos</a>
      </div>
    `;
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', async () => {
        await api(`/api/orders/${order.id}/cancel`, { method: 'POST' });
        toast('Pedido cancelado.');
        renderOrderDetail(order.id);
      });
    }
  } catch (e) {
    area.innerHTML = `<p class="alert alert-error">Pedido nao encontrado.</p>`;
  }
}

async function renderOrderList() {
  try {
    const orders = await api('/api/orders');
    if (orders.length === 0) {
      area.innerHTML = '<p class="empty-state">Voce ainda nao fez nenhum pedido.</p>';
      return;
    }
    area.innerHTML = `
      <div class="card">
        <table>
          <thead><tr><th>Pedido</th><th>Data</th><th>Status</th><th>Total</th><th></th></tr></thead>
          <tbody>
            ${orders.map((o) => `
              <tr>
                <td>#${o.id}</td>
                <td>${new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                <td>${statusBadge(o.status)}</td>
                <td>${formatBRL(o.total)}</td>
                <td><a href="/pedidos.html?id=${o.id}" class="btn btn-ghost btn-sm">Ver detalhes</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    area.innerHTML = `
      <div class="card">
        <p>Voce precisa estar logado para ver seus pedidos.</p>
        <a href="/login.html" class="btn btn-primary">Entrar</a>
      </div>
    `;
  }
}

if (orderId) renderOrderDetail(orderId);
else renderOrderList();
