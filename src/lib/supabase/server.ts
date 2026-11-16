import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route Handlers no Next.js App Router.
 * Gerencia leitura e gravação de cookies com segurança no servidor.
 * Suporta tanto NEXT_PUBLIC_SUPABASE_ANON_KEY quanto NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 */
export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'As variáveis de ambiente do Supabase (URL e ANON/PUBLISHABLE KEY) precisam ser configuradas no arquivo .env.local'
    )
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // O método `setAll` foi chamado em um Server Component.
          // Isso pode ser ignorado se houver middleware atualizando a sessão.
        }
      },
    },
  })
}
