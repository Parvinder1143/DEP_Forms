const INSTITUTE_DOMAIN = 'iitrpr.ac.in'

export function isInstituteEmail(email?: string | null): boolean {
  if (!email) return false
  return email.toLowerCase().trim().endsWith(`@${INSTITUTE_DOMAIN}`)
}

export function isExternalUser(email?: string | null): boolean {
  return !isInstituteEmail(email)
}
