import { createBrowserClient } from '@supabase/ssr'

// Define constants at module level - these are resolved at build time by Next.js
// This allows the values to be inlined into the client bundle
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
    )
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        // Read cookie from document.cookie
        const cookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${name}=`))
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
      },
      set(name: string, value: string, options: any) {
        // Write cookie to document.cookie
        let cookieString = `${name}=${encodeURIComponent(value)}`

        if (options?.maxAge) {
          cookieString += `; max-age=${options.maxAge}`
        }
        if (options?.path) {
          cookieString += `; path=${options.path}`
        }
        if (options?.domain) {
          cookieString += `; domain=${options.domain}`
        }
        if (options?.secure) {
          cookieString += '; secure'
        }
        if (options?.sameSite) {
          cookieString += `; samesite=${options.sameSite}`
        }

        document.cookie = cookieString
      },
      remove(name: string, options: any) {
        // Remove cookie by setting max-age=0
        let cookieString = `${name}=; max-age=0`

        if (options?.path) {
          cookieString += `; path=${options.path}`
        }
        if (options?.domain) {
          cookieString += `; domain=${options.domain}`
        }

        document.cookie = cookieString
      },
    },
  })
}
