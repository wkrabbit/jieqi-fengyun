import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'jieqi-secret-key-change-in-production'

export interface JwtPayload {
  userId: number
  username: string
  isVip: boolean
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export function parseTokenFromUrl(url: string): string | null {
  try {
    const params = new URLSearchParams(url.split('?')[1] || '')
    return params.get('token')
  } catch {
    return null
  }
}
