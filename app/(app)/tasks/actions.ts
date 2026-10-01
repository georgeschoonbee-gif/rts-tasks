'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function rpc(name: string, args: Record<string, unknown>) {
  const supabase = await createClient()
  const { error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
  revalidatePath('/management')
  revalidatePath('/notifications')
}

export async function startTask(formData: FormData) { await rpc('start_task', { p_task_id: String(formData.get('task_id')) }) }
export async function completeTask(formData: FormData) { await rpc('complete_task', { p_task_id: String(formData.get('task_id')), p_note: String(formData.get('note') || '') }) }
export async function closeTask(formData: FormData) { await rpc('close_task', { p_task_id: String(formData.get('task_id')) }) }
export async function returnTask(formData: FormData) { await rpc('return_task', { p_task_id: String(formData.get('task_id')), p_note: String(formData.get('note') || 'Please review this task.') }) }
