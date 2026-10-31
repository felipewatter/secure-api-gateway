# Política de Segurança

Relate vulnerabilidades de forma privada via GitHub Security Advisories, quando habilitado. Nunca inclua chaves, tokens ou dados de produção em issues públicas.

O gateway depende de TLS, chave pública confiável, emissor JWT seguro, rede interna isolada e controles de borda. Não é um WAF nem substitui um gateway corporativo. O rate limiting é por processo e não é distribuído. Não existe rotação JWKS automática. Consulte docs/THREAT_MODEL.md.
