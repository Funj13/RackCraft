/**
 * Motor de Layout Paramétrico de Painéis de Rede
 * Garante proporções industriais realistas e impede sobreposição ou extravasamento dos limites do chassi.
 */

export interface PanelBlockPlacement {
  x: number;
  y: number;
  width: number;
  scale: number;
}

export function calculateFrontPanelLayout(
  chassisWidth: number,
  chassisHeight: number,
  rj45Width: number,
  opticalWidth: number,
  consoleWidth: number,
  ledsWidth: number
): {
  ledsX: number;
  consoleX: number;
  rj45X: number;
  opticalX: number;
  scale: number;
} {
  // Margem lateral segura para parafusos/orelhas de rack
  const marginX = 2.5;
  const availableWidth = Math.max(10, chassisWidth - marginX * 2);

  // Espaçamentos entre seções
  const gapSection = 1.8;

  let totalContentWidth = 0;
  if (ledsWidth > 0) totalContentWidth += ledsWidth + gapSection;
  if (consoleWidth > 0) totalContentWidth += consoleWidth + gapSection;
  if (rj45Width > 0) totalContentWidth += rj45Width;
  if (rj45Width > 0 && opticalWidth > 0) totalContentWidth += gapSection;
  if (opticalWidth > 0) totalContentWidth += opticalWidth;

  // Se o conteúdo ultrapassar a largura útil do chassi, aplica escala proporcional
  let scale = 1.0;
  if (totalContentWidth > availableWidth) {
    scale = availableWidth / totalContentWidth;
  }

  // Posição inicial (da esquerda para a direita)
  let currentX = -chassisWidth / 2 + marginX;

  let ledsX = 0;
  if (ledsWidth > 0) {
    ledsX = currentX + (ledsWidth * scale) / 2;
    currentX += (ledsWidth + gapSection) * scale;
  }

  let consoleX = 0;
  if (consoleWidth > 0) {
    consoleX = currentX + (consoleWidth * scale) / 2;
    currentX += (consoleWidth + gapSection) * scale;
  }

  let rj45X = 0;
  if (rj45Width > 0) {
    rj45X = currentX + (rj45Width * scale) / 2;
    currentX += rj45Width * scale;
  }

  let opticalX = 0;
  if (opticalWidth > 0) {
    if (rj45Width > 0) currentX += gapSection * scale;
    opticalX = currentX + (opticalWidth * scale) / 2;
    currentX += opticalWidth * scale;
  }

  return { ledsX, consoleX, rj45X, opticalX, scale };
}

export function calculateRearPanelLayout(
  chassisWidth: number,
  rj45Width: number,
  powerWidth: number,
  opticalWidth: number = 0
): {
  rj45X: number;
  opticalX: number;
  powerX: number;
  scale: number;
} {
  const marginX = 2.0;
  const availableWidth = Math.max(8, chassisWidth - marginX * 2);

  // Na traseira: Portas de rede (RJ45 / SFP) à esquerda/centro, Fonte à extrema direita
  const gap = 2.0;
  const netPortsWidth = rj45Width + (opticalWidth > 0 ? opticalWidth + gap : 0);
  const totalWidth = netPortsWidth + (powerWidth > 0 ? powerWidth + gap : 0);

  let scale = 1.0;
  if (totalWidth > availableWidth) {
    scale = availableWidth / totalWidth;
  }

  // Fonte sempre alinhada à direita da traseira
  const powerX = chassisWidth / 2 - marginX - (powerWidth * scale) / 2;

  // Portas de rede distribuídas a partir da esquerda
  let currentX = -chassisWidth / 2 + marginX;
  let rj45X = 0;
  if (rj45Width > 0) {
    rj45X = currentX + (rj45Width * scale) / 2;
    currentX += (rj45Width + gap) * scale;
  }

  let opticalX = 0;
  if (opticalWidth > 0) {
    opticalX = currentX + (opticalWidth * scale) / 2;
  }

  return { rj45X, opticalX, powerX, scale };
}
