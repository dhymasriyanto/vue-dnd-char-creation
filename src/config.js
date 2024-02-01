export function useConfig() {
  const API_URL = import.meta.env.VITE_API_URL
  return {API_URL}
}
