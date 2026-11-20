/**
 * Utilitários para gestão do Ciclo de Faturamento de Cartão de Crédito e Motor de Parcelamentos.
 * Regra: Fechamento configurável por usuário (padrão: todo dia 04 de cada mês).
 */

export interface BillingCycleInfo {
  cycleId: string // ex: '2026-12'
  label: string // ex: 'Fatura 04/12 (Dezembro / 2026)'
  closingDay: number // ex: 4
  startDate: string // YYYY-MM-DD (dia seguinte ao fechamento do mês anterior)
  closingDate: string // YYYY-MM-DD (dia de fechamento deste mês)
  daysUntilClosing: number
  isClosingSoon: boolean
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/**
 * Retorna as informações do ciclo de fatura atual baseado no fechamento configurado.
 */
export function getCurrentBillingCycle(
  referenceDate: Date = new Date(),
  closingDay: number = 4
): BillingCycleInfo {
  const safeClosingDay = Math.max(1, Math.min(31, Math.round(closingDay || 4)))
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() // 0-indexed
  const day = referenceDate.getDate()

  let cycleYear = year
  let cycleMonth = month + 1 // 1-indexed

  // Se o dia for maior que a data de fechamento, a fatura em formação fecha no próximo mês.
  if (day > safeClosingDay) {
    cycleMonth += 1
    if (cycleMonth > 12) {
      cycleMonth = 1
      cycleYear += 1
    }
  }

  return getCycleInfo(cycleYear, cycleMonth, referenceDate, safeClosingDay)
}

/**
 * Constrói as informações completas de um ciclo dado ano, mês (1-12) e dia de fechamento.
 */
export function getCycleInfo(
  cycleYear: number,
  cycleMonth: number,
  referenceDate: Date = new Date(),
  closingDay: number = 4
): BillingCycleInfo {
  const safeClosingDay = Math.max(1, Math.min(31, Math.round(closingDay || 4)))
  const maxDaysInCycleMonth = new Date(cycleYear, cycleMonth, 0).getDate()
  const actualClosingDay = Math.min(safeClosingDay, maxDaysInCycleMonth)

  const closingDateObj = new Date(cycleYear, cycleMonth - 1, actualClosingDay, 23, 59, 59)

  let startMonth = cycleMonth - 1
  let startYear = cycleYear
  if (startMonth < 1) {
    startMonth = 12
    startYear -= 1
  }
  const maxDaysInStartMonth = new Date(startYear, startMonth, 0).getDate()
  const actualStartDay = Math.min(safeClosingDay + 1, maxDaysInStartMonth)
  const startDateObj = new Date(startYear, startMonth - 1, actualStartDay, 0, 0, 0)

  const diffTime = closingDateObj.getTime() - referenceDate.getTime()
  const daysUntilClosing = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

  const cycleId = `${cycleYear}-${String(cycleMonth).padStart(2, '0')}`
  const monthName = MONTH_NAMES[cycleMonth - 1] || String(cycleMonth)
  const label = `Fatura ${String(safeClosingDay).padStart(2, '0')}/${String(cycleMonth).padStart(2, '0')} (${monthName} / ${cycleYear})`

  return {
    cycleId,
    label,
    closingDay: safeClosingDay,
    startDate: startDateObj.toISOString().split('T')[0],
    closingDate: closingDateObj.toISOString().split('T')[0],
    daysUntilClosing,
    isClosingSoon: daysUntilClosing <= 3,
  }
}

/**
 * Determina a qual ciclo de fatura pertence uma determinada data (YYYY-MM-DD).
 */
export function getCycleForDate(dateString: string, closingDay: number = 4): string {
  const safeClosingDay = Math.max(1, Math.min(31, Math.round(closingDay || 4)))
  if (!dateString) return getCurrentBillingCycle(new Date(), safeClosingDay).cycleId
  const [yearStr, monthStr, dayStr] = dateString.split('-')
  const y = parseInt(yearStr, 10)
  const m = parseInt(monthStr, 10)
  const d = parseInt(dayStr, 10)

  let cycleYear = y
  let cycleMonth = m

  if (d > safeClosingDay) {
    cycleMonth += 1
    if (cycleMonth > 12) {
      cycleMonth = 1
      cycleYear += 1
    }
  }

  return `${cycleYear}-${String(cycleMonth).padStart(2, '0')}`
}

/**
 * Retorna o ciclo deslocado por N meses a partir de um cycleId (YYYY-MM).
 */
export function addMonthsToCycle(
  cycleId: string,
  monthsToAdd: number,
  closingDay: number = 4
): BillingCycleInfo {
  const [yearStr, monthStr] = cycleId.split('-')
  let y = parseInt(yearStr, 10)
  let m = parseInt(monthStr, 10) + monthsToAdd

  while (m > 12) {
    m -= 12
    y += 1
  }
  while (m < 1) {
    m += 12
    y -= 1
  }

  return getCycleInfo(y, m, new Date(), closingDay)
}

/**
 * MOTOR DE PARCELAMENTO:
 * Gera a projeção de ciclos para todas as parcelas restantes.
 * Exemplo: se estou na parcela 2 de 10 no ciclo 2026-12:
 * - Parcela 2: 2026-12
 * - Parcela 3: 2027-01
 * - ...
 * - Parcela 10: 2027-08
 */
export interface ProjectedInstallment {
  installmentCurrent: number
  installmentTotal: number
  cycleId: string
  cycleLabel: string
  projectedDate: string
}

export function projectInstallmentCycles(
  baseDate: string,
  baseCycleId: string,
  startInstallment: number,
  totalInstallments: number,
  closingDay: number = 4
): ProjectedInstallment[] {
  const result: ProjectedInstallment[] = []

  const [yStr, mStr, dStr] = (baseDate || new Date().toISOString().split('T')[0]).split('-')
  const originalYear = parseInt(yStr, 10) || new Date().getFullYear()
  const originalMonth = parseInt(mStr, 10) || new Date().getMonth() + 1
  const originalDay = parseInt(dStr, 10) || new Date().getDate()

  for (let inst = startInstallment; inst <= totalInstallments; inst++) {
    const monthOffset = inst - startInstallment
    const cycle = addMonthsToCycle(baseCycleId, monthOffset, closingDay)

    let targetMonth = originalMonth + monthOffset
    let targetYear = originalYear
    while (targetMonth > 12) {
      targetMonth -= 12
      targetYear += 1
    }
    while (targetMonth < 1) {
      targetMonth += 12
      targetYear -= 1
    }

    // Limitar dia ao máximo do mês (evitar bug de ano bissexto / mês de 28/30 dias)
    const maxDays = new Date(targetYear, targetMonth, 0).getDate()
    const safeDay = Math.min(originalDay, maxDays)
    const projectedDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`

    result.push({
      installmentCurrent: inst,
      installmentTotal: totalInstallments,
      cycleId: cycle.cycleId,
      cycleLabel: cycle.label,
      projectedDate,
    })
  }

  return result
}
