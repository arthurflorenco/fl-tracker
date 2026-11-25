import { AppShell } from '@/components/layout/AppShell'
import { exigirSessao } from '@/lib/session'

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const perfil = await exigirSessao()
  return <AppShell perfil={perfil}>{children}</AppShell>
}
