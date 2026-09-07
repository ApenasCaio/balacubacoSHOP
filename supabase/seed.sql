insert into public.categories (name, slug) values
  ('Smartphones', 'smartphones'),
  ('Notebooks', 'notebooks'),
  ('Audio', 'audio'),
  ('Acessorios', 'acessorios'),
  ('Casa Inteligente', 'casa-inteligente');

insert into public.products (name, slug, description, price, category_id, image_url, stock, rating) values
  ('Balaphone X12 Pro', 'balaphone-x12-pro', 'O smartphone mais balacubaco do Brasil. Tela AMOLED 6.7", 256GB, camera tripla de 108MP e bateria de 5000mAh que dura o carnaval inteiro.', 3299.90, 1, '/images/products/balaphone-x12.svg', 42, 4.8),
  ('Balaphone Mini 5G', 'balaphone-mini-5g', 'Compacto, rapido e com 5G. Perfeito para quem quer potencia sem pesar no bolso (nem na carteira).', 1899.00, 1, '/images/products/balaphone-mini.svg', 65, 4.5),
  ('NoteCuba 15 Ultra', 'notecuba-15-ultra', 'Notebook para trabalho e estudo com processador de ultima geracao, 16GB RAM e SSD de 512GB. Roda ate os relatorios mais chatos.', 4599.00, 2, '/images/products/notecuba-15.svg', 20, 4.6),
  ('NoteCuba Slim Air', 'notecuba-slim-air', 'Ultrafino, ultraleve, ultra balacubaco. Ideal para levar na mochila e no coracao.', 3899.00, 2, '/images/products/notecuba-slim.svg', 15, 4.4),
  ('Fone BalaBeats Pro', 'fone-balabeats-pro', 'Fone de ouvido bluetooth com cancelamento de ruido ativo. Ouca seu funk favorito sem incomodar ninguem (ou incomode, a escolha e sua).', 349.90, 3, '/images/products/balabeats-pro.svg', 120, 4.7),
  ('Caixa de Som BalaBoom 360', 'caixa-balaboom-360', 'Som 360 graus, resistente a agua e a pancadao de churrasco. Bateria de 20 horas.', 459.00, 3, '/images/products/balaboom-360.svg', 55, 4.3),
  ('Smartwatch Balaband Fit', 'smartwatch-balaband-fit', 'Monitore seus passos, batimentos e o quanto voce esta balacubaco hoje.', 599.00, 4, '/images/products/balaband-fit.svg', 80, 4.2),
  ('Carregador Turbo BalaCharge 65W', 'carregador-balacharge-65w', 'Carrega seu celular mais rapido que voce fala "balacubaco" tres vezes.', 129.90, 4, '/images/products/balacharge-65w.svg', 200, 4.6),
  ('Lampada Inteligente BalaLux', 'lampada-balalux', 'Controle pelo app, mude de cor, sincronize com sua musica. Casa inteligente, custo inteligente.', 89.90, 5, '/images/products/balalux.svg', 150, 4.1),
  ('Assistente Virtual BalaHome', 'assistente-balahome', 'Pergunte as horas, o clima, ou o sentido da vida (essa ela ainda esta aprendendo).', 349.00, 5, '/images/products/balahome.svg', 33, 4.4),
  ('Power Bank BalaCharge 20000mAh', 'powerbank-balacharge-20000', 'Energia de sobra para o dia inteiro de reels e stories.', 179.90, 4, '/images/products/powerbank-20000.svg', 90, 4.5),
  ('Balaphone Z Fold Flex', 'balaphone-z-fold-flex', 'Tela dobravel, design premium e aquele efeito "uau" na roda de amigos.', 6999.00, 1, '/images/products/balaphone-zfold.svg', 12, 4.9);

insert into public.users (name, email, password, role, cpf, phone, address, avatar_url, secret_note, idor_flag) values
  ('Administrador BalacubacoSHOP', 'admin@balacubacoshop.com.br', '198352b6a8078a827be267c847d39506629d3af446a3cc0bce670dd3a6b5d753', 'admin', '000.000.000-00', '(11) 90000-0000', 'Rua da Administracao, 1 - Sao Paulo/SP', '/images/avatar-admin.svg', 'Nota interna (RH): revisar acessos no proximo sprint. Flag do laboratorio - Missao 01 (SQL Injection / Autenticacao): BALACUBACO{sql_1nj3ct10n_l0g1n}', 'BALACUBACO{1d0r_perfil_usuario}'),
  ('Joao Pereira', 'joao.pereira@example.com', 'dc8ca1fa2ad9b078004360341f81c19b42497d24e738dddc702bc601088f2fb2', 'customer', '123.456.789-01', '(21) 98888-1234', 'Av. das Palmeiras, 220 - Rio de Janeiro/RJ', '/images/avatar-default.svg', null, null),
  ('Maria Souza', 'maria.souza@example.com', 'ff2fb41afac7cda572a91c7e443af1154e3f731058b2b185377acb37c26faa5b', 'customer', '234.567.890-12', '(31) 97777-5678', 'Rua das Acacias, 88 - Belo Horizonte/MG', '/images/avatar-default.svg', null, null),
  ('Carlos Andrade', 'carlos.andrade@example.com', '55a5e9e78207b4df8699d60886fa070079463547b095d1a05bc719bb4e6cd251', 'customer', '345.678.901-23', '(41) 96666-4321', 'Rua XV de Novembro, 500 - Curitiba/PR', '/images/avatar-default.svg', null, null),
  ('Ana Beatriz Lima', 'ana.lima@example.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'customer', '456.789.012-34', '(85) 95555-8765', 'Av. Beira Mar, 1200 - Fortaleza/CE', '/images/avatar-default.svg', null, null);

insert into public.reviews (product_id, user_id, author_name, rating, comment) values
  (1, 2, 'Joao Pereira', 5, 'Chegou rapido e a camera e sensacional! Recomendo demais.'),
  (1, 3, 'Maria Souza', 4, 'Bateria dura o dia todo, mas achei meio pesado.'),
  (3, 4, 'Carlos Andrade', 5, 'Excelente para trabalho remoto, tela linda.'),
  (5, 5, 'Ana Beatriz Lima', 5, 'Som incrivel, cancelamento de ruido funciona muito bem!'),
  (6, 2, 'Joao Pereira', 4, 'Boa caixa de som, poderia ter mais grave.'),
  (7, 3, 'Maria Souza', 3, 'Bonito mas o app trava as vezes.');

insert into public.orders (user_id, status, total, shipping_address, internal_note) values
  (2, 'entregue', 3299.90, 'Av. das Palmeiras, 220 - Rio de Janeiro/RJ', null),
  (3, 'enviado', 808.90, 'Rua das Acacias, 88 - Belo Horizonte/MG', null),
  (1, 'processando', 6999.00, 'Rua da Administracao, 1 - Sao Paulo/SP (pedido interno / teste)', 'Pedido de teste interno. NAO enviar para producao. Flag do laboratorio - Missao 06 (IDOR / Pedidos): BALACUBACO{idor_pedidos}');

insert into public.order_items (order_id, product_id, quantity, price) values
  (1, 1, 1, 3299.90),
  (2, 5, 1, 349.90),
  (2, 7, 1, 459.00),
  (3, 12, 1, 6999.00);

insert into public.support_tickets (user_id, name, email, subject, message, status) values
  (4, 'Carlos Andrade', 'carlos.andrade@example.com', 'Duvida sobre garantia', 'Boa tarde, gostaria de saber o prazo de garantia do NoteCuba 15 Ultra.', 'aberto'),
  (5, 'Ana Beatriz Lima', 'ana.lima@example.com', 'Troca de produto', 'Recebi o smartwatch com o vidro riscado, posso trocar?', 'aberto');

insert into public.missions (code, title, category, difficulty, description, objective, points, sort_order) values
  ('M01', 'Autenticacao', 'SQL Injection / Sessao Insegura', 'Facil', 'A pagina de login do BalacubacoSHOP processa as credenciais de um jeito... peculiar. A senha do administrador nunca foi divulgada em lugar nenhum.', 'Autentique-se como administrador sem conhecer a senha real e localize a nota interna exibida na conta.', 100, 1),
  ('M02', 'Dados de Usuario', 'IDOR / Broken Object Level Authorization', 'Facil', 'A area "Minha Conta" busca seus dados via API usando um identificador numerico. Sera que a API confere direito de quem pode ver o que?', 'Como um cliente comum, acesse os dados de outro usuario (incluindo o administrador) trocando o identificador na chamada da API.', 150, 2),
  ('M03', 'Avaliacoes de Produtos', 'Cross-Site Scripting (Stored & Reflected)', 'Medio', 'Os comentarios de avaliacao de produtos sao exibidos tal como foram enviados. A busca do site tambem "ecoa" o termo pesquisado na tela de resultados.', 'Envie uma avaliacao contendo um payload de XSS que seja executado na pagina do produto e no painel de moderacao do administrador.', 150, 3),
  ('M04', 'Administracao', 'Broken Access Control', 'Medio', 'O painel administrativo decide o que mostrar no navegador olhando para uma informacao que... o proprio navegador envia. Sera que da para confiar nisso?', 'Sem fazer login como administrador, force o acesso ao endpoint de dashboard administrativo manipulando cookies/headers da requisicao.', 200, 4),
  ('M05', 'Upload de Arquivos', 'Insecure File Upload / Path Traversal', 'Dificil', 'A troca de foto de perfil aceita qualquer tipo de arquivo, com qualquer nome. Ha tambem um endpoint de download de arquivos que parece confiar demais no nome informado.', 'Explore a falta de validacao de upload e o path traversal no endpoint de download para ler um arquivo fora da pasta publica.', 200, 5),
  ('M06', 'Pedidos', 'IDOR / CSRF', 'Medio', 'O historico de pedidos e acessado por um numero sequencial na URL. Alem disso, o cancelamento de pedido acontece via requisicao simples, sem nenhum token de confirmacao.', 'Acesse os detalhes de um pedido que nao pertence a sua conta e encontre a anotacao interna escondida nele.', 150, 6),
  ('M07', 'API', 'Insecure API Authorization / Mass Assignment', 'Dificil', 'O formulario de cadastro publico so exibe os campos nome, email e senha... mas sera que a API aceita mais campos do que isso?', 'Registre uma conta nova manipulando o corpo da requisicao para obter privilegios de administrador e acesse o endpoint protegido correspondente.', 200, 7),
  ('M08', 'Divulgacao de Informacoes', 'Information Disclosure / Debug Exposto', 'Facil', 'Todo projeto tem aquele endpoint de debug que "ia ser removido antes de ir pra producao". Sera que sumiu mesmo?', 'Localize o endpoint de debug esquecido e a mensagem de erro verbosa que revela detalhes internos do servidor.', 100, 8);

insert into public.flags (mission_id, flag_value) values
  (1, 'BALACUBACO{sql_1nj3ct10n_l0g1n}'),
  (2, 'BALACUBACO{1d0r_perfil_usuario}'),
  (3, 'BALACUBACO{xss_avaliacoes}'),
  (4, 'BALACUBACO{broken_access_admin}'),
  (5, 'BALACUBACO{upload_inseguro}'),
  (6, 'BALACUBACO{idor_pedidos}'),
  (7, 'BALACUBACO{api_sem_autorizacao}'),
  (8, 'BALACUBACO{informacao_exposta}');
