import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'

/**
 * Atualiza e renova a sessão de autenticação do Supabase nas requisições Next.js via Middleware.
 * Blindado com try/catch para evitar erro 500 MIDDLEWARE_INVOCATION_FAILED em caso de falha de rede ou falta de variáveis.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    // Se as variáveis de ambiente não estiverem configuradas na Vercel, não quebra a requisição
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Aviso: Variáveis do Supabase não encontradas no Middleware.')
      return supabaseResponse
    }

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            try {
              return request.cookies.getAll()
            } catch {
              return []
            }
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({
                request,
              })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            } catch (err) {
              console.error('Erro ao gravar cookies no middleware:', err)
            }
          },
        },
      }
    )

    // Obtém o usuário atual com segurança
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.warn('Aviso auth.getUser no middleware:', authError.message)
    }

    const pathname = request.nextUrl.pathname

    // Se não estiver autenticado e tentar acessar rotas internas, redireciona para /login
    if (!user && pathname !== '/login' && !pathname.startsWith('/auth')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Se já estiver autenticado e tentar acessar a tela de login, redireciona para /
    if (user && pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Erro crítico capturado no middleware updateSession:', error)
    return supabaseResponse
  }
}
