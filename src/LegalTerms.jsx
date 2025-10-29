import React from 'react';
import InvestorBackBar from '@/components/InvestorBackBar.jsx';
import { useProfile } from '@/hooks/useProfile.js';

const LegalTerms = () => {
  const { profile } = useProfile();
  const showInvestorBack = profile && (profile.role === 'inversionista' || profile.role === 'admin');
  return (
  <div className="container" style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
    {showInvestorBack && (
      <InvestorBackBar fallbackTo="/investor-dashboard" label="Volver al Panel" />
    )}
    <h1 style={{ marginBottom: 8 }}>Términos y Condiciones de Uso</h1>
    <p style={{ color: '#555', marginBottom: 24 }}>Última actualización: [dd/mm/aaaa]</p>

    <h2>1. Aceptación</h2>
    <p>Al acceder y utilizar https://www.tuprestamobo.com (el “Portal”) aceptas estos Términos y la Política de Privacidad.</p>

    <h2>2. Objeto</h2>
    <p>La Plataforma conecta inversionistas con oportunidades de financiamiento a prestatarios preaprobados. Tu Préstamo Bolivia facilita el proceso; no es banco ni garantiza rendimientos.</p>

    <h2>3. Definiciones</h2>
    <p>Usuario: quien accede al Portal. Inversionista: quien invierte o registra intenciones. Prestatario: quien solicita financiamiento. Cuenta: registro asociado a credenciales y datos KYC.</p>

    <h2>4. Modificaciones</h2>
    <p>Podemos actualizar estos Términos en cualquier momento; rigen desde su publicación en el Portal.</p>

    <h2>5. Registro y Cuenta</h2>
    <p>Debes ser mayor de 18 años, brindar datos veraces y mantenerlos actualizados. Podemos requerir verificación de identidad (KYC) y cuenta bancaria para retiros. Eres responsable de tus credenciales.</p>

    <h2>6. Verificación, Cumplimiento y Prevención de Fraude</h2>
    <p>Podemos solicitar documentos de identidad y realizar controles AML/CFT. Podemos rechazar o bloquear cuentas ante sospechas razonables o requerimientos legales.</p>

    <h2>7. Uso Permitido</h2>
    <p>Debes usar el Portal conforme a la ley y estos Términos. Prohibido vulnerar seguridad, suplantar identidad, hacer scraping abusivo o manipular procesos de fondeo.</p>

    <h2>8. Propiedad Intelectual</h2>
    <p>El Portal, software, diseños y marcas pertenecen a Tu Préstamo o licenciantes. No se otorgan licencias distintas al uso del servicio.</p>

    <h2>9. Servicios de Terceros</h2>
    <p>Podemos integrar servicios de terceros (hosting, mensajería, analítica). Su uso implica tratamiento de datos según la Política de Privacidad.</p>

    <h2>10. Inversión y Riesgos</h2>
    <p>Invertir conlleva riesgos, incluido incumplimiento del prestatario y pérdida parcial o total del capital. El capital no está garantizado. Las tasas mostradas son referenciales.</p>

    <h2>11. Comisiones y Costos</h2>
    <p>Comisión al inversionista: 1% sobre cada pago recibido (capital + interés). Las condiciones vigentes se informan en cada oportunidad.</p>

    <h2>12. Operaciones y Retiros</h2>
    <p>Las intenciones de inversión se registran en la Plataforma; el fondeo efectivo puede requerir conciliaciones o PSP. Retiros a cuentas verificadas con validaciones y tiempos de procesamiento.</p>

    <h2>13. Impuestos</h2>
    <p>Cada usuario es responsable de sus obligaciones tributarias. Podremos proveer reportes básicos de movimientos.</p>

    <h2>14. Disponibilidad y Cambios</h2>
    <p>Podemos modificar o suspender funcionalidades sin responsabilidad por interrupciones razonables.</p>

    <h2>15. Limitación de Responsabilidad</h2>
    <p>El servicio se ofrece “tal cual”. En la medida permitida por ley, no respondemos por daños indirectos, lucro cesante o perjuicios derivados del uso del Portal.</p>

    <h2>16. Indemnidad</h2>
    <p>Te comprometes a mantener indemne a Tu Préstamo ante reclamos de terceros derivados de tu uso en infracción a estos Términos.</p>

    <h2>17. Terminación</h2>
    <p>Podemos suspender o cerrar cuentas ante incumplimientos, fraude o requerimientos legales.</p>

    <h2>18. Ley Aplicable y Jurisdicción</h2>
    <p>Se rigen por las leyes de Bolivia. Jurisdicción: [Ciudad], Bolivia.</p>

    <h2>19. Contacto</h2>
    <p>contacto@tuprestamobo.com</p>
  </div>
  );
};

export default LegalTerms;
