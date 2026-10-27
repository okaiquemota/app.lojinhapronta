<?php
/**
 * Troca os marcadores [NOME_DA_LOJA] etc. nas páginas jurídicas já
 * publicadas pelo montar-loja-mae.sh, e publica as que ficaram em
 * rascunho. A "Sobre" fica de fora — os blocos dela são instrução, não
 * marcador (ver paginas/LEIA-ME.md).
 *
 * Rodar com: wp eval-file substituir-marcadores.php
 * Lê os dados do briefing das variáveis de ambiente (exportadas pelo
 * entregar-cliente.sh), não de argumentos — alguns valores têm espaço.
 */

if (!defined('ABSPATH')) {
    fwrite(STDERR, "rode isto com 'wp eval-file', não com 'php' direto.\n");
    exit(1);
}

$valor = fn(string $nome, string $padrao = '') => getenv($nome) !== false && getenv($nome) !== ''
    ? getenv($nome)
    : $padrao;

$marcadores = [
    '[NOME_DA_LOJA]'      => $valor('NOME_DA_LOJA'),
    '[CPF_CNPJ]'          => $valor('CPF_CNPJ'),
    '[EMAIL_DA_LOJA]'     => $valor('EMAIL_DA_LOJA'),
    '[WHATSAPP_NUMERO]'   => $valor('WHATSAPP_NUMERO'),
    '[WHATSAPP_VISIVEL]'  => $valor('WHATSAPP_VISIVEL'),
    '[CIDADE_UF]'         => $valor('CIDADE_UF'),
    '[DATA_ATUALIZACAO]'  => $valor('DATA_ATUALIZACAO', date('d/m/Y')),
    '[NOME_RESPONSAVEL]'  => $valor('NOME_RESPONSAVEL'),
    '[DIAS_ATENDIMENTO]'  => $valor('DIAS_ATENDIMENTO'),
    '[HORARIO_ATENDIMENTO]' => $valor('HORARIO_ATENDIMENTO'),
];

foreach ($marcadores as $chave => $v) {
    if ($v === '') {
        fwrite(STDERR, "⚠ $chave sem valor — vai sobrar colchete nas páginas que o usam.\n");
    }
}

$paginas = ['politica-de-privacidade', 'politica-de-reembolso', 'termos-de-uso', 'contato'];
$comColcheteSobrando = [];

foreach ($paginas as $slug) {
    $post = get_page_by_path($slug, OBJECT, 'page');
    if (!$post) {
        fwrite(STDERR, "✋ página '$slug' não encontrada — rode montar-loja-mae.sh primeiro.\n");
        continue;
    }

    $conteudo = strtr($post->post_content, $marcadores);

    wp_update_post([
        'ID'          => $post->ID,
        'post_content' => $conteudo,
        'post_status' => 'publish',
    ]);

    if (str_contains($conteudo, '[')) {
        $comColcheteSobrando[] = $slug;
    }
    echo "publicada: /$slug/\n";
}

if ($comColcheteSobrando) {
    fwrite(STDERR, "\n⚠ sobrou '[' nestas páginas, confira antes de entregar: "
        . implode(', ', $comColcheteSobrando) . "\n");
} else {
    echo "\nnenhum colchete sobrou nas 4 páginas.\n";
}

echo "\n'Sobre' não foi tocada — preencha com a voz da cliente (briefing) ou deixe despublicada.\n";
