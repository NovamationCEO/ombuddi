const configured = import.meta.env.VITE_API_URL as string | undefined
export const apiUrl = configured?.replace(/\/$/, '') ?? 'http://localhost:5002'
