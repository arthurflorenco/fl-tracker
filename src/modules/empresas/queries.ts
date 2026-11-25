import 'server-only'
import { db } from '@/lib/mock/store'

export const listarEmpresas = () => [...db().empresas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
export const empresaPorId = (id: string) => db().empresas.find((e) => e.id === id) ?? null
