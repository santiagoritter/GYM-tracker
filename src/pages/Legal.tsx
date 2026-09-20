import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, FileText, ShieldCheck } from 'lucide-react'
import { Card, Row } from '@/components/ui/Card'
import { SUPPORT_EMAIL } from '@/lib/legal'
import { LEGAL_UPDATED, PRIVACY, TERMS, visibleSections, type LegalDoc } from '@/lib/legalText'

/**
 * Textos legales. El contenido vive en `src/lib/legalText.ts` (fuente de verdad,
 * refleja lo que la app REALMENTE hace); acá solo se dibuja.
 * Ruta: `/legal` (índice), `/legal/privacidad`, `/legal/terminos`.
 */

function Header({ title, backTo }: { title: string; backTo: string }) {
  const navigate = useNavigate()
  return (
    <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <button
        onClick={() => navigate(backTo)}
        aria-label="Volver"
        className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
      >
        <ArrowLeft size={22} />
      </button>
      <h1 className="font-semibold">{title}</h1>
    </header>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto content-width space-y-4 px-5 py-5 text-[15px] leading-relaxed text-ink-2 [&_h2]:mt-6 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:text-ink [&_strong]:text-ink">
      {children}
      <p className="pt-4 text-[13px] text-ink-3">
        Última actualización: {LEGAL_UPDATED}. Dudas: {SUPPORT_EMAIL}
      </p>
    </div>
  )
}

/** `**negrita**` en línea (el resto es texto plano: sin HTML de por medio). */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((chunk, i) =>
        i % 2 === 1 ? <strong key={i}>{chunk}</strong> : <span key={i}>{chunk}</span>
      )}
    </>
  )
}

function DocPage({ doc }: { doc: LegalDoc }) {
  const sections = visibleSections(doc)
  return (
    <div className="min-h-screen pb-24">
      <Header title={doc.title} backTo="/legal" />
      <Prose>
        {doc.intro.map((p) => (
          <p key={p}>
            <Inline text={p} />
          </p>
        ))}
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <div className="space-y-3">
              {section.body.map((p) => (
                <p key={p}>
                  <Inline text={p} />
                </p>
              ))}
            </div>
          </section>
        ))}
      </Prose>
    </div>
  )
}

function Index() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen pb-24">
      <Header title="Legal" backTo="/ajustes" />
      <div className="mx-auto content-width space-y-4 px-4 py-4">
        <Card>
          <Row onClick={() => navigate('/legal/privacidad')}>
            <ShieldCheck size={18} className="shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 text-[15px]">Política de privacidad</span>
            <ChevronRight size={16} className="shrink-0 text-ink-4" />
          </Row>
          <Row onClick={() => navigate('/legal/terminos')}>
            <FileText size={18} className="shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 text-[15px]">Términos de uso</span>
            <ChevronRight size={16} className="shrink-0 text-ink-4" />
          </Row>
        </Card>
      </div>
    </div>
  )
}

export default function Legal() {
  const { doc } = useParams<{ doc?: string }>()
  if (doc === 'privacidad') return <DocPage doc={PRIVACY} />
  if (doc === 'terminos') return <DocPage doc={TERMS} />
  return <Index />
}
