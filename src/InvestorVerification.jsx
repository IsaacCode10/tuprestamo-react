import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import InvestorBackBar from '@/components/InvestorBackBar.jsx';

const InvestorVerification = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  // Form state
  const [numeroCi, setNumeroCi] = useState('');
  const [ciFile, setCiFile] = useState(null);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Debes iniciar sesión para verificar tu cuenta.');
        setLoading(false);
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError('Error al cargar tu perfil.');
      } else {
        setProfile(data);
        setNumeroCi(data.numero_ci || '');
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    if (!numeroCi || !ciFile || !bankName || !accountNumber) {
      setError("Todos los campos son obligatorios.");
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado.");

      // 1. Actualizar el perfil con el número de CI
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ numero_ci: numeroCi })
        .eq('id', user.id);
      if (profileUpdateError) throw profileUpdateError;

      // 2. Subir el archivo del CI al bucket correcto
      const fileExt = ciFile.name.split('.').pop();
      const fileName = `${Date.now()}_ci_anverso.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('documentos-inversionistas')
        .upload(filePath, ciFile);
      if (uploadError) throw uploadError;

      // 3. Insertar la cuenta bancaria
      const { error: bankAccountError } = await supabase
        .from('cuentas_bancarias_inversionistas')
        .insert({
          user_id: user.id,
          nombre_banco: bankName,
          numero_cuenta: accountNumber,
        });
      if (bankAccountError) throw bankAccountError;

      // 4. Insertar el registro en la tabla 'documentos' para disparar el trigger
      const { error: docInsertError } = await supabase
        .from('documentos')
        .insert({
          user_id: user.id,
          tipo_documento: 'ci_inversionista_anverso', // Clave que el trigger espera
          url_archivo: filePath,
          nombre_archivo: fileName,
          estado: 'subido',
        });
      if (docInsertError) throw docInsertError;
      
      // 5. Finalmente, actualizar el estado de verificación del perfil
      const { error: finalStatusError } = await supabase
        .from('profiles')
        .update({ estado_verificacion: 'pendiente_revision' })
        .eq('id', user.id);
      if (finalStatusError) throw finalStatusError;

      setMessage('¡Verificación enviada con éxito! Recibirás una notificación cuando tu cuenta sea aprobada.');
      
    } catch (error) {
      setError(`Error al enviar la verificación: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Cargando tu perfil...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  if (!profile) {
    return <div>No se encontró el perfil.</div>;
  }

  return (
    <div className="verification-container" style={{ maxWidth: '768px', margin: 'auto', padding: '2rem' }}>
      <InvestorBackBar fallbackTo="/investor-dashboard" label="Volver al Panel" />
      <h2>Centro de Verificación</h2>
      <p>Completa los siguientes pasos para verificar tu cuenta y poder empezar a invertir.</p>
      
      <form onSubmit={handleSubmit}>
        <h3>1. Datos Personales</h3>
        <div>
          <label htmlFor="numeroCi">Número de Cédula de Identidad</label>
          <input 
            type="text" 
            id="numeroCi" 
            value={numeroCi}
            onChange={(e) => setNumeroCi(e.target.value)}
            required
          />
        </div>

        <h3>2. Documento de Identidad</h3>
        <div>
          <label htmlFor="ciFile">Sube tu Cédula de Identidad (Anverso)</label>
          <input 
            type="file" 
            id="ciFile"
            accept="image/png, image/jpeg"
            onChange={(e) => setCiFile(e.target.files[0])}
            required
          />
        </div>

        <h3>3. Cuenta Bancaria para Retiros</h3>
        <p>Esta será la única cuenta a la que podrás retirar tus fondos.</p>
        <div>
          <label htmlFor="bankName">Nombre del Banco</label>
          <input 
            type="text" 
            id="bankName" 
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="accountNumber">Número de Cuenta</label>
          <input 
            type="text" 
            id="accountNumber" 
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />
        </div>

        <button type="submit" style={{ marginTop: '2rem' }}>Enviar Verificación</button>
      </form>
    </div>
  );
};

export default InvestorVerification;
