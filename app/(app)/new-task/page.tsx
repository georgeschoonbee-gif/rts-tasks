import { createClient } from '@/lib/supabase/server'
import { createTask } from './actions'

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const supabase = await createClient()
  const [{ data: workers = [] }, { data: departments = [] }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role').eq('active', true).order('full_name'),
    supabase.from('departments').select('id, name').eq('active', true).order('name')
  ])
  return (
    <>
      <div className="page-head"><div><h1>New Task</h1><p>Assign a task to a worker and set the expected completion date.</p></div></div>
      <form className="card form" action={createTask}>
        {error && <div className="error">{error}</div>}
        <div className="field"><label>Task</label><input name="title" required placeholder="e.g. Repair water trough" /></div>
        <div className="field"><label>Description</label><textarea name="description" placeholder="Add instructions or important details" /></div>
        <div className="form-row">
          <div className="field"><label>Assign to</label><select name="assigned_to" required><option value="">Select worker</option>{workers.map(w=><option key={w.id} value={w.id}>{w.full_name}</option>)}</select></div>
          <div className="field"><label>Department</label><select name="department_id"><option value="">No department</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Location</label><input name="location" placeholder="e.g. Pen 14 / Workshop" /></div>
          <div className="field"><label>Priority</label><select name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
        </div>
        <div className="field"><label>Due date and time</label><input name="due_at" type="datetime-local" /></div>
        <button className="btn" type="submit">Assign Task</button>
      </form>
    </>
  )
}
