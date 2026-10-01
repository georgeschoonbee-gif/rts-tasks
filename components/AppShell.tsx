import Link from 'next/link'
import { logout } from '@/app/login/actions'

type Props = {
  children: React.ReactNode
  name: string
  role: string
}

export function AppShell({ children, name, role }: Props) {
  const management = role === 'manager' || role === 'admin'
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">RTS <span>TASKS</span></div><div className="brand-sub">RumiTech Solutions</div></div>
        <nav className="nav">
          <Link href="/tasks">My Tasks</Link>
          <Link href="/tasks?view=assigned">Tasks I Assigned</Link>
          <Link href="/new-task">New Task</Link>
          <Link href="/notifications">Notifications</Link>
          {management && <div className="management"><Link href="/management">Management</Link></div>}
          {management && <Link href="/settings">Settings</Link>}
        </nav>
        <div className="sidebar-footer"><form action={logout}><button className="btn secondary small" type="submit">Log out</button></form></div>
      </aside>
      <main className="main">
        <header className="topbar"><div className="topbar-title">Task Management</div><div className="user-chip">{name} · {role}</div></header>
        <div className="content">{children}</div>
      </main>
      <nav className="mobile-nav">
        <Link href="/tasks">My Tasks</Link>
        <Link href="/new-task">New Task</Link>
        <Link href="/notifications">Alerts</Link>
        {management ? <Link href="/management">Manage</Link> : <Link href="/tasks?view=assigned">Assigned</Link>}
      </nav>
    </div>
  )
}
