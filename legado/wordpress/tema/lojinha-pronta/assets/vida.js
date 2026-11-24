/*
 * O pouco de JavaScript que a loja tem.
 *
 * Três coisas: revelar o conteúdo conforme a pessoa rola, marcar o cabeçalho
 * quando sai do topo, e escalonar a entrada dos produtos — que vêm do
 * WooCommerce e por isso não podem receber classe pelo modelo.
 *
 * Sem biblioteca: são 40 linhas, e uma loja aberta no 4G não deve pagar 30 KB
 * por um fade.
 */
(() => {
  'use strict';

  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Os produtos são desenhados pelo WooCommerce; a classe entra por aqui.
  document.querySelectorAll('ul.products > li.product').forEach((item, i) => {
    item.classList.add('lp-revela');
    item.style.setProperty('--i', String(i % 4));
  });

  const alvos = document.querySelectorAll('.lp-revela');

  if (semMovimento || !('IntersectionObserver' in window)) {
    alvos.forEach((el) => { el.dataset.visivel = 'true'; });
  } else {
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.dataset.visivel = 'true';
        observador.unobserve(entrada.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    alvos.forEach((el) => observador.observe(el));
  }

  const cabecalho = document.querySelector('.lp-cabecalho');

  if (cabecalho) {
    const marcar = () => {
      cabecalho.dataset.rolado = window.scrollY > 8 ? 'true' : 'false';
    };

    marcar();
    window.addEventListener('scroll', marcar, { passive: true });
  }
})();
