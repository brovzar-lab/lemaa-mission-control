export type Company = { id: string; name: string; short: string }

export const COMPANIES: Company[] = [
  { id: 'ff52ad91-250b-4d9d-a2ee-1d24b65ec3e8', name: 'Lemon Es Tu Dios', short: 'LEMA' },
  { id: 'da1766d2-228a-4b92-a4d3-b8cb6ec0b439', name: 'Lemon App-Uestas', short: 'APP' },
  { id: '2344c2e2-0833-4674-a877-74f9bae056bc', name: 'Monkey to Master', short: 'M2M' },
]

const COMPANY_KEY = 'mc_selected_company'

export function getSelectedCompany(): Company {
  try {
    const stored = localStorage.getItem(COMPANY_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Company
      if (COMPANIES.find((c) => c.id === parsed.id)) return parsed
    }
  } catch {
    // ignore
  }
  return COMPANIES[0]!
}

export function saveSelectedCompany(company: Company): void {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(company))
}

// Demo mode: only in local dev without a dev API URL configured
export const isDemoMode = import.meta.env.DEV && !import.meta.env.VITE_PAPERCLIP_API_URL

export const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 30000)
