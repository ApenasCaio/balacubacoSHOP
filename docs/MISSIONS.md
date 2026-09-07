# BalacubacoSHOP Security Lab — Guia das Missoes (visao do aluno)

Este documento descreve as 8 missoes do laboratorio. As flags **nao** estao aqui — voce deve
encontra-las explorando a aplicacao. Use o navegador, DevTools, `curl` e/ou Burp Suite / OWASP
ZAP para investigar. Submeta as flags encontradas em `/lab.html`.

Formato das flags: `BALACUBACO{alguma_coisa}`.

---

## Missao 01 — Autenticacao
**Categoria:** SQL Injection / Sessao insegura · **Dificuldade:** Facil

A senha da conta `admin@balacubacoshop.com.br` nunca foi divulgada em lugar nenhum do site ou
da documentacao publica. Existe, porem, uma forma de autenticar como administrador sem
conhece-la. Investigue como o formulario de login processa as credenciais.

**Objetivo:** autentique-se como administrador e localize a informacao confidencial exibida na
area "Minha Conta".

## Missao 02 — Dados de Usuario
**Categoria:** IDOR / Broken Object Level Authorization · **Dificuldade:** Facil

A pagina "Minha Conta" busca seus dados por meio de uma chamada de API que usa um identificador
numerico. Observe essa chamada na aba de rede do navegador.

**Objetivo:** enquanto logado como um cliente comum (nao administrador), acesse os dados de
outra conta.

## Missao 03 — Avaliacoes de Produtos
**Categoria:** Cross-Site Scripting (Stored & Reflected) · **Dificuldade:** Media

Os comentarios de avaliacao sao exibidos exatamente como foram enviados. A busca de produtos
tambem exibe o termo pesquisado na tela de resultados.

**Objetivo:** faca um payload de XSS ser executado a partir de uma avaliacao de produto e/ou a
partir da busca.

## Missao 04 — Administracao
**Categoria:** Broken Access Control · **Dificuldade:** Media

O painel administrativo (`/admin.html`) busca estatisticas por meio de uma chamada de API.
Investigue como essa API decide se voce e ou nao administrador — sera que ela realmente confia
na sua sessao autenticada?

**Objetivo:** obtenha acesso ao endpoint de dashboard administrativo sem estar logado como
administrador.

## Missao 05 — Upload de Arquivos
**Categoria:** Insecure File Upload / Path Traversal · **Dificuldade:** Dificil

A troca de foto de perfil ("Minha Conta") aceita upload de arquivos. Ha tambem um endpoint de
download de arquivos usado internamente pela aplicacao.

**Objetivo:** explore a falta de validacao no upload e/ou o comportamento do endpoint de
download para acessar um arquivo que nao deveria estar acessivel publicamente.

## Missao 06 — Pedidos
**Categoria:** IDOR / CSRF · **Dificuldade:** Media

O historico de pedidos identifica cada pedido por um numero sequencial na URL
(`/pedidos.html?id=N`). Observe tambem como o cancelamento de pedido e feito.

**Objetivo:** acesse os detalhes de um pedido que nao pertence a sua conta.

## Missao 07 — API
**Categoria:** Insecure API Authorization / Mass Assignment · **Dificuldade:** Dificil

O formulario de cadastro publico so pede nome, email e senha. Mas o que a API realmente aceita
no corpo da requisicao `POST /api/auth/register`? Intercepte a requisicao com um proxy
(Burp/ZAP) e observe.

**Objetivo:** obtenha uma conta com privilegios de administrador atraves do cadastro, sem
explorar nenhuma outra falha, e acesse o endpoint administrativo protegido correspondente.

## Missao 08 — Divulgacao de Informacoes
**Categoria:** Information Disclosure / Debug Exposto · **Dificuldade:** Facil

Nem todo endpoint de desenvolvimento e removido antes de ir para producao. Tambem vale a pena
observar o que a aplicacao responde quando algo da errado (ex: um parametro invalido em uma
URL de produto).

**Objetivo:** localize o endpoint de debug esquecido e/ou provoque um erro que revele detalhes
internos do servidor.

---

## Dicas gerais

- Use as ferramentas de desenvolvedor do navegador (Network e Application/Storage) para inspecionar
  requisicoes, respostas e cookies.
- Um proxy interceptador (Burp Suite / OWASP ZAP) ajuda a modificar requisicoes antes de
  envia-las — util nas missoes 04, 06 e 07.
- Nem toda vulnerabilidade exige ferramentas sofisticadas: varias podem ser exploradas so com o
  navegador ou com `curl`.
- As missoes sao independentes, mas o conhecimento de uma pode ajudar em outra.
