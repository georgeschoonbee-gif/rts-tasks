'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const payload = {
    title: String(formData.get('title') || ''),
    description: String(formData.get('description') || '') || null,
    assigned_to: String(formData.get('assigned_to') || ''),
    department_id: String(formData.get('department_id') || '') || null,
    location: String(formData.get('location') || '') || null,
    priority: String(formData.get('priority') || 'medium'),
    due_at: String(formData.get('due_at') || '') || null,
    assigned_by: user.id,
  }
  const { error } = await supabase.from('tasks').insert(payload)
  if (error) redirect('/new-task?error=' + encodeURIComponent(error.message))
  redirect('/tasks?view=assigned')
}
