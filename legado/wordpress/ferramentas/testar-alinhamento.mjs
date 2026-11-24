/*
 * Confere se cabeçalho, miolo e rodapé começam e terminam na mesma coluna.
 *
 * Existe porque esse alinhamento quebrou três vezes seguidas, sempre por um
 * motivo diferente e sempre só em tela larga — em 1024px e no celular tudo
 * batia. A última foi um `margin: 0 0 X` num título, que anula o
 * `margin-left: auto` que centraliza o miolo.
 *
 * A página de teste imita o que o Twenty Twenty-Five gera em volta dos nossos
 * blocos, e mede caixas neutras — não títulos, que podem ter largura máxima
 * própria de propósito. Não substitui olhar o site: pega regressão de CSS, não
 * de WordPress.
 *
 *   node ferramentas/testar-alinhamento.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const exigir = createRequire(import.meta.url);
const aqui = dirname(fileURLToPath(import.meta.url));

let pw;
for (const onde of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
  try { pw = exigir(onde); break; } catch { /* tenta o próximo */ }
}
if (!pw) {
  console.error('Falta o playwright. Rode: npm i -D playwright');
  process.exit(2);
}

const navegador = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].find((c) => c && existsSync(c));

const REGIOES = {
  a: 'cabeçalho', b: 'chamada', c: 'seção', d: 'rodapé',
  e: 'cabeçalho (loja)', f: 'loja', g: 'rodapé (loja)',
};

const b = await pw.chromium.launch(navegador ? { executablePath: navegador } : {});
let falhou = false;

for (const largura of [1440, 1280, 1024, 768, 480]) {
  const p = await b.newPage({ viewport: { width: largura, height: 900 } });
  await p.goto('file://' + join(aqui, 'alinhamento', 'pagina.html'));

  const medidas = await p.evaluate((ids) => Object.fromEntries(ids.map((id) => {
    const { left, right } = document.getElementById(id).getBoundingClientRect();
    return [id, [Math.round(left), Math.round(right)]];
  })), Object.keys(REGIOES));

  const esquerdas = new Set(Object.values(medidas).map((v) => v[0]));
  const direitas = new Set(Object.values(medidas).map((v) => v[1]));
  const alinhado = esquerdas.size === 1 && direitas.size === 1;

  // A faixa colorida tem que ir de ponta a ponta: se a margem negativa do
  // WordPress vencer a nossa regra, ela sobra de um lado e falta do outro.
  const faixa = await p.evaluate(() => {
    const { left, right } = document.getElementById('faixa-b').getBoundingClientRect();
    return [Math.round(left), Math.round(right)];
  });
  const sangra = faixa[0] === 0 && faixa[1] === largura;
  const ok = alinhado && sangra;
  falhou ||= !ok;

  console.log(`\n${largura}px  ${ok ? '\u2714 alinhado' : '\u2718 DESALINHADO'}`);
  if (!ok) {
    for (const [id, [l, r]] of Object.entries(medidas)) {
      console.log(`   ${REGIOES[id].padEnd(18)} ${String(l).padStart(5)} \u2192 ${r}`);
    }
    if (!sangra) console.log(`   faixa de fundo     ${String(faixa[0]).padStart(5)} \u2192 ${faixa[1]}  (esperado 0 \u2192 ${largura})`);
  }
  await p.close();
}

await b.close();
process.exit(falhou ? 1 : 0);
