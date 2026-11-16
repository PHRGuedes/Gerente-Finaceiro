import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Fintech Manager | Controle Financeiro Pessoal',
  description: 'Sistema moderno de controle financeiro pessoal, despesas, cartões, dívidas informais e previsão orçamentária.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#0a0d14] text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-300 font-sans`}
      >
        {children}
      </body>
    </html>
  )
}
