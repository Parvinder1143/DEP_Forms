import { supabase } from '@/lib/supabase'
import { User, Employee, Student, Department, Role, UserRole } from '@/db/schema'

// ============================================================================
// USER QUERIES
// ============================================================================

export async function getUser(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as User
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) throw error
  return data as User
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')

  if (error) throw error
  return data as User[]
}

export async function getUsersByType(userType: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_type', userType)

  if (error) throw error
  return data as User[]
}

export async function createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single()

  if (error) throw error
  return data as User
}

export async function updateUser(id: string, updates: Partial<User>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as User
}

export async function deleteUser(id: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// EMPLOYEE QUERIES
// ============================================================================

export async function getEmployee(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Employee
}

export async function getEmployeeByCode(employeeCode: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_code', employeeCode)
    .single()

  if (error) throw error
  return data as Employee
}

export async function getEmployeesByDepartment(departmentId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('department_id', departmentId)

  if (error) throw error
  return data as Employee[]
}

export async function getEmployeesByType(employmentType: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('employment_type', employmentType)

  if (error) throw error
  return data as Employee[]
}

export async function createEmployee(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('employees')
    .insert(employee)
    .select()
    .single()

  if (error) throw error
  return data as Employee
}

export async function updateEmployee(id: string, updates: Partial<Employee>) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Employee
}

// ============================================================================
// STUDENT QUERIES
// ============================================================================

export async function getStudent(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Student
}

export async function getStudentByEntryNumber(entryNumber: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('entry_number', entryNumber)
    .single()

  if (error) throw error
  return data as Student
}

export async function getStudentsByDepartment(departmentId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('department_id', departmentId)

  if (error) throw error
  return data as Student[]
}

export async function getStudentsByHostelStatus(hostelAllocated: boolean) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('hostel_allocated', hostelAllocated)

  if (error) throw error
  return data as Student[]
}

export async function createStudent(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single()

  if (error) throw error
  return data as Student
}

export async function updateStudent(id: string, updates: Partial<Student>) {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Student
}

// ============================================================================
// DEPARTMENT QUERIES
// ============================================================================

export async function getDepartment(id: string) {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Department
}

export async function getDepartmentByName(name: string) {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('name', name)
    .single()

  if (error) throw error
  return data as Department
}

export async function getAllDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data as Department[]
}

export async function createDepartment(department: Omit<Department, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('departments')
    .insert(department)
    .select()
    .single()

  if (error) throw error
  return data as Department
}

export async function updateDepartment(id: string, updates: Partial<Department>) {
  const { data, error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Department
}

// ============================================================================
// ROLE QUERIES
// ============================================================================

export async function getRole(id: string) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Role
}

export async function getRoleByName(name: string) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('name', name)
    .single()

  if (error) throw error
  return data as Role
}

export async function getAllRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('*')

  if (error) throw error
  return data as Role[]
}

export async function createRole(role: Omit<Role, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('roles')
    .insert(role)
    .select()
    .single()

  if (error) throw error
  return data as Role
}

// ============================================================================
// USER ROLE QUERIES
// ============================================================================

export async function getUserRoles(userId: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data as UserRole[]
}

export async function assignRoleToUser(userId: string, roleId: string, departmentId?: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role_id: roleId, department_id: departmentId })
    .select()
    .single()

  if (error) throw error
  return data as UserRole
}

export async function removeRoleFromUser(userId: string, roleId: string) {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)

  if (error) throw error
}

export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('roles!inner(name)')
    .eq('user_id', userId)
    .eq('roles.name', roleName)
    .single()

  if (error) return false
  return !!data
}

export async function hasRoleInDepartment(userId: string, roleName: string, departmentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('roles!inner(name)')
    .eq('user_id', userId)
    .eq('department_id', departmentId)
    .eq('roles.name', roleName)
    .single()

  if (error) return false
  return !!data
}
