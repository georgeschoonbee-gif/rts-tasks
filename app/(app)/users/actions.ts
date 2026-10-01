'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createUser(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const payload = {
    full_name: String(formData.get('full_name') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    password: String(formData.get('password') || ''),
    role: String(formData.get('role') || 'worker'),
    department_id: String(formData.get('department_id') || ''),
  }

  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: payload,
  })

  if (error) {
    redirect('/users?error=' + encodeURIComponent(error.message))
  }

  if (data?.error) {
    redirect('/users?error=' + encodeURIComponent(String(data.error)))
  }

  revalidatePath('/users')
  revalidatePath('/new-task')
  redirect('/users?success=' + encodeURIComponent('User created successfully'))
}
