'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signInAction(formData: {
  email: string
  password: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.email.trim(),
    password: formData.password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, user: data.user }
}

export async function signUpAction(formData: {
  email: string
  password: string
  fullName: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.email.trim(),
    password: formData.password,
    options: {
      data: {
        full_name: formData.fullName.trim(),
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Se o usuário foi criado e confirmado (auto-confirm trigger), faz login imediatamente
  if (data.session) {
    revalidatePath('/', 'layout')
    return { success: true, user: data.user, session: true }
  }

  // Tenta autenticar diretamente caso o trigger já tenha confirmado o e-mail
  const signInRes = await supabase.auth.signInWithPassword({
    email: formData.email.trim(),
    password: formData.password,
  })

  if (signInRes.data.session) {
    revalidatePath('/', 'layout')
    return { success: true, user: signInRes.data.user, session: true }
  }

  return {
    success: true,
    user: data.user,
    message: 'Conta criada! Você já pode entrar com suas credenciais.',
  }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function updateProfileNameAndAvatarAction(payload: {
  fullName?: string
  avatarUrl?: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return { success: false, error: 'Usuário não autenticado.' }
  }

  const updateData: Record<string, unknown> = {
    ...user.user_metadata,
  }

  if (payload.fullName !== undefined) {
    const trimmed = payload.fullName.trim()
    if (!trimmed) {
      return { success: false, error: 'O nome não pode ficar em branco.' }
    }
    updateData.full_name = trimmed
    updateData.name = trimmed
  }

  if (payload.avatarUrl !== undefined) {
    updateData.avatar_url = payload.avatarUrl
  }

  const { data, error } = await supabase.auth.updateUser({
    data: updateData,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  return {
    success: true,
    user: data.user,
    message: 'Perfil atualizado com sucesso!',
  }
}

export async function updatePasswordAction(payload: {
  newPassword: string
  confirmPassword: string
}) {
  if (!payload.newPassword || payload.newPassword.length < 6) {
    return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' }
  }

  if (payload.newPassword !== payload.confirmPassword) {
    return { success: false, error: 'A confirmação de senha não coincide com a nova senha.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return { success: false, error: 'Usuário não autenticado.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: payload.newPassword,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, message: 'Senha atualizada com sucesso!' }
}
