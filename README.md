# Secure API Gateway

[![CI](https://github.com/felipewatter/secure-api-gateway/actions/workflows/ci.yml/badge.svg)](https://github.com/felipewatter/secure-api-gateway/actions/workflows/ci.yml)

Gateway de API HTTP(S) escrito em **Node.js 22+ e TypeScript**, utilizando o módulo nativo `node:http` (sem Express). Encaminha chamadas para uma origem upstream configurada, com autenticação **JWT RS256**, autorização **RBAC por prefixo**, CORS por allowlist e limitação local de requisições por IP.

> **Escopo:** projeto de referência/avaliação de segurança. Não oferece emissão de tokens, rota de login, banco de dados nem coordenação distribuída de limites. O pacote é `private: true` e não deve ser publicado no npm.

## Arquitetura atual

```text
src/
  index.ts   Inicialização, configuração e encerramento por sinais
  config.ts  Validação de variáveis de ambiente e chave pública RSA
  auth.ts    Verificação JWT RS256 + RBAC
  limiter.ts Limitador de janela fixa em memória
  server.ts  Servidor HTTP, controles de entrada/saída e proxy
tests/
  gateway.test.cjs  Regressões e integração
```

Não há dependências de produção declaradas: o código usa APIs do Node.js. O TypeScript é dependência de desenvolvimento.

## Requisitos e execução

- Node.js **22 ou superior** e npm.
- Serviço HTTP(S) upstream sob seu controle.
- Chave **pública RSA de no mínimo 2048 bits** de um emissor JWT confiável.
- Arquivo de ambiente configurado pelo processo/shell: o projeto **não carrega automaticamente** `.env`.

```bash
git clone https://github.com/felipewatter/secure-api-gateway.git
cd secure-api-gateway
npm install --ignore-scripts
npm run typecheck
npm test
npm run build
# Defina as variáveis abaixo em seu ambiente antes de executar:
npm start
```

O servidor escuta em `PORT` (padrão `3000`). Sem as variáveis obrigatórias, a inicialização falha de forma explícita.

## Configuração

Consulte [`.env.example`](.env.example). Campos obrigatórios:

| Variável | Finalidade |
| --- | --- |
| `UPSTREAM_URL` | Origem `http://` ou `https://`, sem caminho, credenciais, query ou fragmento. Em `NODE_ENV=production`, HTTPS é obrigatório. |
| `JWT_PUBLIC_KEY_FILE` | Caminho do arquivo de chave pública RSA 2048+ bits. |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Valores exatos exigidos nos claims `iss` e `aud`. |
| `ROUTE_RULES` | Objeto JSON de prefixos `/api/...` para arrays de papéis permitidos. |

Opcionais: `CORS_ORIGINS` (origens exatas, separadas por vírgula), `RATE_LIMIT_PER_MINUTE` (60), `MAX_BODY_BYTES` (1 MiB), `MAX_RESPONSE_BYTES` (2 MiB), `UPSTREAM_TIMEOUT_MS` (5000 ms), `PORT` (3000).

**Exemplo de regra:** `ROUTE_RULES='{"/api/data":["reader","admin"],"/api/admin":["admin"]}'`. A precedência das regras segue o prefixo mais específico. A chave privada JWT **não** deve ser instalada no gateway.

## Rotas e autenticação

- `GET /health`: responde `{"status":"ok"}`; não exige token.
- `/api/...`: permite `GET`, `HEAD`, `POST`, `PUT`, `PATCH` e `DELETE`, sujeitos a autenticação e RBAC, e encaminha ao upstream.
- `OPTIONS /api/...`: preflight CORS apenas para origens autorizadas e cabeçalhos `authorization`/`content-type`.
- `POST /login` e `GET /secure` **não existem** nesta versão.

Exemplo de chamada com token **previamente emitido por um provedor confiável**:

```bash
curl -H "Authorization: Bearer <JWT_RS256_VALIDO>" http://localhost:3000/api/data
```

O JWT exige assinatura RS256 válida, `iss`, `aud`, `sub`, `exp` e `roles`; `nbf` e `iat` são verificados quando presentes. Tokens de algoritmo inesperado são rejeitados.

## Controles e limites de segurança

- Cabeçalhos defensivos: `X-Content-Type-Options`, `X-Frame-Options`, CSP, Referrer-Policy, `Cache-Control: no-store` e HSTS somente em TLS.
- Restrições de método e caminho, proteção contra redirecionamento do upstream e limites para tamanho da requisição e resposta.
- `X-Request-ID` e registro estruturado de acessos; o campo do ator é um hash abreviado, não o token.
- CORS por origem exata. Configurar um proxy reverso confiável para HTTPS público; **CORS não substitui autenticação**.
- O rate limiter é local ao processo e utiliza o endereço remoto do socket. **Não oferece proteção global entre instâncias**, identificação automática de IP atrás de proxy nem persistência.
- O servidor não substitui firewall, inspeção de tráfego, observabilidade centralizada, validação do upstream nem políticas corporativas de TLS.

## Comandos e qualidade

```bash
npm run typecheck  # TypeScript sem emitir arquivos
npm test           # Compilação + testes Node
npm run build      # Gera dist/
npm run dev        # Compila e inicia (sem hot reload)
npm start          # Executa dist/index.js
```

O GitHub Actions valida Node.js 22/24 em Ubuntu, Windows e macOS, incluindo análise de dependências. As automações de compatibilidade com TypeScript 7 são mantidas no repositório.

## Segurança, manutenção e licença

Leia [SECURITY.md](SECURITY.md), [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md), [CONTRIBUTING.md](CONTRIBUTING.md) e [CHANGELOG.md](CHANGELOG.md). Licença MIT, autor Felipe Watter ([@felipewatter](https://github.com/felipewatter)).
