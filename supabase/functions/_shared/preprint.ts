import { PDFDocument, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

export const PREPRINT_DOCUMENT_TYPE = 'autorizacion_infocred_preimpresa'

const DEFAULT_LOCATION = 'La Paz'

export async function generateAuthorizationPDF(solicitud: any) {
  const {
    nombre_completo = 'Solicitante',
    cedula_identidad = '',
    ciudad,
    departamento,
  } = solicitud
  const location = ciudad || departamento || DEFAULT_LOCATION
  const creationDate = new Date().toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' })

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage()
  const { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let y = height - 50
  const margin = 50
  const textWidth = width - 2 * margin

  page.drawText('AUTORIZACIÓN EXPRESA PARA LA CONSULTA DE INFORMACIÓN CREDITICIA', {
    x: margin,
    y,
    font: boldFont,
    size: 14,
    maxWidth: textWidth,
    lineHeight: 20,
  })
  y -= 40

  const bodyText = `Por medio del presente documento, yo, ${nombre_completo}, mayor de edad, habil por derecho, con Cedula de Identidad No. ${cedula_identidad}, con domicilio en la ciudad de ${location}, en mi calidad de solicitante de un producto crediticio:

1. AUTORIZACION: De manera libre, voluntaria y expresa, autorizo a TU PRESTAMO BOLIVIA S.R.L. para que, por cuenta propia o a traves de terceros designados, pueda solicitar, consultar, verificar y obtener mi historial crediticio, mi nivel de endeudamiento, mi score de riesgo y cualquier otra informacion crediticia y de comportamiento comercial que considere relevante.

2. ALCANCE: Esta autorizacion abarca la consulta de informacion en todas las centrales de riesgo, buros de informacion crediticia o entidades analogas, publicas o privadas, que operen en el territorio del Estado Plurinacional de Bolivia, incluyendo, pero no limitandose a, INFOCRED S.A.

3. AUTORIZACION ASFI/BI/CIC: Autorizo en forma expresa a TU PRESTAMO BOLIVIA S.R.L. a solicitar informacion sobre mis antecedentes crediticios y otras cuentas por pagar de caracter economico, financiero y comercial registradas en la Base de Informacion Crediticia (BI) y en la Central de Informacion Crediticia (CIC) de la Autoridad de Supervision del Sistema Financiero (ASFI), durante toda mi relacion contractual con la entidad.

4. INCORPORACION DE DATOS: Asimismo, autorizo a que los datos crediticios y de otras cuentas por pagar derivados de mi relacion con TU PRESTAMO BOLIVIA S.R.L. se incorporen y actualicen en las bases de datos de los buros o entidades que cuenten con licencia de funcionamiento otorgada por la ASFI y la CIC.

5. FINALIDAD: Declaro que la informacion obtenida sera utilizada unica y exclusivamente para fines de evaluacion, analisis y calificacion de mi solicitud de credito, asi como para la gestion de la relacion crediticia en caso de que mi solicitud sea aprobada.

6. VIGENCIA: La presente autorizacion se mantendra vigente durante todo el tiempo que dure el proceso de analisis y evaluacion de mi solicitud de credito y, en caso de ser aprobada, durante toda la vigencia de la relacion contractual con TU PRESTAMO BOLIVIA S.R.L.

En senal de conformidad con los terminos expuestos, acepto la presente autorizacion de manera digital.

Fecha de Aceptacion: ${creationDate}
Registro de Aceptacion Digital: Se registra la direccion IP y la marca de tiempo (timestamp) en el momento de la aceptacion como constancia de la manifestacion de voluntad.`

  page.drawText(bodyText, {
    x: margin,
    y,
    font,
    size: 11,
    maxWidth: textWidth,
    lineHeight: 15,
  })

  const signatureLineWidth = 260
  const signatureY = margin + 100
  const signatureX = (width / 2) - (signatureLineWidth / 2)

  page.drawLine({
    start: { x: signatureX, y: signatureY },
    end: { x: signatureX + signatureLineWidth, y: signatureY },
    thickness: 1.2,
  })

  const displayName = nombre_completo || 'Nombre del solicitante'
  const nameWidth = font.widthOfTextAtSize(displayName, 12)
  page.drawText(displayName, {
    x: (width / 2) - (nameWidth / 2),
    y: signatureY - 18,
    font,
    size: 12,
  })

  return pdfDoc.save()
}

export async function ensureAuthorizationPreprint(supabaseClient: any, solicitud: any, explicitUserId?: string) {
  if (!solicitud) return
  const { id: solicitud_id, user_id } = solicitud
  const ownerId = explicitUserId || user_id || 'unknown'
  const { data: existing, error: queryError } = await supabaseClient
    .from('documentos')
    .select('id')
    .eq('solicitud_id', solicitud_id)
    .eq('tipo_documento', PREPRINT_DOCUMENT_TYPE)
    .limit(1)

  if (queryError) {
    console.error(`Error buscando preimpreso INFOCRED para solicitud ${solicitud_id}:`, queryError)
    return
  }
  if (existing && existing.length > 0) {
    console.log(`Preimpreso INFOCRED ya existe para solicitud ${solicitud_id}`)
    return
  }

  try {
    const pdfBytes = await generateAuthorizationPDF(solicitud)
    const folder = ownerId || 'unknown'
    const pdfFileName = `${folder}/${solicitud_id}_${PREPRINT_DOCUMENT_TYPE}.pdf`
    const { error: storageError } = await supabaseClient
      .storage
      .from('documentos-prestatarios')
      .upload(pdfFileName, pdfBytes, { contentType: 'application/pdf', upsert: true })
    if (storageError) {
      console.error(`Error subiendo preimpreso INFOCRED para ${solicitud_id}:`, storageError)
      return
    }

    const { error: dbError } = await supabaseClient.from('documentos').insert({
      solicitud_id,
      user_id: ownerId,
      tipo_documento: PREPRINT_DOCUMENT_TYPE,
      nombre_archivo: pdfFileName,
      url_archivo: pdfFileName,
      estado: 'subido',
    })
    if (dbError) {
      console.error(`Error registrando preimpreso INFOCRED para ${solicitud_id}:`, dbError)
    } else {
      console.log(`Preimpreso INFOCRED creado para solicitud ${solicitud_id}`)
    }
  } catch (err) {
    console.error(`Error generando preimpreso INFOCRED para solicitud ${solicitud_id}:`, err)
  }
}
