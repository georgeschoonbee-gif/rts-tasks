import { createClient } from '@/lib/supabase/server'
import { markRead } from './actions'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)
  const items = data ?? []

  return <><div className="page-head"><div><h1>Notifications</h1><p>Task assignments, completions and returned work.</p></div></div><div className="grid">{items.map(n=><div className="card" key={n.id} style={{opacity:n.read_at ? .8 : 1}}><div style={{fontWeight:800}}>{n.title}</div><div style={{margin:'7px 0',color:'#555'}}>{n.message}</div><div className="meta"><span>{new Date(n.created_at).toLocaleString('en-ZA')}</span></div>{!n.read_at&&<form action={markRead} style={{marginTop:10}}><input type="hidden" name="id" value={n.id}/><button className="btn secondary small">Mark read</button></form>}</div>)}{!items.length&&<div className="card empty">No notifications yet.</div>}</div></>
}
