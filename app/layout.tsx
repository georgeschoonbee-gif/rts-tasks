import './globals.css'

export const metadata = {
  title: 'RTS Tasks',
  description: 'Worker task management by RumiTech Solutions',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
