import '@/styles/globals.css'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div style={{ height: '100%' }}>
      <Component {...pageProps} />
    </div>
  )
}
