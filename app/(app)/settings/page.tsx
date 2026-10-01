import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage(){
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['manager','admin'].includes(profile.role)) redirect('/tasks')

  const [departmentsResult, workersResult] = await Promise.all([
    supabase.from('departments').select('*').order('name'),
    supabase.from('profiles').select('id,full_name,role,active').order('full_name')
  ])
  const departments = departmentsResult.data ?? []
  const workers = workersResult.data ?? []

  return <><div className="page-head"><div><h1>Settings</h1><p>Current company departments and users.</p></div></div><div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}><div className="card"><h3>Departments</h3>{departments.map(d=><div key={d.id} style={{padding:'9px 0',borderBottom:'1px solid #eee'}}>{d.name}</div>)}</div><div className="card"><h3>Workers</h3>{workers.map(w=><div key={w.id} style={{padding:'9px 0',borderBottom:'1px solid #eee'}}><strong>{w.full_name}</strong><div className="meta">{w.role} · {w.active?'Active':'Inactive'}</div></div>)}</div></div><div className="notice" style={{marginTop:16}}>User creation and department editing will be added in the next management pass. The database already supports both.</div></>
}
