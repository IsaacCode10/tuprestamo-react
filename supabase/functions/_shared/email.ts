export type EmailTemplateOptions = {
  greetingName?: string
  title?: string
  intro?: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  footerNote?: string
  extraHtml?: string
}

export function renderEmail(opts: EmailTemplateOptions) {
  const logoUrl = 'https://tuprestamobo.com/Logo-Tu-Prestamo.png'
  const primary = '#00445A'
  const text = '#222'

  const greeting = opts.greetingName ? `Hola ${escapeHtml(opts.greetingName)},` : 'Hola,'
  const title = opts.title
    ? `<h2 style="margin:0 0 8px 0;color:${primary};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(opts.title)}</h2>`
    : ''
  const intro = opts.intro
    ? `<p style="margin:8px 0 0 0;color:${text}">${escapeHtml(opts.intro)}</p>`
    : ''
  const body = opts.body
    ? `<p style="margin:8px 0 0 0;color:${text}">${escapeHtml(opts.body)}</p>`
    : ''
  const extra = opts.extraHtml ? opts.extraHtml : ''
  const cta = opts.ctaHref && opts.ctaLabel
    ? `<p style="margin:16px 0 0 0; text-align:center;"><a href="${escapeAttr(opts.ctaHref)}" style="background:#11696b;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">${escapeHtml(opts.ctaLabel)}</a></p>`
    : ''
  const footer = `<p style="color:#777;font-size:12px;margin-top:20px;">Este es un mensaje automÃƒÆ’Ã‚Â¡tico de Tu PrÃƒÆ’Ã‚Â©stamo. Si necesitas ayuda, responde a este correo.</p>`

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
    <img src="${logoUrl}" alt="Tu PrÃƒÆ’Ã‚Â©stamo" style="height:36px;margin-bottom:12px;"/>
    <p style="margin:0;color:${text}">${greeting}</p>
    ${title}
    ${intro}
    ${body}
    ${extra}
    ${cta}
    ${footer}
  </div>`
}

function escapeHtml(s: string) {
  return s.replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c] as string))
}
function escapeAttr(s: string) {
  return s.replace(/[\"]/g, (c) => ({ '\"': '&quot;' }[c] as string))
}

