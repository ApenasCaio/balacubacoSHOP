# BalacubacoSHOP — Laboratorio de Seguranca Web

BalacubacoSHOP e uma loja virtual brasileira **ficticia**, criada exclusivamente para fins
educacionais em uma disciplina de seguranca web / Kali Linux. A aplicacao se parece com um
e-commerce comercial real, mas contem **vulnerabilidades intencionais e controladas** para que
alunos pratiquem tecnicas de pentest em um ambiente isolado.

> ⚠️ **Aviso de seguranca**: esta aplicacao e propositalmente insegura. Rode-a **apenas**
> localmente/isolada (ex: `docker compose up`). Nunca exponha esta instancia na internet
> publica, em uma rede corporativa, ou em qualquer ambiente compartilhado com dados reais.

## Stack

- **Frontend:** HTML + CSS + JavaScript puro (sem framework), servido como arquivos estaticos.
- **Backend:** Node.js + Express.
- **Banco de dados:** SQLite (via `better-sqlite3`), com dados fake gerados no primeiro start.
- **Upload de arquivos:** `multer` (sem validacao — de proposito, ver Missao 05).
- **Containerizacao:** Docker / Docker Compose.

## Como executar

### Opcao 1 — Docker Compose (recomendado)

```bash
docker compose up --build
```

A aplicacao ficara disponivel em **http://localhost:3000**.

O banco SQLite e populado automaticamente no primeiro start (usuarios, produtos, pedidos,
avaliacoes, chamados de suporte, missoes e flags).

Para resetar o laboratorio (apagar progresso e recriar os dados seed):

```bash
docker compose down -v
docker compose up --build
```

### Opcao 2 — Node local

Requer Node.js 18+.

```bash
npm install
npm run seed      # cria e popula o banco em ./data/balacubaco.db (opcional na 1a execucao)
npm start
```

A aplicacao sobe em `http://localhost:3000` (configuravel via `PORT` no `.env`, veja `.env.example`).

## Estrutura do projeto

```
balacubacoSHOP/
├── server/
│   ├── index.js            # bootstrap do Express, rotas e error handler
│   ├── db/
│   │   ├── database.js     # schema + seed automatico (better-sqlite3)
│   │   └── seed.js         # script para forcar reseed
│   ├── middleware/
│   │   └── session.js      # sessao "insegura" propositalmente (ver docs)
│   ├── routes/              # auth, users, products, orders, files, admin, debug, lab, support
│   ├── private/             # arquivo alvo do Path Traversal (Missao 05)
│   └── uploads/avatars/     # destino do upload inseguro (Missao 05)
├── public/                  # frontend estatico (HTML, CSS, JS)
├── docs/
│   ├── INSTRUCTOR_GUIDE.md  # documentacao tecnica de cada vulnerabilidade (uso do instrutor)
│   └── MISSIONS.md          # guia das missoes (visao do aluno, sem flags)
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## Contas de teste (seed)

| Papel      | Email                              | Senha        |
|------------|-------------------------------------|--------------|
| Cliente    | joao.pereira@example.com            | futebol123   |
| Cliente    | maria.souza@example.com             | brasil2024   |
| Cliente    | carlos.andrade@example.com          | senha123     |
| Cliente    | ana.lima@example.com                | 123456       |
| Admin      | admin@balacubacoshop.com.br         | **desconhecida** — a senha do admin nao e divulgada. Faz parte da Missao 01 descobrir como autenticar como administrador. |

## Laboratorio de seguranca (CTF)

Acesse **`/lab.html`** dentro da aplicacao para ver o dashboard de missoes. Escolha um
nome (nao requer conta), explore o site e a API, encontre as flags no formato
`BALACUBACO{...}` e submeta-as no proprio dashboard para pontuar. O progresso e salvo no
servidor por nome (tabela `lab_progress`).

Veja `docs/MISSIONS.md` para a descricao de cada missao (visao do aluno) e
`docs/INSTRUCTOR_GUIDE.md` para o gabarito completo (uso exclusivo do instrutor).

## Testando com ferramentas de seguranca

A aplicacao gera trafego HTTP realista (formularios, cookies, JSON APIs) compativel com:

- **Burp Suite** / **OWASP ZAP** — proxie o navegador ou o `curl` apontando para `localhost:3000`.
- **curl** — todas as rotas de API (`/api/...`) aceitam JSON simples, sem CSRF token nem CORS restritivo.
- **sqlmap** — o endpoint `POST /api/auth/login` (campo `email`) e vulneravel a SQL Injection.
- **Nmap** — util para reconhecimento basico da porta exposta (3000/tcp).
- DevTools do navegador — inspecione cookies (`balacubaco_sid`, sem `HttpOnly`), localStorage
  (carrinho, nome do lab) e chamadas `fetch`.

## Reset / dados

Os dados ficam em `./data/balacubaco.db` (ou no volume Docker `balacubaco-data`). Para reiniciar
do zero, apague o arquivo/volume e reinicie a aplicacao — o seed roda automaticamente.

## Aviso legal

Este projeto e um material didatico. Nao utilize as tecnicas aqui demonstradas contra sistemas
para os quais voce nao tenha autorizacao explicita. O uso e de exclusiva responsabilidade do
usuario.
