const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'balacubaco.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const isNewDb = !fs.existsSync(DB_PATH);
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Weak, unsalted hash on purpose - part of the "insecure session/credential
// handling" storyline for the lab. DO NOT copy this pattern into real apps.
function weakHash(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  cpf TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT DEFAULT '/images/avatar-default.svg',
  secret_note TEXT,
  idor_flag TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  category_id INTEGER,
  image_url TEXT,
  stock INTEGER DEFAULT 10,
  rating REAL DEFAULT 4.5,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id INTEGER,
  author_name TEXT,
  rating INTEGER DEFAULT 5,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT DEFAULT 'processando',
  total REAL NOT NULL,
  shipping_address TEXT,
  internal_note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'aberto',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  description TEXT NOT NULL,
  objective TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 100,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id INTEGER NOT NULL,
  flag_value TEXT NOT NULL,
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS lab_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  handle TEXT NOT NULL,
  mission_code TEXT NOT NULL,
  solved_at TEXT DEFAULT (datetime('now')),
  UNIQUE(participant_id, mission_code)
);
`;

db.exec(SCHEMA);

function migrateLabProgressTable() {
  const columns = db.prepare('PRAGMA table_info(lab_progress)').all();
  const hasParticipantId = columns.some((col) => col.name === 'participant_id');
  const hasSessionId = columns.some((col) => col.name === 'session_id');
  if (hasParticipantId) return;

  db.exec('BEGIN');
  try {
    db.exec('ALTER TABLE lab_progress RENAME TO lab_progress_old');
    db.exec(`
      CREATE TABLE lab_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        handle TEXT NOT NULL,
        mission_code TEXT NOT NULL,
        solved_at TEXT DEFAULT (datetime('now')),
        UNIQUE(participant_id, mission_code)
      )
    `);
    db.exec(`
      INSERT INTO lab_progress (participant_id, session_id, handle, mission_code, solved_at)
      SELECT
        COALESCE(session_id, handle),
        COALESCE(session_id, handle),
        handle,
        mission_code,
        solved_at
      FROM lab_progress_old
    `);
    db.exec('DROP TABLE lab_progress_old');
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

migrateLabProgressTable();

if (isNewDb) {
  seed();
}

function seed() {
  const insertCategory = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  const categories = {
    smartphones: insertCategory.run('Smartphones', 'smartphones').lastInsertRowid,
    notebooks: insertCategory.run('Notebooks', 'notebooks').lastInsertRowid,
    audio: insertCategory.run('Audio', 'audio').lastInsertRowid,
    acessorios: insertCategory.run('Acessorios', 'acessorios').lastInsertRowid,
    casa: insertCategory.run('Casa Inteligente', 'casa-inteligente').lastInsertRowid,
  };

  const insertProduct = db.prepare(`
    INSERT INTO products (name, slug, description, price, category_id, image_url, stock, rating)
    VALUES (@name, @slug, @description, @price, @category_id, @image_url, @stock, @rating)
  `);

  const products = [
    {
      name: 'Balaphone X12 Pro',
      slug: 'balaphone-x12-pro',
      description: 'O smartphone mais balacubaco do Brasil. Tela AMOLED 6.7", 256GB, camera tripla de 108MP e bateria de 5000mAh que dura o carnaval inteiro.',
      price: 3299.9,
      category_id: categories.smartphones,
      image_url: '/images/products/balaphone-x12.svg',
      stock: 42,
      rating: 4.8,
    },
    {
      name: 'Balaphone Mini 5G',
      slug: 'balaphone-mini-5g',
      description: 'Compacto, rapido e com 5G. Perfeito para quem quer potencia sem pesar no bolso (nem na carteira).',
      price: 1899.0,
      category_id: categories.smartphones,
      image_url: '/images/products/balaphone-mini.svg',
      stock: 65,
      rating: 4.5,
    },
    {
      name: 'NoteCuba 15 Ultra',
      slug: 'notecuba-15-ultra',
      description: 'Notebook para trabalho e estudo com processador de ultima geracao, 16GB RAM e SSD de 512GB. Roda ate os relatorios mais chatos.',
      price: 4599.0,
      category_id: categories.notebooks,
      image_url: '/images/products/notecuba-15.svg',
      stock: 20,
      rating: 4.6,
    },
    {
      name: 'NoteCuba Slim Air',
      slug: 'notecuba-slim-air',
      description: 'Ultrafino, ultraleve, ultra balacubaco. Ideal para levar na mochila e no coracao.',
      price: 3899.0,
      category_id: categories.notebooks,
      image_url: '/images/products/notecuba-slim.svg',
      stock: 15,
      rating: 4.4,
    },
    {
      name: 'Fone BalaBeats Pro',
      slug: 'fone-balabeats-pro',
      description: 'Fone de ouvido bluetooth com cancelamento de ruido ativo. Ouca seu funk favorito sem incomodar ninguem (ou incomode, a escolha e sua).',
      price: 349.9,
      category_id: categories.audio,
      image_url: '/images/products/balabeats-pro.svg',
      stock: 120,
      rating: 4.7,
    },
    {
      name: 'Caixa de Som BalaBoom 360',
      slug: 'caixa-balaboom-360',
      description: 'Som 360 graus, resistente a agua e a pancadao de churrasco. Bateria de 20 horas.',
      price: 459.0,
      category_id: categories.audio,
      image_url: '/images/products/balaboom-360.svg',
      stock: 55,
      rating: 4.3,
    },
    {
      name: 'Smartwatch Balaband Fit',
      slug: 'smartwatch-balaband-fit',
      description: 'Monitore seus passos, batimentos e o quanto voce esta balacubaco hoje.',
      price: 599.0,
      category_id: categories.acessorios,
      image_url: '/images/products/balaband-fit.svg',
      stock: 80,
      rating: 4.2,
    },
    {
      name: 'Carregador Turbo BalaCharge 65W',
      slug: 'carregador-balacharge-65w',
      description: 'Carrega seu celular mais rapido que voce fala "balacubaco" tres vezes.',
      price: 129.9,
      category_id: categories.acessorios,
      image_url: '/images/products/balacharge-65w.svg',
      stock: 200,
      rating: 4.6,
    },
    {
      name: 'Lampada Inteligente BalaLux',
      slug: 'lampada-balalux',
      description: 'Controle pelo app, mude de cor, sincronize com sua musica. Casa inteligente, custo inteligente.',
      price: 89.9,
      category_id: categories.casa,
      image_url: '/images/products/balalux.svg',
      stock: 150,
      rating: 4.1,
    },
    {
      name: 'Assistente Virtual BalaHome',
      slug: 'assistente-balahome',
      description: 'Pergunte as horas, o clima, ou o sentido da vida (essa ela ainda esta aprendendo).',
      price: 349.0,
      category_id: categories.casa,
      image_url: '/images/products/balahome.svg',
      stock: 33,
      rating: 4.4,
    },
    {
      name: 'Power Bank BalaCharge 20000mAh',
      slug: 'powerbank-balacharge-20000',
      description: 'Energia de sobra para o dia inteiro de reels e stories.',
      price: 179.9,
      category_id: categories.acessorios,
      image_url: '/images/products/powerbank-20000.svg',
      stock: 90,
      rating: 4.5,
    },
    {
      name: 'Balaphone Z Fold Flex',
      slug: 'balaphone-z-fold-flex',
      description: 'Tela dobravel, design premium e aquele efeito "uau" na roda de amigos.',
      price: 6999.0,
      category_id: categories.smartphones,
      image_url: '/images/products/balaphone-zfold.svg',
      stock: 12,
      rating: 4.9,
    },
  ];

  const productIds = {};
  for (const p of products) {
    const id = insertProduct.run(p).lastInsertRowid;
    productIds[p.slug] = id;
  }

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, cpf, phone, address, avatar_url, secret_note, idor_flag)
    VALUES (@name, @email, @password, @role, @cpf, @phone, @address, @avatar_url, @secret_note, @idor_flag)
  `);

  // Admin password is intentionally random/unknown and never documented -
  // the only realistic way in is the SQL injection login bypass (Mission 01).
  const adminPassword = crypto.randomBytes(16).toString('hex');

  const users = [
    {
      name: 'Administrador BalacubacoSHOP',
      email: 'admin@balacubacoshop.com.br',
      password: weakHash(adminPassword),
      role: 'admin',
      cpf: '000.000.000-00',
      phone: '(11) 90000-0000',
      address: 'Rua da Administracao, 1 - Sao Paulo/SP',
      avatar_url: '/images/avatar-admin.svg',
      secret_note: 'Nota interna (RH): revisar acessos no proximo sprint. Flag do laboratorio - Missao 01 (SQL Injection / Autenticacao): BALACUBACO{sql_1nj3ct10n_l0g1n}',
      idor_flag: 'BALACUBACO{1d0r_perfil_usuario}',
    },
    {
      name: 'Joao Pereira',
      email: 'joao.pereira@example.com',
      password: weakHash('futebol123'),
      role: 'customer',
      cpf: '123.456.789-01',
      phone: '(21) 98888-1234',
      address: 'Av. das Palmeiras, 220 - Rio de Janeiro/RJ',
      avatar_url: '/images/avatar-default.svg',
      secret_note: null,
      idor_flag: null,
    },
    {
      name: 'Maria Souza',
      email: 'maria.souza@example.com',
      password: weakHash('brasil2024'),
      role: 'customer',
      cpf: '234.567.890-12',
      phone: '(31) 97777-5678',
      address: 'Rua das Acacias, 88 - Belo Horizonte/MG',
      avatar_url: '/images/avatar-default.svg',
      secret_note: null,
      idor_flag: null,
    },
    {
      name: 'Carlos Andrade',
      email: 'carlos.andrade@example.com',
      password: weakHash('senha123'),
      role: 'customer',
      cpf: '345.678.901-23',
      phone: '(41) 96666-4321',
      address: 'Rua XV de Novembro, 500 - Curitiba/PR',
      avatar_url: '/images/avatar-default.svg',
      secret_note: null,
      idor_flag: null,
    },
    {
      name: 'Ana Beatriz Lima',
      email: 'ana.lima@example.com',
      password: weakHash('123456'),
      role: 'customer',
      cpf: '456.789.012-34',
      phone: '(85) 95555-8765',
      address: 'Av. Beira Mar, 1200 - Fortaleza/CE',
      avatar_url: '/images/avatar-default.svg',
      secret_note: null,
      idor_flag: null,
    },
  ];

  const userIds = {};
  for (const u of users) {
    const id = insertUser.run(u).lastInsertRowid;
    userIds[u.email] = id;
  }

  const insertReview = db.prepare(`
    INSERT INTO reviews (product_id, user_id, author_name, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertReview.run(productIds['balaphone-x12-pro'], userIds['joao.pereira@example.com'], 'Joao Pereira', 5, 'Chegou rapido e a camera e sensacional! Recomendo demais.');
  insertReview.run(productIds['balaphone-x12-pro'], userIds['maria.souza@example.com'], 'Maria Souza', 4, 'Bateria dura o dia todo, mas achei meio pesado.');
  insertReview.run(productIds['notecuba-15-ultra'], userIds['carlos.andrade@example.com'], 'Carlos Andrade', 5, 'Excelente para trabalho remoto, tela linda.');
  insertReview.run(productIds['fone-balabeats-pro'], userIds['ana.lima@example.com'], 'Ana Beatriz Lima', 5, 'Som incrivel, cancelamento de ruido funciona muito bem!');
  insertReview.run(productIds['caixa-balaboom-360'], userIds['joao.pereira@example.com'], 'Joao Pereira', 4, 'Boa caixa de som, poderia ter mais grave.');
  insertReview.run(productIds['smartwatch-balaband-fit'], userIds['maria.souza@example.com'], 'Maria Souza', 3, 'Bonito mas o app trava as vezes.');

  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, status, total, shipping_address, internal_note)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES (?, ?, ?, ?)
  `);

  const order1 = insertOrder.run(
    userIds['joao.pereira@example.com'],
    'entregue',
    3299.9,
    'Av. das Palmeiras, 220 - Rio de Janeiro/RJ',
    null
  ).lastInsertRowid;
  insertOrderItem.run(order1, productIds['balaphone-x12-pro'], 1, 3299.9);

  const order2 = insertOrder.run(
    userIds['maria.souza@example.com'],
    'enviado',
    808.9,
    'Rua das Acacias, 88 - Belo Horizonte/MG',
    null
  ).lastInsertRowid;
  insertOrderItem.run(order2, productIds['fone-balabeats-pro'], 1, 349.9);
  insertOrderItem.run(order2, productIds['smartwatch-balaband-fit'], 1, 459.0);

  // "VIP" order belonging to the admin account, used as the Mission 06 IDOR target.
  const orderVip = insertOrder.run(
    userIds['admin@balacubacoshop.com.br'],
    'processando',
    6999.0,
    'Rua da Administracao, 1 - Sao Paulo/SP (pedido interno / teste)',
    'Pedido de teste interno. NAO enviar para producao. Flag do laboratorio - Missao 06 (IDOR / Pedidos): BALACUBACO{idor_pedidos}'
  ).lastInsertRowid;
  insertOrderItem.run(orderVip, productIds['balaphone-z-fold-flex'], 1, 6999.0);

  const insertTicket = db.prepare(`
    INSERT INTO support_tickets (user_id, name, email, subject, message, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertTicket.run(
    userIds['carlos.andrade@example.com'],
    'Carlos Andrade',
    'carlos.andrade@example.com',
    'Duvida sobre garantia',
    'Boa tarde, gostaria de saber o prazo de garantia do NoteCuba 15 Ultra.',
    'aberto'
  );
  insertTicket.run(
    userIds['ana.lima@example.com'],
    'Ana Beatriz Lima',
    'ana.lima@example.com',
    'Troca de produto',
    'Recebi o smartwatch com o vidro riscado, posso trocar?',
    'aberto'
  );

  const insertMission = db.prepare(`
    INSERT INTO missions (code, title, category, difficulty, description, objective, points, sort_order)
    VALUES (@code, @title, @category, @difficulty, @description, @objective, @points, @sort_order)
  `);
  const insertFlag = db.prepare('INSERT INTO flags (mission_id, flag_value) VALUES (?, ?)');

  const missions = [
    {
      code: 'M01',
      title: 'Autenticacao',
      category: 'SQL Injection / Sessao Insegura',
      difficulty: 'Facil',
      description: 'A pagina de login do BalacubacoSHOP processa as credenciais de um jeito... peculiar. A senha do administrador nunca foi divulgada em lugar nenhum.',
      objective: 'Autentique-se como administrador sem conhecer a senha real e localize a nota interna exibida na conta.',
      points: 100,
      sort_order: 1,
      flag: 'BALACUBACO{sql_1nj3ct10n_l0g1n}',
    },
    {
      code: 'M02',
      title: 'Dados de Usuario',
      category: 'IDOR / Broken Object Level Authorization',
      difficulty: 'Facil',
      description: 'A area "Minha Conta" busca seus dados via API usando um identificador numerico. Sera que a API confere direito de quem pode ver o que?',
      objective: 'Como um cliente comum, acesse os dados de outro usuario (incluindo o administrador) trocando o identificador na chamada da API.',
      points: 150,
      sort_order: 2,
      flag: 'BALACUBACO{1d0r_perfil_usuario}',
    },
    {
      code: 'M03',
      title: 'Avaliacoes de Produtos',
      category: 'Cross-Site Scripting (Stored & Reflected)',
      difficulty: 'Medio',
      description: 'Os comentarios de avaliacao de produtos sao exibidos tal como foram enviados. A busca do site tambem "ecoa" o termo pesquisado na tela de resultados.',
      objective: 'Envie uma avaliacao contendo um payload de XSS que seja executado na pagina do produto e no painel de moderacao do administrador.',
      points: 150,
      sort_order: 3,
      flag: 'BALACUBACO{xss_avaliacoes}',
    },
    {
      code: 'M04',
      title: 'Administracao',
      category: 'Broken Access Control',
      difficulty: 'Medio',
      description: 'O painel administrativo decide o que mostrar no navegador olhando para uma informacao que... o proprio navegador envia. Sera que da para confiar nisso?',
      objective: 'Sem fazer login como administrador, force o acesso ao endpoint de dashboard administrativo manipulando cookies/headers da requisicao.',
      points: 200,
      sort_order: 4,
      flag: 'BALACUBACO{broken_access_admin}',
    },
    {
      code: 'M05',
      title: 'Upload de Arquivos',
      category: 'Insecure File Upload / Path Traversal',
      difficulty: 'Dificil',
      description: 'A troca de foto de perfil aceita qualquer tipo de arquivo, com qualquer nome. Ha tambem um endpoint de download de arquivos que parece confiar demais no nome informado.',
      objective: 'Explore a falta de validacao de upload e o path traversal no endpoint de download para ler um arquivo fora da pasta publica.',
      points: 200,
      sort_order: 5,
      flag: 'BALACUBACO{upload_inseguro}',
    },
    {
      code: 'M06',
      title: 'Pedidos',
      category: 'IDOR / CSRF',
      difficulty: 'Medio',
      description: 'O historico de pedidos e acessado por um numero sequencial na URL. Alem disso, o cancelamento de pedido acontece via requisicao simples, sem nenhum token de confirmacao.',
      objective: 'Acesse os detalhes de um pedido que nao pertence a sua conta e encontre a anotacao interna escondida nele.',
      points: 150,
      sort_order: 6,
      flag: 'BALACUBACO{idor_pedidos}',
    },
    {
      code: 'M07',
      title: 'API',
      category: 'Insecure API Authorization / Mass Assignment',
      difficulty: 'Dificil',
      description: 'O formulario de cadastro publico so exibe os campos nome, email e senha... mas sera que a API aceita mais campos do que isso?',
      objective: 'Registre uma conta nova manipulando o corpo da requisicao para obter privilegios de administrador e acesse o endpoint protegido correspondente.',
      points: 200,
      sort_order: 7,
      flag: 'BALACUBACO{api_sem_autorizacao}',
    },
    {
      code: 'M08',
      title: 'Divulgacao de Informacoes',
      category: 'Information Disclosure / Debug Exposto',
      difficulty: 'Facil',
      description: 'Todo projeto tem aquele endpoint de debug que "ia ser removido antes de ir pra producao". Sera que sumiu mesmo?',
      objective: 'Localize o endpoint de debug esquecido e a mensagem de erro verbosa que revela detalhes internos do servidor.',
      points: 100,
      sort_order: 8,
      flag: 'BALACUBACO{informacao_exposta}',
    },
  ];

  for (const m of missions) {
    const missionId = insertMission.run(m).lastInsertRowid;
    insertFlag.run(missionId, m.flag);
  }

  console.log('[BalacubacoSHOP] Banco de dados criado e populado com sucesso.');
  console.log('[BalacubacoSHOP] Lembrete: este e um ambiente de laboratorio vulneravel de proposito.');
}

module.exports = { db, weakHash };
