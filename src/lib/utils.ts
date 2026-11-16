import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utilitário para combinar classes condicionais do Tailwind CSS com segurança.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata um valor numérico para a moeda brasileira (BRL: R$ 1.250,00).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para formato legível brasileiro (DD/MM/YYYY).
 */
export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  if (!year || !month || !day) return dateString
  return `${day}/${month}/${year}`
}

/**
 * Retorna o ciclo de faturamento atual no formato 'YYYY-MM' (ex: '2026-11').
 */
export function getCurrentBillingCycle(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Formata um ciclo de fatura 'YYYY-MM' para texto amigável (ex: 'Novembro / 2026').
 */
export function formatBillingCycle(cycle: string): string {
  if (!cycle || !cycle.includes('-')) return cycle
  const [year, month] = cycle.split('-')
  const months: Record<string, string> = {
    '01': 'Janeiro',
    '02': 'Fevereiro',
    '03': 'Março',
    '04': 'Abril',
    '05': 'Maio',
    '06': 'Junho',
    '07': 'Julho',
    '08': 'Agosto',
    '09': 'Setembro',
    '10': 'Outubro',
    '11': 'Novembro',
    '12': 'Dezembro',
  }
  return `${months[month] || month} / ${year}`
}
