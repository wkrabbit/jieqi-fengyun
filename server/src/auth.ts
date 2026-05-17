import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { findUserByUsername, createUser } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'jieqi-secret-key-change-in-production'
const JWT_EXPIRY = '24h'
const VIP_USERS = ['wkrabbit', 'admin111']

export const authRouter = Router()

interface JwtPayload {
  userId: number
  username: string
  isVip: boolean
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}

function toUserResponse(user: ReturnType<typeof findUserByUsername>) {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isVip: user.is_vip === 1,
    createdAt: user.created_at,
  }
}

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' })
      return
    }
    if (typeof username !== 'string' || username.length < 2 || username.length > 20) {
      res.status(400).json({ error: '用户名长度需在 2-20 个字符之间' })
      return
    }
    if (typeof password !== 'string' || password.length < 4) {
      res.status(400).json({ error: '密码长度至少 4 个字符' })
      return
    }

    const existing = findUserByUsername(username)
    if (existing) {
      res.status(409).json({ error: '用户名已存在' })
      return
    }

    const hash = await bcrypt.hash(password, 10)
    const isVip = VIP_USERS.includes(username)
    const user = createUser(username, hash, email || null, isVip)

    const token = signToken({ userId: user.id, username: user.username, isVip: user.is_vip === 1 })
    res.status(201).json({ token, user: toUserResponse(user) })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' })
      return
    }

    const user = findUserByUsername(username)
    if (!user) {
      res.status(401).json({ error: '用户名或密码错误' })
      return
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      res.status(401).json({ error: '用户名或密码错误' })
      return
    }

    const token = signToken({ userId: user.id, username: user.username, isVip: user.is_vip === 1 })
    res.json({ token, user: toUserResponse(user) })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: '服务器内部错误' })
  }
})
