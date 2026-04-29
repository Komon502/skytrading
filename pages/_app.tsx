import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>SkyTrading - เทรดหุ้น & Crypto</title>
        <meta name="description" content="SkyTrading - แพลตฟอร์มเทรดหุ้นอเมริกาและ Crypto ด้วยข้อมูลจริงแบบ Real-time" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
