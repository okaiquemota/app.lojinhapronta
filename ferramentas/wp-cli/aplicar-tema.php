<?php
/**
 * Escreve as duas coisas que mudam por cliente no tema (ver
 * tema/lojinha-pronta/LEIA-ME.md): as 4 cores do theme.json e o
 * config-cliente.php. Não depende de WordPress nem de wp-cli — roda com
 * `php` puro, direto na pasta do tema já copiada para wp-content/themes/.
 *
 * Uso:
 *   php aplicar-tema.php <pasta-do-tema> <cor-marca> <cor-marca-escura> \
 *       <cor-destaque> <cor-suave> <whatsapp> <whatsapp-texto> \
 *       <analytics-ga4> <creditos:true|false>
 */

function erro($msg) {
    fwrite(STDERR, "aplicar-tema.php: $msg\n");
    exit(1);
}

[, $temaPath, $corMarca, $corMarcaEscura, $corDestaque, $corSuave,
    $whatsapp, $whatsappTexto, $analyticsGa4, $creditos] = $argv + array_fill(0, 10, '');

if ($temaPath === '' || !is_dir($temaPath)) {
    erro("pasta do tema não encontrada: '$temaPath'");
}

$hexValido = fn($c) => (bool) preg_match('/^#[0-9a-fA-F]{6}$/', $c);
foreach (['corMarca' => $corMarca, 'corMarcaEscura' => $corMarcaEscura, 'corDestaque' => $corDestaque, 'corSuave' => $corSuave] as $nome => $valor) {
    if (!$hexValido($valor)) {
        erro("$nome inválida: '$valor' (esperado formato #rrggbb)");
    }
}

// ── theme.json: troca só as 4 cores da paleta, preserva o resto ──────────
$themeJsonPath = "$temaPath/theme.json";
$themeJsonRaw = file_get_contents($themeJsonPath);
if ($themeJsonRaw === false) {
    erro("não consegui ler $themeJsonPath");
}
$themeJson = json_decode($themeJsonRaw, true);
if ($themeJson === null) {
    erro("$themeJsonPath não é um JSON válido");
}

$coresPorSlug = [
    'lp-marca'        => $corMarca,
    'lp-marca-escura' => $corMarcaEscura,
    'lp-destaque'     => $corDestaque,
    'lp-suave'        => $corSuave,
];

$paleta = &$themeJson['settings']['color']['palette'];
$trocadas = [];
foreach ($paleta as &$entrada) {
    if (isset($coresPorSlug[$entrada['slug']])) {
        $entrada['color'] = $coresPorSlug[$entrada['slug']];
        $trocadas[] = $entrada['slug'];
    }
}
unset($entrada, $paleta);

$faltando = array_diff(array_keys($coresPorSlug), $trocadas);
if ($faltando) {
    erro('slug(s) de cor não encontrados no theme.json: ' . implode(', ', $faltando));
}

file_put_contents(
    $themeJsonPath,
    json_encode($themeJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n"
);
echo "theme.json: cores aplicadas (" . implode(', ', $trocadas) . ")\n";

// ── config-cliente.php: reescreve o arquivo inteiro, mesma estrutura ─────
$creditosPhp = in_array(strtolower($creditos), ['false', '0', 'nao', 'não'], true) ? 'false' : 'true';
$phpStr = fn($s) => "'" . str_replace("'", "\\'", $s) . "'";

$configClientePhp = <<<PHP
<?php
/**
 * O ÚNICO ARQUIVO QUE MUDA POR CLIENTE.
 *
 * Fica separado do functions.php de propósito: na entrega você edita quatro
 * linhas num arquivo que só tem configuração, sem risco de encostar em código.
 *
 * As cores não estão aqui — elas ficam no theme.json, que é o que o editor do
 * WordPress lê.
 */

return [
    // Só números, com 55 e DDD. Vazio esconde o botão.
    'whatsapp' => {$phpStr($whatsapp)},

    // Mensagem que já vem digitada quando a pessoa toca no botão.
    'whatsapp_texto' => {$phpStr($whatsappTexto)},

    // ID do Google Analytics 4, formato G-XXXXXXXXXX. Vazio não carrega nada.
    'analytics_ga4' => {$phpStr($analyticsGa4)},

    /*
     * Barra de aviso no topo do site. Vazio esconde a barra inteira.
     *
     * É o lugar de "10% no Pix" ou "coleção de Páscoa no ar". Uma frase curta:
     * a barra não quebra em duas linhas no celular sem ficar feia.
     */
    'aviso' => '',

    // Para onde a barra leva. Vazio deixa a barra sem link.
    'aviso_link' => '',

    /*
     * Banner da página inicial. Sem imagem, o banner não existe — e a home
     * abre direto nas categorias, que é o certo enquanto a cliente não tem
     * arte. Banner com imagem genérica de banco de imagem é pior que banner
     * nenhum.
     *
     * Endereço completo do arquivo, depois de subir em Mídia.
     */
    'banner_imagem' => '',

    // Versão vertical, para o celular. Vazio usa a mesma imagem.
    'banner_imagem_celular' => '',

    // Para onde o banner leva. Ex.: '/categoria-produto/alfabetizacao/'
    'banner_link' => '',

    // Texto alternativo da imagem, para quem usa leitor de tela.
    'banner_alt' => '',

    /*
     * Crédito "Loja criada por Lojinha Pronta" no rodapé.
     *
     * É o motor de aquisição do negócio: quem navega numa loja do nicho é o
     * próximo cliente. Só desligue se estiver combinado e cobrado à parte.
     */
    'creditos' => {$creditosPhp},
];

PHP;

file_put_contents("$temaPath/config-cliente.php", $configClientePhp);
echo "config-cliente.php: escrito (whatsapp=" . ($whatsapp !== '' ? 'preenchido' : 'vazio')
    . ", analytics=" . ($analyticsGa4 !== '' ? 'preenchido' : 'vazio')
    . ", creditos=$creditosPhp)\n";

if ($whatsapp !== '' && preg_match('/^55\d{10,11}$/', $whatsapp) === 0) {
    fwrite(STDERR, "aplicar-tema.php: ⚠ whatsapp '$whatsapp' não parece ter o formato 55+DDD+número só com dígitos — confira\n");
}
