import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { ActionForm, SubmitButton } from '@/components/ui/ActionForm'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { exigirArea } from '@/lib/session'
import { listarEquipas, membrosDe } from '@/modules/equipas/queries'
import { TIPOS_EQUIPA } from '@/modules/equipas/schema'
import { criarEquipa } from '@/modules/equipas/actions'

export const generateMetadata = tituloDaPagina('equipas')

export default async function EquipasPage() {
  const eu = await exigirArea('equipas')
  const { t } = await getI18n()
  const te = t.equipas
  const equipas = listarEquipas(eu.empresaId)
  return (
    <>
      <PageHeader eyebrow={te.eyebrow} titulo={t.titulos.equipas} descricao={te.descricao} />
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {equipas.map((e) => {
            const membros = membrosDe(e.id)
            return (
              <Link key={e.id} href={`/admin/equipas/${e.id}`} className="group">
                <Card className="flex h-full flex-col gap-3 transition-shadow group-hover:shadow-[inset_0_0_0_1px_var(--accent)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">{t.rotulos.tipoEquipa[e.tipo]}</p>
                  <p className="text-[19px] font-bold">{e.nome}</p>
                  <ul className="text-[13px] text-text-mid">
                    {membros.length === 0 && <li className="text-text-dim">{te.semMembros}</li>}
                    {membros.map((m) => (
                      <li key={m.id}>{m.nome}</li>
                    ))}
                  </ul>
                  <span className="mt-auto text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">{te.verObrasEHoras}</span>
                </Card>
              </Link>
            )
          })}
        </div>
        <section>
          <SectionTitle>{te.nova}</SectionTitle>
          <Card>
            <ActionForm action={criarEquipa} className="flex flex-col gap-4">
              <Field label={te.nome} name="nome">
                <Input name="nome" required placeholder={te.nomeExemplo} />
              </Field>
              <Field label={te.tipo} name="tipo">
                <Select name="tipo" defaultValue="montagem">
                  {TIPOS_EQUIPA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {t.rotulos.tipoEquipa[tipo]}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton>{te.criar}</SubmitButton>
            </ActionForm>
          </Card>
        </section>
      </div>
    </>
  )
}
