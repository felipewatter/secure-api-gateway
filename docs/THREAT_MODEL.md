# Modelo de ameaças

**Cliente → gateway:** validar JWT RS256, emissor, público, audiência, expiração e papéis. RBAC por prefixo com negação por padrão.

**Gateway → upstream:** origem fixa; sem redirecionamentos; bearer token e cookies não são encaminhados. O upstream deve ser inacessível diretamente a clientes, pois `X-Gateway-Subject` só é confiável vindo do gateway.

**Limites:** rate limiter em memória por IP do socket, sem suporte distribuído; corpos de até 1 MiB por padrão; respostas de até 2 MiB; timeout de 5 s. TLS externo é responsabilidade do operador. Não inclui JWKS remoto, rotação dinâmica, revogação de tokens, mTLS ou autorização por objeto.

**Auditoria:** logs operacionais JSON não são imutáveis. Não registrar tokens, query strings, cookies ou corpos.
