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
