import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import InvestorBackBar from '@/components/InvestorBackBar.jsx'
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx'

// MVP robusto: autosave (servidor + local) y subida inmediata del archivo

const DRAFT_KEY_PREFIX = 'verification_drafts_local_v1'

export default function InvestorVerification() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [numeroCi, setNumeroCi] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ciFile, setCiFile] = useState(null)
  const [ciUploadedPath, setCiUploadedPath] = useState('')
  const [ciUploadedName, setCiUploadedName] = useState('')

  const draftKey = useMemo(() => (userId ? `${DRAFT_KEY_PREFIX}_${userId}` : null), [userId])
  const saveTimer = useRef(null)
  const isLocked = submitted || profile?.estado_verificacion === 'pendiente_revision' || profile?.estado_verificacion === 'verificado'

  useEffect(() => {
    async function boot() {
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth?.user) {
          setError('Debes iniciar sesion para verificar tu cuenta.')
          setLoading(false)
          return
        }
        setUserId(auth.user.id)

        // Cargar perfil
        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', auth.user.id)
          .single()
        if (pErr) throw pErr
        setProfile(prof)
        if (prof?.numero_ci) setNumeroCi(prof.numero_ci)

        // Intentar cargar borrador de servidor
        const { data: draftRow } = await supabase
          .from('verification_drafts')
          .select('numero_ci, bank_name, account_number, ci_uploaded_path, ci_uploaded_name')
          .eq('user_id', auth.user.id)
          .maybeSingle()

        if (draftRow) {
          if (draftRow.numero_ci) setNumeroCi(String(draftRow.numero_ci))
          if (draftRow.bank_name) setBankName(String(draftRow.bank_name))
          if (draftRow.account_number) setAccountNumber(String(draftRow.account_number))
          if (draftRow.ci_uploaded_path) {
            setCiUploadedPath(String(draftRow.ci_uploaded_path))
            setCiUploadedName(String(draftRow.ci_uploaded_name || String(draftRow.ci_uploaded_path).split('/').pop()))
          }
        } else {
          // Fallback: localStorage
          try {
            const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}_${auth.user.id}`)
            if (raw) {
              const d = JSON.parse(raw)
              if (d.numeroCi) setNumeroCi(d.numeroCi)
              if (d.bankName) setBankName(d.bankName)
              if (d.accountNumber) setAccountNumber(d.accountNumber)
              if (d.ciUploadedPath) {
                setCiUploadedPath(d.ciUploadedPath)
                setCiUploadedName(d.ciUploadedName || d.ciUploadedPath.split('/').pop())
              }
            }
          } catch {}
        }
      } catch (e) {
        setError('No se pudo cargar tu informacion.');
      } finally {
        setLoading(false)
      }
    }
    boot()
  }, [])

  // Autosave (debounce ~600ms) a servidor y luego localStorage
  useEffect(() => {
    if (!userId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true)
        await supabase.from('verification_drafts').upsert({
          user_id: userId,
          numero_ci: numeroCi || null,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          ci_uploaded_path: ciUploadedPath || null,
          ci_uploaded_name: ciUploadedName || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      } catch {}
      finally {
        setSaving(false)
        // Fallback local
        try {
          const draft = { numeroCi, bankName, accountNumber, ciUploadedPath, ciUploadedName, savedAt: Date.now() }
          localStorage.setItem(draftKey, JSON.stringify(draft))
        } catch {}
      }
    }, 600)
    return () => saveTimer.current && clearTimeout(saveTimer.current)
  }, [userId, draftKey, numeroCi, bankName, accountNumber, ciUploadedPath, ciUploadedName])

  const handleImmediateUpload = async (file) => {
    try {
      if (!file) return
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) throw new Error('No autenticado')
      const ext = file.name.split('.').pop()
      const name = `${Date.now()}_ci_anverso.${ext}`
      const path = `${auth.user.id}/${name}`
      const { error: upErr } = await supabase.storage
        .from('documentos-prestatarios')
        .upload(path, file)
      if (upErr) throw upErr
      setCiUploadedPath(path)
      setCiUploadedName(name)
      setCiFile(null)
      setInfo('Documento guardado. Puedes volver luego sin perder el avance.')
    } catch (e) {
      setError(`No se pudo subir el documento: ${e.message}`)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) throw new Error('No autenticado')

      if (!numeroCi || !bankName || !accountNumber || (!ciUploadedPath && !ciFile)) {
        throw new Error('Completa todos los campos y carga tu documento.')
      }

      // Asegurar archivo si aun no se subio
      let filePath = ciUploadedPath
      let fileName = ciUploadedName
      if (!filePath && ciFile) {
        const ext = ciFile.name.split('.').pop()
        fileName = `${Date.now()}_ci_anverso.${ext}`
        filePath = `${auth.user.id}/${fileName}`
        const { error: upErr } = await supabase.storage
          .from('documentos-prestatarios')
          .upload(filePath, ciFile)
        if (upErr) throw upErr
      }

      // 1) Actualizar perfil
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ numero_ci: numeroCi })
        .eq('id', auth.user.id)
      if (pErr) throw pErr

      // 2) Insertar documento en tabla
      const { error: dErr } = await supabase
        .from('documentos')
        .insert({
          user_id: auth.user.id,
          tipo_documento: 'ci_inversionista_anverso',
          url_archivo: filePath,
          nombre_archivo: fileName,
          estado: 'subido',
        })
      if (dErr) throw dErr

      // 3) Invocar verificacion (fallback)
      try {
        await supabase.functions.invoke('verificar-identidad-inversionista', {
          body: { record: { user_id: auth.user.id, url_archivo: filePath, tipo_documento: 'ci_inversionista_anverso' } },
        })
      } catch {}

      // 4) Marcar estado
      const { error: sErr } = await supabase
        .from('profiles')
        .update({ estado_verificacion: 'pendiente_revision' })
        .eq('id', auth.user.id)
      if (sErr) throw sErr

      // 5) Limpiar borrador
      try { await supabase.from('verification_drafts').delete().eq('user_id', auth.user.id) } catch {}
      try { localStorage.removeItem(draftKey) } catch {}

      setSubmitted(true)
      setInfo('Verificacion enviada con exito. Ya no necesitas hacer nada. Te notificaremos cuando sea aprobada.')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Cargando tu perfil...</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>
  if (!profile) return <div>No se encontro el perfil.</div>

  return (
    <div className="verification-container" style={{ maxWidth: 768, margin: 'auto', padding: '2rem' }}>
      <InvestorBackBar fallbackTo="/investor-dashboard" label="Volver al Panel" />
      <InvestorBreadcrumbs items={[
        { label: 'Inicio', to: '/investor-dashboard' },
        { label: 'Cuenta', to: '/verificar-cuenta' },
        { label: 'Verificar' },
      ]} />
      <h2>Centro de Verificacion</h2>
      {isLocked && (
        <div style={{ margin:'12px 0', padding:'12px', background:'#e6fffb', border:'1px solid #b5f5ec', color:'#006d75', borderRadius:8 }}>
          <strong>Verificacion enviada.</strong> Ya no necesitas hacer nada. Te avisaremos por notificaciones y email.
        </div>
      )}
      <p>Se guarda automaticamente tu avance.</p>

      <form onSubmit={handleSubmit}>
        <h3>1. Datos Personales</h3>
        <div>
          <label htmlFor="numeroCi">Numero de Cedula de Identidad</label>
          <input id="numeroCi" type="text" value={numeroCi} onChange={(e) => setNumeroCi(e.target.value)} required />
        </div>

        <h3>2. Documento de Identidad</h3>
        <div>
          <label htmlFor="ciFile">Sube tu Cedula de Identidad (Anverso)</label>
          {ciUploadedPath ? (
            <div style={{ padding: '8px 0' }}>
              <div style={{ color: '#11696b', fontWeight: 600 }}>Documento cargado: {ciUploadedName}</div>
              <small style={{ color: '#666' }}>Puedes continuar luego, el archivo queda guardado.</small>
              <div style={{ marginTop: 8 }}>
                <input id="ciFile" type="file" accept="image/png, image/jpeg" onChange={(e) => handleImmediateUpload(e.target.files?.[0])} />
                <small style={{ marginLeft: 8, color: '#555' }}>(Reemplazar archivo)</small>
              </div>
            </div>
          ) : (
            <input id="ciFile" type="file" accept="image/png, image/jpeg" onChange={(e) => { setCiFile(e.target.files?.[0] || null); handleImmediateUpload(e.target.files?.[0]); }} required />
          )}
        </div>

        <h3>3. Cuenta Bancaria para Retiros</h3>
        <p>Esta sera la unica cuenta a la que podras retirar tus fondos.</p>
        <div>
          <label htmlFor="bankName">Nombre del Banco</label>
          <input id="bankName" type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="accountNumber">Numero de Cuenta</label>
          <input id="accountNumber" type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
        </div>

        <div style={{ marginTop: 12, minHeight: 20 }}>
          {saving && <span style={{ color: '#666' }}>Guardando...</span>}
          {info && <span style={{ color: '#11696b' }}>{info}</span>}
        </div>

        <button type="submit" style={{ marginTop: '1rem' }}>Enviar Verificacion</button>
      </form>
    </div>
  )
}






