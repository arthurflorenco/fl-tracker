import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { ActionForm, SubmitButton } from '@/components/ui/ActionForm'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { exigirArea } from '@/lib/session'
import { podeGerirProjetos } from '@/lib/permissions'
import { criarProjeto } from '@/modules/projetos/actions'

export const generateMetadata = tituloDaPagina('novoProjeto')

export default async function NovoProjetoPage() {
  const eu = await exigirArea('projetos')
  if (!podeGerirProjetos(eu)) notFound()
  const { t } = await getI18n()
  const tp = t.projetos
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/projetos">{t.titulos.projetos} ←</Link>} titulo={tp.novo} descricao={tp.novoDescricao} />
      <Card className="max-w-[720px]">
        <ActionForm action={criarProjeto} className="flex flex-col gap-5">
          <Field label={tp.titulo} name="titulo">
            <Input name="titulo" required placeholder={tp.tituloExemplo} />
          </Field>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={tp.cliente} name="clienteNome">
              <Input name="clienteNome" required />
            </Field>
            <Field label={tp.morada} name="morada">
              <Input name="morada" />
            </Field>
            <Field label={tp.email} name="clienteEmail">
              <Input name="clienteEmail" type="email" />
            </Field>
            <Field label={tp.telefone} name="clienteTelefone">
              <Input name="clienteTelefone" type="tel" />
            </Field>
          </div>
          <SubmitButton className="self-start">{tp.criar}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  )
}
