import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ManagementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['manager','admin'].includes(profile.role)) redirect('/tasks')
  const { data: tasks = [] } = await supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name), assigner:profiles!tasks_assigned_by_fkey(full_name), department:departments(name)').order('created_at', { ascending: false })
  const open = tasks.filter(t=>t.status !== 'closed')
  const overdue = open.filter(t=>t.due_at && new Date(t.due_at)<new Date()).length
  return (
    <>
      <div className="page-head"><div><h1>Management</h1><p>All tasks for your company.</p></div></div>
      <div className="grid stats">
        <div className="card"><div className="stat-label">Open Tasks</div><div className="stat-value">{open.length}</div></div>
        <div className="card"><div className="stat-label">Overdue</div><div className="stat-value">{overdue}</div></div>
        <div className="card"><div className="stat-label">In Progress</div><div className="stat-value">{tasks.filter(t=>t.status==='in_progress').length}</div></div>
        <div className="card"><div className="stat-label">Awaiting Approval</div><div className="stat-value">{tasks.filter(t=>t.status==='awaiting_approval').length}</div></div>
        <div className="card"><div className="stat-label">Closed</div><div className="stat-value">{tasks.filter(t=>t.status==='closed').length}</div></div>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Task</th><th>Assigned To</th><th>Assigned By</th><th>Department</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead><tbody>
        {tasks.map(t=><tr key={t.id}><td><strong>{t.title}</strong><div style={{color:'#777',fontSize:12}}>{t.location || ''}</div></td><td>{t.assignee?.full_name}</td><td>{t.assigner?.full_name}</td><td>{t.department?.name || '—'}</td><td>{t.due_at ? new Date(t.due_at).toLocaleString('en-ZA') : '—'}</td><td><span className={`badge ${t.priority}`}>{t.priority}</span></td><td><span className={`badge ${t.status}`}>{t.status.replaceAll('_',' ')}</span></td></tr>)}
        {!tasks.length && <tr><td colSpan={7} className="empty">No tasks yet.</td></tr>}
      </tbody></table></div>
    </>
  )
}
