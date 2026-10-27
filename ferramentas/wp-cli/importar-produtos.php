<?php
/**
 * Importa o CSV gerado por catalogo-para-woo.mjs sem abrir o painel.
 * Usa as mesmas classes que a tela Produtos → Importar usa por baixo.
 *
 * ⚠ Estas classes são internas do WooCommerce (não é API pública
 * documentada) — se uma atualização do WooCommerce mudar a assinatura,
 * este script pode parar de funcionar. Se der erro, a tela de importação
 * do painel (Produtos → Importar) é o caminho que já está validado no
 * README do repositório — use-a como alternativa, sem bloquear a entrega.
 *
 * Rodar com: wp eval-file importar-produtos.php /caminho/produtos-woo.csv
 */

if (!defined('ABSPATH')) {
    fwrite(STDERR, "rode isto com 'wp eval-file', não com 'php' direto.\n");
    exit(1);
}

$caminho = $args[0] ?? null;
if (!$caminho || !is_readable($caminho)) {
    fwrite(STDERR, "uso: wp eval-file importar-produtos.php /caminho/produtos-woo.csv\n");
    exit(1);
}

if (!class_exists('WC_Product_CSV_Importer_Controller')) {
    require_once WC_ABSPATH . 'includes/admin/importers/class-wc-product-csv-importer-controller.php';
}
if (!class_exists('WC_Product_CSV_Importer')) {
    require_once WC_ABSPATH . 'includes/import/class-wc-product-csv-importer.php';
}

$classeImportador = apply_filters('woocommerce_product_csv_importer_class', 'WC_Product_CSV_Importer');

// Primeira passada só para ler o cabeçalho e descobrir o mapeamento automático
// de colunas — é o mesmo que a tela de importação faz no passo 2 do assistente.
$leitorCabecalho = new $classeImportador($caminho, ['parse' => false]);
$cabecalhoBruto = $leitorCabecalho->get_raw_keys();
$mapeamento = WC_Product_CSV_Importer_Controller::auto_map_columns($cabecalhoBruto);

$naoMapeadas = array_diff($cabecalhoBruto, array_values($mapeamento));
if ($naoMapeadas) {
    fwrite(STDERR, "⚠ colunas que o WooCommerce não reconheceu automaticamente: "
        . implode(', ', $naoMapeadas) . "\n");
}

$importador = new $classeImportador($caminho, [
    'mapping'         => $mapeamento,
    'update_existing' => true,
    'lines'           => -1,
]);

$resultado = $importador->import();

$total = count($resultado['imported']) + count($resultado['updated']) + count($resultado['skipped']) + count($resultado['failed']);
echo "produtos no arquivo: $total\n";
echo "importados: " . count($resultado['imported']) . "\n";
echo "atualizados: " . count($resultado['updated']) . "\n";
echo "ignorados: " . count($resultado['skipped']) . "\n";
echo "com erro: " . count($resultado['failed']) . "\n";

foreach ($resultado['failed'] as $falha) {
    $msg = is_wp_error($falha['error'] ?? null) ? $falha['error']->get_error_message() : 'erro desconhecido';
    fwrite(STDERR, "✋ linha " . ($falha['id'] ?? '?') . ": $msg\n");
}

echo "\nOs produtos entram como rascunho (Published: -1 no CSV) — publique depois de conferir PDF e imagens.\n";
