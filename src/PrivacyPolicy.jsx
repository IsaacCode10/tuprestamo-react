import React from 'react';
import InvestorBackBar from '@/components/InvestorBackBar.jsx';
import { useProfile } from '@/hooks/useProfile.js';

const PrivacyPolicy = () => {
  const { profile } = useProfile();
  const showInvestorBack = profile && (profile.role === 'inversionista' || profile.role === 'admin');
  return (
  <div className="container" style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
    {showInvestorBack && (
      <InvestorBackBar fallbackTo="/investor-dashboard" label="Volver al Panel" />
    )}
    <h1 style={{ marginBottom: 8 }}>Política de Privacidad</h1>
    <p style={{ color: '#555', marginBottom: 24 }}>Última actualización: [dd/mm/aaaa]</p>

    <h2>1. Responsable</h2>
    <p>Tu Préstamo Bolivia. Contacto: contacto@tuprestamobo.com</p>

    <h2>2. Datos que Tratamos</h2>
    <p>Identificación (nombre, CI, selfie/documentos), contacto (email, teléfono, dirección), financieros (intenciones de inversión, transacciones, cuenta bancaria para retiros), técnicos de uso (IP, dispositivo, páginas visitadas, eventos analíticos) y documentos subidos.</p>

    <h2>3. Finalidades</h2>
    <p>Operar la Plataforma, verificación KYC, prevención de fraude, evaluación de riesgo, procesamiento de inversiones y retiros, comunicaciones operativas, analítica y cumplimiento legal.</p>

    <h2>4. Bases Legales</h2>
    <p>Ejecución de contrato, cumplimiento de obligaciones legales (KYC/AML), interés legítimo (seguridad/analítica mínima) y consentimiento cuando corresponda.</p>

    <h2>5. Conservación</h2>
    <p>Mientras exista cuenta y por los plazos necesarios para obligaciones legales, auditorías o defensa de reclamos.</p>

    <h2>6. Destinatarios y Encargados</h2>
    <p>Proveedores tecnológicos (p. ej., Supabase, Vercel, Resend, Mixpanel, Google Gemini), PSP/bancos cuando aplique y autoridades competentes según ley.</p>

    <h2>7. Transferencias Internacionales</h2>
    <p>Podemos transferir datos a proveedores fuera de Bolivia, aplicando medidas contractuales y de seguridad apropiadas.</p>

    <h2>8. Seguridad</h2>
    <p>Medidas técnicas y organizativas razonables: cifrado en tránsito, controles de acceso y registros de actividad.</p>

    <h2>9. Derechos</h2>
    <p>Acceso, rectificación, actualización, eliminación, oposición, limitación, portabilidad y revocación del consentimiento. Solicitudes a contacto@tuprestamobo.com</p>

    <h2>10. Decisiones Automatizadas</h2>
    <p>Utilizamos modelos de riesgo y verificación asistida por IA. Puedes solicitar información general y expresar tu punto de vista o impugnar decisiones relevantes.</p>

    <h2>11. Cookies</h2>
    <p>Usamos cookies para funcionamiento y analítica. Puedes gestionarlas en tu navegador. Publicaremos avisos específicos cuando corresponda.</p>

    <h2>12. Menores</h2>
    <p>El servicio no está dirigido a menores de 18 años. Eliminaremos cuentas de menores cuando se detecten.</p>

    <h2>13. Cambios</h2>
    <p>Publicaremos cambios en esta Política con indicación de fecha de actualización.</p>

    <h2>14. Contacto</h2>
    <p>contacto@tuprestamobo.com</p>
  </div>
  );
};

export default PrivacyPolicy;
