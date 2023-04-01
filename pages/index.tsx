import Head from 'next/head'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'
import LogParser from './log_parser'
import Markdown from './markdown'
import { useState } from 'react'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {

  const [markdownContent, setMarkdownContent] = useState<string>(`
  # Heading
  
  This is a paragraph with **bold text** and *italic text*.
  
  - List item 1
  - List item 2
  - List item 3
  
  [Visit Google](https://www.google.com)
  `);

  const handleContentChange = (response: string) => {
    setMarkdownContent(response);
  };

  return (
    <>
      <Head>
        <title>Google Chronicle Log Parser</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="p-8">
        <div className="flex flex-col w-full">
          <LogParser onParse={handleContentChange}></LogParser><br />
          <h2 className='text-3xl mb-4'>Output parsed UDM Event</h2>
          {markdownContent.trim() !== '' && <Markdown content={markdownContent} />}
        </div>

      </main>
    </>
  )
}
