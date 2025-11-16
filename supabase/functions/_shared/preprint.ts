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

  const bodyText = `Por medio del presente documento, yo, ${nombre_completo}, mayor de edad, hábil por derecho, con Cédula de Identidad N° ${cedula_identidad}, con domicilio en la ciudad de ${location}, en mi calidad de solicitante de un producto crediticio:\n\n1. AUTORIZACIÓN: De manera libre, voluntaria y expresa, autorizo a TU PRESTAMO BOLIVIA S.R.L. para que, por cuenta propia o a través de terceros designados, pueda solicitar, consultar, verificar y obtener mi historial crediticio, mi nivel de endeudamiento, mi score de riesgo y cualquier otra información crediticia y de comportamiento comercial que considere relevante.\n\n2. ALCANCE: Esta autorización abarca la consulta de información en todas las centrales de riesgo, buros de información crediticia o entidades análogas, públicas o privadas, que operen en el territorio del Estado Plurinacional de Bolivia, incluyendo, pero no limitándose a, INFOCRED S.A.\n\n3. FINALIDAD: Declaro que la información obtenida será utilizada única y exclusivamente para fines de evaluación, análisis y calificación de mi solicitud de crédito, así como para la gestión de la relación crediticia en caso de que mi solicitud sea aprobada.\n\n4. VIGENCIA: La presente autorización se mantendrá vigente durante todo el tiempo que dure el proceso de análisis y evaluación de mi solicitud de crédito y, en caso de ser aprobada, durante toda la vigencia de la relación contractual con TU PRESTAMO BOLIVIA S.R.L.\n\nEn señal de conformidad con los términos expuestos, acepto la presente autorización de manera digital.\n\nFecha de Aceptación: ${creationDate}\nRegistro de Aceptación Digital: Se registra la dirección IP y la marca de tiempo (timestamp) en el momento de la aceptación como constancia de la manifestación de voluntad.`

  page.drawText(bodyText, {
    x: margin,
    y,
    font,
    size: 11,
    maxWidth: textWidth,
    lineHeight: 15,
  })

  return pdfDoc.save()
}

export async function ensureAuthorizationPreprint(supabaseClient: any, solicitud: any) {
  if (!solicitud) return
  const { id: solicitud_id, user_id } = solicitud
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
    const folder = user_id || 'unknown'
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
      user_id,
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
