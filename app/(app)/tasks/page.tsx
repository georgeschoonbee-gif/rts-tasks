import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TaskCard } from '@/components/TaskCard'

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  let query = supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name), assigner:profiles!tasks_assigned_by_fkey(full_name)').order('due_at', { ascending: true, nullsFirst: false })
  query = view === 'assigned' ? query.eq('assigned_by', user.id) : query.eq('assigned_to', user.id)
  const { data } = await query
  const tasks = data ?? []
  const open = tasks.filter(t => t.status !== 'closed')
  const overdue = open.filter(t => t.due_at && new Date(t.due_at) < new Date()).length
  const awaiting = tasks.filter(t => t.status === 'awaiting_approval').length
  return (
    <>
      <div className="page-head"><div><h1>{view === 'assigned' ? 'Tasks I Assigned' : 'My Tasks'}</h1><p>{view === 'assigned' ? 'Tasks you created for other workers.' : 'Work currently assigned to you.'}</p></div><Link className="btn" href="/new-task">+ New Task</Link></div>
      <div className="grid stats">
        <div className="card"><div className="stat-label">Open</div><div className="stat-value">{open.length}</div></div>
        <div className="card"><div className="stat-label">Overdue</div><div className="stat-value">{overdue}</div></div>
        <div className="card"><div className="stat-label">In Progress</div><div className="stat-value">{tasks.filter(t=>t.status==='in_progress').length}</div></div>
        <div className="card"><div className="stat-label">Awaiting Approval</div><div className="stat-value">{awaiting}</div></div>
        <div className="card"><div className="stat-label">Closed</div><div className="stat-value">{tasks.filter(t=>t.status==='closed').length}</div></div>
      </div>
      <div className="tabs"><Link href="/tasks">Assigned to Me</Link><Link href="/tasks?view=assigned">Assigned by Me</Link></div>
      <div className="grid">{tasks.length ? tasks.map(task => <TaskCard key={task.id} task={task} currentUserId={user.id}/>) : <div className="card empty">No tasks here yet.</div>}</div>
    </>
  )
}
