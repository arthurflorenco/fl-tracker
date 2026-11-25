import { describe, expect, it } from 'vitest'
import { tokenDeQr } from './token'

describe('tokenDeQr', () => {
  it('aceita o URL do QR de qualquer domínio', () => {
    expect(tokenDeQr('https://app.example.com/q/demo2026014obra1')).toBe('demo2026014obra1')
    expect(tokenDeQr('http://localhost:3000/q/abc123def/')).toBe('abc123def')
    expect(tokenDeQr('https://app.example.com/q/abc123def?x=1')).toBe('abc123def')
  })
  it('aceita só o token e rejeita outros textos', () => {
    expect(tokenDeQr('demo2026014obra1')).toBe('demo2026014obra1')
    expect(tokenDeQr('https://www.google.com/search?q=x')).toBeNull()
    expect(tokenDeQr('Olá mundo')).toBeNull()
  })
})
