/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import Head from 'next/head'
import { AppProps } from 'next/app'

import '@/styles/globals.css'
import '@xyflow/react/dist/style.css'

const App = ({ Component, pageProps: { session, ...pageProps } }: AppProps) => (
  <>
    <Head>
      <title>Builder - LangGraph4j</title>
    </Head>
    <Component {...pageProps} />
  </>
)

export default App
