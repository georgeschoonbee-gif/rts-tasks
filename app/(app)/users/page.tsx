import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createUser } from './actions'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/tasks')

  const [departmentsResult, usersResult] = await Promise.all([
    supabase.from('departments').select('id, name').eq('active', true).order('name'),
    supabase
      .from('profiles')
      .select('id, full_name, role, active, department:departments(name)')
      .order('full_name'),
  ])

  const departments = departmentsResult.data ?? []
  const users = usersResult.data ?? []

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Create users and link each person to a department.</p>
        </div>
      </div>

      <form className="card form" action={createUser}>
        <h3 style={{ marginTop: 0 }}>Add User</h3>
        {error && <div className="error">{error}</div>}
        {success && <div className="notice">{success}</div>}

        <div className="form-row">
          <div className="field">
            <label>Full name</label>
            <input name="full_name" required placeholder="Worker name" />
          </div>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" required placeholder="worker@company.co.za" />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Temporary password</label>
            <input name="password" type="password" required minLength={8} />
          </div>
          <div className="field">
            <label>Role</label>
            <select name="role" defaultValue="worker" required>
              <option value="worker">Worker</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Department</label>
          <select name="department_id" required>
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <button className="btn" type="submit">Create User</button>
      </form>

      <div className="table-wrap" style={{ marginTop: 18 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.full_name}</strong></td>
                <td>{item.department?.name || 'Not assigned'}</td>
                <td>{item.role}</td>
                <td>{item.active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={4} className="empty">No users yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
