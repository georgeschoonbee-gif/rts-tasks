import { createClient } from '@/lib/supabase/server'
import { AssignmentFields } from '@/components/AssignmentFields'
import { createTask } from './actions'

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const supabase = await createClient()

  const [workersResult, departmentsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('active', true)
      .order('full_name'),
    supabase
      .from('departments')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  const workers = workersResult.data ?? []
  const departments = departmentsResult.data ?? []

  return (
    <>
      <div className="page-head">
        <div>
          <h1>New Task</h1>
          <p>Select a department first, then assign the task to a user in that department.</p>
        </div>
      </div>

      <form className="card form" action={createTask}>
        {error && <div className="error">{error}</div>}

        <div className="field">
          <label>Task</label>
          <input name="title" required placeholder="e.g. Repair water trough" />
        </div>

        <div className="field">
          <label>Description</label>
          <textarea name="description" placeholder="Add instructions or important details" />
        </div>

        <AssignmentFields departments={departments} workers={workers} />

        <div className="form-row">
          <div className="field">
            <label>Location</label>
            <input name="location" placeholder="e.g. Pen 14 / Workshop" />
          </div>
          <div className="field">
            <label>Priority</label>
            <select name="priority" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Due date and time</label>
          <input name="due_at" type="datetime-local" />
        </div>

        <button className="btn" type="submit">Assign Task</button>
      </form>
    </>
  )
}
