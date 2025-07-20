# 🔐 Secure API Gateway

[![CI Build](https://github.com/SEU_USUARIO/secure-api-gateway/actions/workflows/ci.yml/badge.svg)](https://github.com/SEU_USUARIO/secure-api-gateway/actions)

Um gateway de API seguro, modular e extensível desenvolvido com Node.js, TypeScript e Express. Esta aplicação oferece funcionalidades de segurança avançadas como autenticação JWT, controle de acesso baseado em papéis (RBAC), limitação de requisições (rate limiting), CORS configurável, e logs estruturados.

---

## 🧩 Funcionalidades

- ✅ Autenticação via JWT
- 🔐 RBAC (Role-Based Access Control)
- 🛡️ Rate Limiter por IP
- 🌐 CORS com whitelist
- 📈 Logger de requisições
- 📦 Estrutura modular (routes, middlewares, controllers)
- ⚙️ CI com GitHub Actions
- 🧪 Testes unitários prontos para extensão
- 🚀 Pronto para deploy (Dockerfile opcional)

---

## 📁 Estrutura do Projeto

```
secure-api-gateway/
│
├── .github/workflows/ci.yml      # Pipeline CI
├── src/
│   ├── auth/                     # JWT e autenticação
│   ├── middleware/              # Middlewares: logger, RBAC, rateLimiter, CORS
│   ├── routes/                  # Rotas protegidas
│   └── index.ts                 # Ponto de entrada da aplicação
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

---

## 🚀 Como usar

### 1. Clonar o repositório

```bash
git clone https://github.com/felipewatter/secure-api-gateway.git
cd secure-api-gateway
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Rodar localmente

```bash
npm run dev
```

> A API estará disponível em `http://localhost:3000`

---

## 🧪 Testando a API

### 🔑 Rota de autenticação (simulada)

```http
POST /login
Authorization: Basic <usuário/senha>
```

### 🔐 Rota protegida

```http
GET /secure
Headers:
  Authorization: Bearer <token JWT>
```

---

## ⚙️ Scripts

```bash
npm run dev       # Executa a aplicação com ts-node-dev
npm run build     # Compila para JavaScript
npm start         # Executa o build em produção
```

---

## 🛠️ Tecnologias

- Node.js
- TypeScript
- Express.js
- JSON Web Token (JWT)
- dotenv
- Helmet
- Winston (logs)
- Rate-limiter-flexible

---

## 🧱 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/sua-feature`
3. Commit suas mudanças: `git commit -m 'feat: nova funcionalidade'`
4. Push: `git push origin feature/sua-feature`
5. Abra um Pull Request

---

## 📝 Licença

Distribuído sob a Licença MIT. Veja `LICENSE` para mais informações.

---

## 👨‍💻 Autor

Felipe Silva  
GitHub: [@felipewatter](https://github.com/felipewatter)

---

## 💡 Inspiração

Este projeto foi desenvolvido para demonstrar boas práticas em segurança de APIs, CI/CD com GitHub Actions, e arquitetura limpa com foco em modularidade e extensibilidade.
