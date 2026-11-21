'use client'

import React, { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // 1. Registrar o Service Worker obrigatorio para PWA no Chrome Android
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado:', reg.scope)
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err)
        })
    }

    // 2. Interceptar evento nativo de instalacao do Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setInstallPrompt(promptEvent)

      // Se o usuario ainda nao fechou nesta sessao, exibe o banner
      const dismissed = sessionStorage.getItem('pwa_dismissed')
      if (!dismissed) {
        setIsVisible(true)
      }
    }

    const handleAppInstalled = () => {
      console.log('[PWA] Aplicativo instalado com sucesso!')
      setIsVisible(false)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setIsVisible(false)
      }
    } catch (err) {
      console.error('[PWA] Erro ao disparar instalacao:', err)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    sessionStorage.setItem('pwa_dismissed', 'true')
  }

  if (!isVisible || isDismissed) {
    return null
  }

  return (
    <div className="fixed bottom-22 sm:bottom-6 left-3.5 right-3.5 sm:left-auto sm:right-6 z-50 max-w-sm bg-[#0c101a]/95 border border-emerald-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
          <Smartphone className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">
            Instalar Aplicativo
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            Acesso rápido direto no seu celular
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          onClick={handleInstallClick}
          className="h-8 px-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1 cursor-pointer"
        >
          <Download className="h-3 w-3" />
          <span>Instalar</span>
        </Button>
        <button
          onClick={handleDismiss}
          className="h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
