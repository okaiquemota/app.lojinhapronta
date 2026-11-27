-- Tamanho máximo, em MB, de cada arquivo à venda. NULL = o teto técnico (95 MB,
-- abaixo dos 100 MB que a Cloudflare aceita por envio). Ver src/lib/limites.ts.
ALTER TABLE planos ADD COLUMN limite_arquivo_mb INTEGER;

UPDATE planos SET limite_arquivo_mb = 50 WHERE id = 'essencial';
UPDATE planos SET limite_arquivo_mb = 95 WHERE id = 'profissional';

-- Deixa o limite visível na tela de planos.
UPDATE planos SET recursos = json_insert(recursos, '$[#]', 'Arquivos de até 50 MB cada') WHERE id = 'essencial';
UPDATE planos SET recursos = json_insert(recursos, '$[#]', 'Arquivos de até 95 MB cada') WHERE id = 'profissional';
