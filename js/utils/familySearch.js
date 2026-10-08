/**
 * GiraFila — familySearch.js
 * Utilitário de pesquisa inteligente com expansão por grupo familiar.
 *
 * Regra de negócio:
 *  - Ao pesquisar pelo nome de qualquer membro da família, retorna todo o
 *    grupo familiar conectado (adultos vinculados entre si + crianças dependentes).
 *  - A conectividade é resolvida de forma bidirecional: A→B e B→A são o mesmo grupo.
 *  - Um adulto sem vínculos retorna apenas ele mesmo.
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
 * Resolve o conjunto completo de membros de um grupo familiar a partir de um
 * QR Code âncora, usando BFS bidirecional sobre guardian_qr_code.
 *
 * @param {Array<Object>} visitors - Lista completa de visitantes do evento.
 * @param {string|number} anchorQr - QR Code de partida para expansão.
 * @returns {Set<string>} Conjunto de QR codes (como strings) do grupo.
 */
function resolveFamilyGroup(visitors, anchorQr) {
  const visited = new Set();
  const queue = [String(anchorQr)];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    visitors.forEach(v => {
      const vQr = String(v.qr_code);
      const vGuardian = v.guardian_qr_code ? String(v.guardian_qr_code) : null;

      // Forward: v is linked to current (v.guardian_qr_code === current)
      if (vGuardian === current && !visited.has(vQr)) {
        queue.push(vQr);
      }
      // Backward: current is linked to v (current.guardian_qr_code === vQr)
      if (vQr === current) {
        // Already visiting current; check if it has a guardian to expand upward
        const currentVisitor = visitors.find(x => String(x.qr_code) === current);
        if (currentVisitor && currentVisitor.guardian_qr_code) {
          const guardianQr = String(currentVisitor.guardian_qr_code);
          if (!visited.has(guardianQr)) queue.push(guardianQr);
        }
      }
    });
  }

  return visited;
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

  // 2. Resolve todos os QR codes de grupo para cada match direto
  const familyQrCodes = new Set();
  directMatches.forEach(v => {
    // Âncora é o próprio qr_code (resolveFamilyGroup expande bidirecionalmente)
    const group = resolveFamilyGroup(visitors, v.qr_code);
    group.forEach(qr => familyQrCodes.add(qr));
  });

  // 3. Retorna todos os visitantes cujo qr_code está no conjunto familiar
  return visitors.filter(v => familyQrCodes.has(String(v.qr_code)));
}


