'use client'

import { useMemo, useState } from 'react'

type Department = { id: string; name: string }
type Worker = { id: string; full_name: string; department_id: string | null; role: string }

export function AssignmentFields({
  departments,
  workers,
}: {
  departments: Department[]
  workers: Worker[]
}) {
  const [departmentId, setDepartmentId] = useState('')
  const [workerId, setWorkerId] = useState('')

  const filteredWorkers = useMemo(
    () => workers.filter((worker) => worker.department_id === departmentId),
    [workers, departmentId],
  )

  return (
    <div className="form-row">
      <div className="field">
        <label>Department</label>
        <select
          name="department_id"
          value={departmentId}
          onChange={(event) => {
            setDepartmentId(event.target.value)
            setWorkerId('')
          }}
          required
        >
          <option value="">Select department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Assign to</label>
        <select
          name="assigned_to"
          value={workerId}
          onChange={(event) => setWorkerId(event.target.value)}
          required
          disabled={!departmentId}
        >
          <option value="">
            {departmentId ? 'Select worker' : 'Select department first'}
          </option>
          {filteredWorkers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.full_name}
            </option>
          ))}
        </select>
        {departmentId && filteredWorkers.length === 0 && (
          <div className="meta" style={{ marginTop: 6 }}>
            No active users are linked to this department.
          </div>
        )}
      </div>
    </div>
  )
}
