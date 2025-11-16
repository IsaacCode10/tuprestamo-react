import React, { useEffect } from 'react';
import { trackEvent } from '@/analytics.js';

const faqs = [
  {
    title: 'Rendimientos y Comisiones',
    items: [
      {
        q: '¿Cuál es el rendimiento esperado para el inversionista?',
        a: 'Mostramos una tasa anual bruta por oportunidad. Tu rendimiento neto descuenta la comisión de servicio del 1% sobre cada pago recibido (capital + interés). Revisa siempre la tarjeta y el detalle de la oportunidad.'
      },
      {
        q: '¿Qué comisiones cobra Tu Préstamo?',
        a: 'Modelo simple y alineado al desempeño: 1% sobre cada pago recibido (capital + interés). No cobramos comisiones de salida ni custodia.'
      },
      {
        q: '¿Cómo se calculan y se acreditan los retornos?',
        a: 'Cada pago del prestatario se distribuye: capital + interés para el inversionista menos la comisión de servicio. Acreditamos el neto a tu cuenta bancaria verificada.'
      }
    ]
  },
  {
    title: 'Riesgo y Protección',
    items: [
      {
        q: '¿Qué riesgo asumo al invertir?',
        a: 'Toda inversión conlleva riesgo de incumplimiento. Mitigamos con filtros de riesgo, enfoque en refinanciamiento de deudas tóxicas y procesos KYC. Aun así, el capital no está garantizado.'
      },
      {
        q: '¿Cuentan con seguro de desgravamen o coberturas?',
        a: 'Trabajamos con pólizas de desgravamen para proteger ante eventos extremos. Consulta cada oportunidad para ver la cobertura aplicable.'
      },
      {
        q: '¿Cómo evalúan a los prestatarios?',
        a: 'Aplicamos un scorecard de riesgo, verificación documental y validaciones automáticas. Solo oportunidades aprobadas y en estado “disponible” son visibles para fondeo.'
      }
    ]
  },
  {
    title: 'Proceso de Inversión',
    items: [
      {
        q: '¿Cómo invierto en una oportunidad?',
        a: 'Desde “Oportunidades”, ingresa al detalle, define el monto y confirma. Si tu cuenta no está verificada, te pediremos completar la verificación antes de registrar la inversión.'
      },
      {
        q: '¿Hay un monto mínimo?',
        a: 'El mínimo típico es 700 Bs. Verifica el saldo restante de la oportunidad y las reglas vigentes al momento de invertir.'
      },
      {
        q: '¿Qué ocurre cuando una oportunidad se financia al 100%?',
        a: 'Se marca como “financiada” y continúa el flujo operativo: desembolso al prestatario y habilitación del ciclo de pagos mensuales.'
      }
    ]
  },
  {
    title: 'Retiros y Liquidez',
    items: [
      {
        q: '¿Cómo recibo mis pagos? ¿Hay retiros?',
        a: 'Tu Préstamo no custodia fondos de inversionistas. Cuando el prestatario paga, transferimos automáticamente tu parte (capital + interés menos comisión) a tu cuenta bancaria verificada. No existe un botón de “Retiros” ni un saldo para retirar.'
      },
      {
        q: '¿Puedo salir antes del plazo?',
        a: 'No hay mercado secundario en Tu Préstamo. Tus retornos provienen de pagos periódicos del prestatario y al finalizar el plazo.'
      }
    ]
  },
  {
    title: 'Verificación (KYC) y Seguridad',
    items: [
      {
        q: '¿Por qué debo verificar mi identidad?',
        a: 'Cumplimiento regulatorio (KYC) y prevención de fraude. Además, la verificación habilita pagos a tu cuenta bancaria y aumenta límites operativos.'
      },
      {
        q: '¿Qué datos se solicitan?',
        a: 'CI, selfie/documentos básicos y cuenta bancaria para pagos. Usamos almacenamiento seguro y verificación automatizada asistida por IA.'
      }
    ]
  },
  {
    title: 'Impuestos',
    items: [
      {
        q: '¿Cómo se manejan los impuestos sobre mis rendimientos?',
        a: 'Cada inversionista es responsable de sus obligaciones fiscales. Proveeremos reportes básicos de movimientos para tu contabilidad. Consulta a tu asesor tributario.'
      }
    ]
  },
  {
    title: 'Soporte',
    items: [
      {
        q: '¿Dónde puedo resolver dudas o reportar un problema?',
        a: 'Escríbenos a contacto@tuprestamobo.com. Te responderemos con prioridad.'
      }
    ]
  }
];

const InvestorFAQ = () => {
  useEffect(() => { trackEvent('Viewed Investor FAQ'); }, []);
  return (
    <div className="container" style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ marginBottom: 8 }}>Centro de Ayuda para Inversionistas</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>
        Encuentra respuestas a las preguntas más comunes sobre invertir con Tu Préstamo.
      </p>
      {faqs.map((group) => (
        <section key={group.title} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>{group.title}</h2>
          <div>
            {group.items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>{item.q}</div>
                <div style={{ color: '#333' }}>{item.a}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default InvestorFAQ;

