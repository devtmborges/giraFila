/**
 * GiraFila — familySearch.js
 * Utilitário de pesquisa inteligente com expansão por grupo familiar.
 *
 * Regra de negócio:
 *  - Ao pesquisar pelo nome de qualquer membro da família, retorna todo o
 *    grupo: o responsável adulto + todas as crianças com o mesmo guardian_qr_code.
 *  - Um adulto sem crianças vinculadas retorna apenas ele mesmo.
 */

/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas,
 * para comparação case-insensitive e accent-insensitive.
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtra uma lista de visitantes usando pesquisa inteligente por grupo familiar.
 *
 * @param {Array<Object>} visitors - Lista completa de visitantes do evento.
 *   Cada item deve ter: { id, qr_code, name, is_child, guardian_qr_code }
 * @param {string} query - Texto digitado pelo usuário.
 * @returns {Array<Object>} Visitantes que correspondem (direto ou por grupo familiar).
 */
export function filterVisitorsByFamilyGroup(visitors, query) {
  const q = normalize(query);
  if (!q) return visitors;

  // 1. Encontra os visitantes cujo nome contém a query
  const directMatches = visitors.filter(v => normalize(v.name).includes(q));
  if (directMatches.length === 0) return [];

  // 2. Resolve os QR codes âncora de cada match direto.
  //    O "âncora familiar" é o qr_code do responsável (guardian_qr_code para crianças,
  //    ou o próprio qr_code para adultos).
  const anchorQrCodes = new Set();
  directMatches.forEach(v => {
    if (v.is_child && v.guardian_qr_code) {
      anchorQrCodes.add(String(v.guardian_qr_code));
    } else {
      anchorQrCodes.add(String(v.qr_code));
    }
  });

  // 3. Retorna todos os visitantes cujo grupo familiar está no conjunto âncora:
  //    - Adultos cuja qr_code está no conjunto (são o responsável)
  //    - Crianças cujo guardian_qr_code está no conjunto
  return visitors.filter(v => {
    if (!v.is_child) {
      return anchorQrCodes.has(String(v.qr_code));
    }
    return v.guardian_qr_code && anchorQrCodes.has(String(v.guardian_qr_code));
  });
}
