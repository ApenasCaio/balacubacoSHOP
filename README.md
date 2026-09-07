# BalacubacoSHOP - Laboratorio de Seguranca Web

BalacubacoSHOP e uma loja virtual brasileira ficticia criada para fins educacionais em
seguranca web. A aplicacao simula um e-commerce real, mas contem vulnerabilidades intencionais
para treino em um ambiente isolado.

> Aviso: este projeto e propositalmente inseguro. Rode apenas de forma local ou em ambiente
> controlado. Nunca exponha esta instancia na internet publica ou em redes com dados reais.

## Stack atual

- Frontend: HTML, CSS e JavaScript puro.
- Backend: Node.js + Express.
- Banco de dados: Supabase/Postgres.
- Realtime do laboratorio: SSE no backend com presenca e leaderboard persistidos no Supabase.
- Upload de arquivos: `multer`, com comportamento inseguro de proposito para a missao 05.

## O que mudou nesta versao

- O banco antigo em SQLite nao e mais o runtime da aplicacao.
- Os dados agora ficam no Supabase.
- A migracao e o seed ficam em `supabase/`.
- O painel dos jurados usa leaderboard realtime.

## Como executar localmente

### 1. Instale as dependencias

```bash
npm install
```

### 2. Configure o ambiente

Crie um arquivo `.env` a partir de `.env.example` e ajuste, se necessario:

- `PORT`
- `SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `LAB_SECRET`
- `LAB_MASTER_PASSWORD`

Se voce estiver usando o projeto Supabase ja linkado neste repo, os valores padrao do codigo
ja apontam para o projeto configurado.

### 3. Aplique schema e seed no Supabase

```bash
npx supabase db push --linked --include-seed
```

Se o cache do PostgREST precisar ser atualizado:

```bash
npx supabase db push --linked
```

### 4. Inicie a aplicacao

```bash
npm start
```

A aplicacao fica disponivel em `http://localhost:3000`.

## Estrutura do projeto

```text
balacubacoSHOP/
|-- server/
|   |-- index.js
|   |-- lib/supabase.js
|   |-- middleware/
|   |-- routes/
|   |-- uploads/
|   |-- private/
|   `-- utils/
|-- public/
|-- supabase/
|   |-- migrations/
|   `-- seed.sql
|-- docs/
|-- Dockerfile
|-- docker-compose.yml
`-- README.md
```

## Contas de teste

| Papel | Email | Senha |
|---|---|---|
| Cliente | joao.pereira@example.com | futebol123 |
| Cliente | maria.souza@example.com | brasil2024 |
| Cliente | carlos.andrade@example.com | senha123 |
| Cliente | ana.lima@example.com | 123456 |
| Admin | admin@balacubacoshop.com.br | desconhecida |

## Laboratorio

Acesse `/lab.html` para abrir o dashboard das missoes. O participante do laboratorio nao
precisa ter conta no e-commerce.

Recursos disponiveis:

- submissao de flags
- progresso por participante
- leaderboard realtime
- filtros de ativos e inativos
- limpeza de resultado por senha mestre no painel dos jurados

O painel dos jurados fica em `/jurados.html`.

## Missoes

As descricoes das missoes estao em `docs/MISSIONS.md`.

## Observacoes tecnicas

- O login e o fluxo do laboratorio foram adaptados para funcionar com Supabase.
- O leaderboard nao depende de sessao do navegador; ele usa identificador persistido no cliente
  e dados salvos no banco.
- O projeto continua sendo um laboratorio vulneravel por design.

## Aviso legal

Este projeto e material didatico. Nao utilize as tecnicas aqui demonstradas contra sistemas
para os quais voce nao tenha autorizacao explicita.
