/**
 * Parse CSV content and extract user data
 * Expected CSV format: email,department,userrole
 * @param csvContent The raw CSV content
 * @returns Array of user data with email, department, and userrole
 */
export function parseUserCsv(csvContent: string): Array<{ email: string; department?: string; userrole?: string }> {
  const lines = csvContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Check if first line is a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('email');
  const startIndex = hasHeader ? 1 : 0;

  const users: Array<{ email: string; department?: string; userrole?: string }> = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',').map((part) => part.trim());
    if (parts.length >= 1 && parts[0]) {
      const email = parts[0];
      const department = parts[1] || undefined;
      const userrole = parts[2] || undefined;
      users.push({ email, department, userrole });
    }
  }

  return users;
}

/**
 * Validate if an email has institution format
 */
export function isValidInstitutionEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@iitrpr.ac.in');
}
