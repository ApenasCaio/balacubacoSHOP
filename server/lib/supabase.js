const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mmomfwrxxatysobuvwgs.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_DZwMDQNLwBwMOGF4BCt2fw_Cry70_3a';

function buildHeaders(extra = {}, prefer) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
    ...extra,
  };
  return headers;
}

async function supabaseRequest(path, options = {}) {
  const { method = 'GET', query, body, prefer, headers = {} } = options;
  const url = new URL(path.startsWith('http') ? path : `${SUPABASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, value);
    }
  }

  const hasBody = body !== undefined;
  const requestHeaders = {
    ...headers,
    ...(hasBody ? { 'Content-Type': 'application/json', Accept: 'application/json' } : {}),
  };

  const response = await fetch(url, {
    method,
    headers: buildHeaders(requestHeaders, prefer),
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_err) {
      data = text;
    }
  }

  if (!response.ok) {
    const error = new Error((data && data.message) || (data && data.error) || `Supabase request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function toQueryString(filters = []) {
  const query = {};
  for (const filter of filters) {
    const [column, operator, value] = filter;
    query[column] = `${operator}.${value}`;
  }
  return query;
}

function selectRows(table, { select = '*', filters = [], order, limit } = {}) {
  const query = { select, ...toQueryString(filters) };
  if (order) query.order = order;
  if (limit) query.limit = String(limit);
  return supabaseRequest(`/rest/v1/${table}`, { query });
}

async function selectOne(table, filters = [], select = '*') {
  const rows = await selectRows(table, { select, filters, limit: 1 });
  return rows[0] || null;
}

function insertRows(table, rows) {
  return supabaseRequest(`/rest/v1/${table}`, {
    method: 'POST',
    prefer: 'return=representation',
    body: Array.isArray(rows) ? rows : [rows],
  });
}

function updateRows(table, filters, values) {
  return supabaseRequest(`/rest/v1/${table}`, {
    method: 'PATCH',
    query: toQueryString(filters),
    prefer: 'return=representation',
    body: values,
  });
}

function deleteRows(table, filters) {
  return supabaseRequest(`/rest/v1/${table}`, {
    method: 'DELETE',
    query: toQueryString(filters),
  });
}

function rpc(name, args) {
  return supabaseRequest(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    prefer: 'return=representation',
    body: args,
  });
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_KEY,
  supabaseRequest,
  selectRows,
  selectOne,
  insertRows,
  updateRows,
  deleteRows,
  rpc,
};
