'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { signInAction, signUpAction } from '@/actions/auth'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')

  // Estados do formulário
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Submissão do Login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email.trim() || !password) {
      setErrorMsg('Preencha seu e-mail e senha.')
      return
    }

    setLoading(true)
    try {
      const res = await signInAction({ email, password })
      if (!res.success) {
        setErrorMsg(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.')
        return
      }

      setSuccessMsg('Login realizado com sucesso! Redirecionando...')
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao autenticar.')
    } finally {
      setLoading(false)
    }
  }

  // Submissão do Cadastro
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!fullName.trim()) {
      setErrorMsg('Informe seu nome.')
      return
    }

    if (!email.trim() || !password) {
      setErrorMsg('Informe um e-mail válido e senha.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const res = await signUpAction({ email, password, fullName })
      if (!res.success) {
        setErrorMsg(res.error || 'Não foi possível criar a conta.')
        return
      }

      setSuccessMsg('Conta criada com sucesso! Redirecionando para o seu dashboard...')
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07090e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))] text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/25 mx-auto">
            <Wallet className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Controle Financeiro
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Acesso individual e protegido. Cada usuário possui seus próprios saldos, faturas e registros.
          </p>
        </div>

        {/* Card de Autenticação */}
        <div className="p-6 sm:p-7 rounded-2xl bg-[#0c101a]/90 border border-white/10 backdrop-blur-xl shadow-2xl space-y-5">
          {/* Alternador de Abas: Entrar vs Criar Conta */}
          <div className="grid grid-cols-2 p-1 bg-[#121826] rounded-xl border border-white/[0.08] text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab('signin')
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              className={`py-2 rounded-lg transition-all ${
                tab === 'signin'
                  ? 'bg-emerald-500 text-black shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup')
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              className={`py-2 rounded-lg transition-all ${
                tab === 'signup'
                  ? 'bg-emerald-500 text-black shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {/* Feedback de Sucesso */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Feedback de Erro */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORMULÁRIO 1: ENTRAR (LOGIN) */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#141b2a] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#141b2a] border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-10 text-xs shadow-lg shadow-emerald-500/20 mt-2 flex items-center justify-center gap-1.5"
              >
                <span>{loading ? 'Acessando...' : 'Entrar no Sistema'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </form>
          )}

          {/* FORMULÁRIO 2: CRIAR CONTA (CADASTRO) */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Seu Nome
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Como prefere ser chamado"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#141b2a] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#141b2a] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#141b2a] border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repita sua senha..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#141b2a] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Ambiente seguro e isolado: suas transações, faturas e dívidas são exclusivas da sua conta.
                </span>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-10 text-xs shadow-lg shadow-emerald-500/20 mt-2 flex items-center justify-center gap-1.5"
              >
                <span>{loading ? 'Criando Conta...' : 'Criar Minha Conta'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </form>
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>Multi-usuário • Isolamento com Supabase Row Level Security (RLS)</p>
        </div>
      </div>
    </div>
  )
}
