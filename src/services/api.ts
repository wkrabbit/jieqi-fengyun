const API_BASE = '/api'

interface ApiResponse<T> {
  data?: T
  error?: string
}

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json()
    if (!res.ok) {
      return { error: json.error || `HTTP ${res.status}` }
    }
    return { data: json as T }
  } catch (err) {
    return { error: '网络连接失败，请检查服务器是否启动' }
  }
}

export const api = {
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  get: <T>(path: string) => request<T>('GET', path),
}
