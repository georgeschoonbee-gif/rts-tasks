import { closeTask, completeTask, returnTask, startTask } from '@/app/(app)/tasks/actions'

type Task = {
  id: string
  title: string
  description: string | null
  location: string | null
  priority: string
  status: string
  due_at: string | null
  assigned_to: string
  assigned_by: string
  assignee?: { full_name: string } | null
  assigner?: { full_name: string } | null
}

export function TaskCard({ task, currentUserId }: { task: Task, currentUserId: string }) {
  const mine = task.assigned_to === currentUserId
  const assignedByMe = task.assigned_by === currentUserId
  return (
    <article className="task-card">
      <div style={{display:'flex', justifyContent:'space-between', gap:12}}>
        <div className="task-title">{task.title}</div>
        <span className={`badge ${task.priority}`}>{task.priority}</span>
      </div>
      {task.description && <div style={{marginBottom:10}}>{task.description}</div>}
      <div className="meta">
        {task.location && <span>Location: {task.location}</span>}
        <span>Status: {task.status.replaceAll('_',' ')}</span>
        {task.due_at && <span>Due: {new Date(task.due_at).toLocaleString('en-ZA')}</span>}
        {task.assignee?.full_name && <span>Assigned to: {task.assignee.full_name}</span>}
        {task.assigner?.full_name && <span>Assigned by: {task.assigner.full_name}</span>}
      </div>
      <div className="task-actions">
        {mine && (task.status === 'assigned' || task.status === 'returned') && <form action={startTask}><input type="hidden" name="task_id" value={task.id}/><button className="btn small" type="submit">Start Task</button></form>}
        {mine && task.status === 'in_progress' && <form action={completeTask} style={{display:'flex', gap:8, flexWrap:'wrap'}}><input type="hidden" name="task_id" value={task.id}/><input name="note" placeholder="Completion note" style={{padding:'7px 9px', border:'1px solid #ddd', borderRadius:8}}/><button className="btn success small" type="submit">Mark Complete</button></form>}
        {assignedByMe && task.status === 'awaiting_approval' && <form action={closeTask}><input type="hidden" name="task_id" value={task.id}/><button className="btn success small" type="submit">Close Task</button></form>}
        {assignedByMe && task.status === 'awaiting_approval' && <form action={returnTask} style={{display:'flex', gap:8, flexWrap:'wrap'}}><input type="hidden" name="task_id" value={task.id}/><input name="note" placeholder="Reason / instruction" style={{padding:'7px 9px', border:'1px solid #ddd', borderRadius:8}}/><button className="btn warning small" type="submit">Return Task</button></form>}
      </div>
    </article>
  )
}
