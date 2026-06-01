import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Head from 'next/head'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const DEFAULT_IDLE_MINUTES = 15

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const idleMinutes = parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES || String(DEFAULT_IDLE_MINUTES), 10)
    const IDLE_TIMEOUT = idleMinutes * 60 * 1000

    const resetTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      timerRef.current = window.setTimeout(async () => {
        try {
          await supabase.auth.signOut()
        } catch (e) {
          // ignore sign out errors
        }
        router.push('/auth')
      }, IDLE_TIMEOUT)
    }

    // activity events that should keep the session alive
    const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keydown', 'touchstart'] as const
    events.forEach((ev) => window.addEventListener(ev, resetTimer))

    // start initial timer
    resetTimer()

    // initial session check: if there's no session, redirect to /auth
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      if (!session && router.pathname !== '/auth') {
        router.push('/auth')
      }
    })

    // also pause timer when the tab is hidden, resume when visible
    const onVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current)
        }
      } else {
        resetTimer()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // listen for Supabase auth state changes so we redirect on sign-out
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth')
      }
    })

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer))
      document.removeEventListener('visibilitychange', onVisibility)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      sub?.subscription?.unsubscribe?.()
    }
  }, [router])

  return (
    <>
      <Head>
        <title>SkyTrading - เทรดหุ้น & Crypto</title>
        <meta name="description" content="SkyTrading - แพลตฟอร์มเทรดหุ้นอเมริกาและ Crypto ด้วยข้อมูลจริงแบบ Real-time" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
