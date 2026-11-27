-- O webhook do Mercado Pago conta os avisos do último minuto de cada loja
-- (src/webhooks.ts) para não ser usado como martelo. Este índice deixa essa
-- conta barata mesmo com a tabela cheia.
CREATE INDEX IF NOT EXISTS avisos_mp_origem ON avisos_mp(origem, criado_em);
