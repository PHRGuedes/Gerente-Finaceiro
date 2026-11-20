'use client'

import React, { useState, useRef, useTransition } from 'react'
import {
  X,
  User,
  Lock,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  Sparkles,
  CreditCard,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  updateProfileNameAndAvatarAction,
  updatePasswordAction,
} from '@/actions/auth'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser?: {
    id: string
    email: string
    fullName: string
    avatarUrl?: string | null
    closingDay?: number
  }
}

type TabType = 'profile' | 'security'

const PRESET_AVATARS = [
  '💼',
  '🚀',
  '💰',
  '♠️',
  '🎯',
  '👑',
  '⚡',
  '💎',
  '🦊',
  '🦁',
]

export function ProfileModal({
  isOpen,
  onClose,
  currentUser,
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados da aba Perfil
  const [fullName, setFullName] = useState(currentUser?.fullName || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    currentUser?.avatarUrl || null
  )
  const [closingDay, setClosingDay] = useState<number>(currentUser?.closingDay || 4)
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isPendingProfile, startProfileTransition] = useTransition()

  // Estados da aba Segurança (Senha)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isPendingPassword, startPasswordTransition] = useTransition()

  if (!isOpen) return null

  // Redimensiona e comprime imagem no cliente para salvar como Data URL leve (~6KB - 10KB)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileFeedback(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setProfileFeedback({
        type: 'error',
        message: 'Por favor selecione um arquivo de imagem (JPEG, PNG ou WebP).',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const TARGET_SIZE = 160 // Resolução ideal para avatar
        const width = img.width
        const height = img.height

        // Corte quadrado centralizado proporcional
        const minDim = Math.min(width, height)
        const startX = (width - minDim) / 2
        const startY = (height - minDim) / 2

        canvas.width = TARGET_SIZE
        canvas.height = TARGET_SIZE
        const ctx = canvas.getContext('2d')

        if (ctx) {
          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            TARGET_SIZE,
            TARGET_SIZE
          )
          const compressed = canvas.toDataURL('image/jpeg', 0.85)
          setAvatarUrl(compressed)
          setProfileFeedback({
            type: 'success',
            message: 'Foto carregada! Clique em "Salvar Alterações" para confirmar.',
          })
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Gera um avatar SVG leve a partir de um emoji predefinido
  const handleSelectPreset = (emoji: string) => {
    setProfileFeedback(null)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="28" fill="#111726"/><text x="50" y="66" font-size="52" text-anchor="middle" font-family="sans-serif">${emoji}</text></svg>`
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    setAvatarUrl(dataUrl)
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileFeedback(null)

    if (!fullName.trim()) {
      setProfileFeedback({
        type: 'error',
        message: 'Por favor informe o seu nome completo.',
      })
      return
    }

    startProfileTransition(async () => {
      const res = await updateProfileNameAndAvatarAction({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl,
        closingDay: closingDay,
      })

      if (res.success) {
        setProfileFeedback({
          type: 'success',
          message: 'Perfil atualizado com sucesso!',
        })
      } else {
        setProfileFeedback({
          type: 'error',
          message: res.error || 'Erro ao atualizar perfil.',
        })
      }
    })
  }

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordFeedback(null)

    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({
        type: 'error',
        message: 'A nova senha deve ter no mínimo 6 caracteres.',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'A confirmação de senha não coincide com a nova senha digitada.',
      })
      return
    }

    startPasswordTransition(async () => {
      const res = await updatePasswordAction({
        newPassword,
        confirmPassword,
      })

      if (res.success) {
        setPasswordFeedback({
          type: 'success',
          message: 'Senha atualizada com sucesso!',
        })
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordFeedback({
          type: 'error',
          message: res.error || 'Erro ao atualizar a senha.',
        })
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0c101a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-auto">
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Personalização de Perfil
              </h3>
              <p className="text-[11px] text-slate-400">
                Altere seu nome, foto de perfil e senha de acesso
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-white/[0.08] px-4 pt-2 gap-2 bg-[#090d15]">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-400 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Dados & Foto</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'security'
                ? 'border-emerald-400 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Alterar Senha</span>
          </button>
        </div>

        {/* Conteúdo da Aba 1: Dados do Perfil & Foto */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="p-4 sm:p-5 space-y-4">
            {profileFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  profileFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {profileFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{profileFeedback.message}</span>
              </div>
            )}

            {/* Seção da Foto de Perfil */}
            <div className="flex flex-col items-center justify-center gap-3 py-1">
              <div className="relative group">
                <div className="h-20 w-20 sm:h-22 sm:w-22 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-2xl uppercase overflow-hidden shadow-lg select-none">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      {fullName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                  title="Carregar nova foto"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white"
                >
                  <Camera className="h-3 w-3 mr-1 text-emerald-400" />
                  <span>Escolher Foto</span>
                </Button>

                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAvatarUrl(null)
                      setProfileFeedback({
                        type: 'success',
                        message: 'Foto removida. Clique em "Salvar Alterações".',
                      })
                    }}
                    className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    <span>Remover</span>
                  </Button>
                )}
              </div>

              {/* Presets Rápidos de Ícones/Emojis */}
              <div className="w-full pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-0.5">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>Ou escolha um ícone:</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none py-1">
                  {PRESET_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSelectPreset(emoji)}
                      className="h-7 w-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-emerald-500/40 text-sm flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer"
                      title={`Usar ${emoji} como foto`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Campo: Nome Completo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <User className="h-3 w-3 text-emerald-400" />
                <span>Nome de Exibição</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Pedro Henrique"
                className="w-full h-10 px-3 bg-[#111726] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Campo: E-mail (Informativo) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-500" />
                  <span>E-mail da Conta</span>
                </span>
                <span className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-400 font-mono">
                  Não editável
                </span>
              </label>
              <input
                type="email"
                disabled
                value={currentUser?.email || ''}
                className="w-full h-10 px-3 bg-[#090d15] border border-white/[0.05] rounded-xl text-xs text-slate-400 cursor-not-allowed select-none"
              />
            </div>

            {/* Campo: Dia de Fechamento da Fatura */}
            <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Dia de Fechamento do Cartão</span>
                </span>
                <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  Todo dia {String(closingDay).padStart(2, '0')}
                </span>
              </label>

              <select
                value={closingDay}
                onChange={(e) => setClosingDay(Number(e.target.value))}
                className="w-full h-10 px-3 bg-[#111726] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    Dia {String(day).padStart(2, '0')} {day === 4 ? '(Padrão)' : ''}
                  </option>
                ))}
              </select>

              <p className="text-[11px] text-slate-400 leading-tight">
                Compras feitas após este dia entram na fatura do mês seguinte. Cada usuário tem seu próprio dia de corte!
              </p>
            </div>

            {/* Botão de Salvar Perfil */}
            <Button
              type="submit"
              disabled={isPendingProfile}
              className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPendingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Alterações</span>
              )}
            </Button>
          </form>
        )}

        {/* Conteúdo da Aba 2: Segurança & Senha */}
        {activeTab === 'security' && (
          <form onSubmit={handleSavePassword} className="p-4 sm:p-5 space-y-4">
            {passwordFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  passwordFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {passwordFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-400 text-[11px] leading-relaxed">
              Para maior segurança, use uma senha com pelo menos 6 caracteres combinando letras e números.
            </div>

            {/* Campo: Nova Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-400" />
                <span>Nova Senha</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-10 pl-3 pr-10 bg-[#111726] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Campo: Confirmar Nova Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-400" />
                <span>Confirmar Nova Senha</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full h-10 pl-3 pr-10 bg-[#111726] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão de Atualizar Senha */}
            <Button
              type="submit"
              disabled={isPendingPassword}
              className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPendingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Atualizando senha...</span>
                </>
              ) : (
                <span>Atualizar Senha</span>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
