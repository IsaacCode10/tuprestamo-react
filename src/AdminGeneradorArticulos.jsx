import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import './AdminGeneradorArticulos.css';

// ── DATOS DE CONCEPTOS ────────────────────────────────────────────────────────
const CONCEPTOS = {
  'primera-tarjeta': {
    keyword: 'cómo sacar tarjeta de crédito Bolivia primera vez',
    titleHook: 'Fui al Mundial Brasil 2014 con una tarjeta de crédito que no entendía — y tardé 11 años en ver el costo real',
    h1Suffix: 'fui al Mundial Brasil 2014 con una tarjeta de crédito que no entendía — y tardé 11 años en ver el costo real',
    slug: 'primera-tarjeta-credito-bolivia',
    esOrigen: true,
    explicacion: [
      'Cuando el banco te ofrece una tarjeta de crédito, el pitch siempre es el mismo: flexibilidad, compras en cuotas, emergencias cubiertas. Lo que no te explican con la misma claridad son las condiciones reales: la tasa nominal anual, la capitalización mensual, el mantenimiento fijo que corre aunque no uses la tarjeta, y cómo funciona el pago mínimo.',
      'En Bolivia, una tarjeta estándar viene con una TNA de entre 24% y 28%, más un mantenimiento mensual de entre Bs 80 y Bs 180. Si te dan un límite de <strong>Bs {deuda}</strong> y lo usás completo, estás pagando <strong>Bs {interesMensual}</strong> solo en intereses el primer mes — antes de reducir ni un boliviano del capital.',
    ],
    insight: 'El límite de crédito no es dinero tuyo — es dinero del banco que te cobran por usar. Con una TNA del {tasa}% sobre Bs {deuda}, el costo de "usar el límite completo" es Bs {interesMensual} por mes, todos los meses, mientras la deuda siga ahí.',
    faqs: [
      { q: '¿Cuáles son los requisitos para sacar una tarjeta de crédito en Bolivia?', a: 'Generalmente necesitás CI, ingresos demostrables (boleta de pago o declaración de renta) y no tener deudas en mora en INFOCRED. Cada banco tiene criterios propios de monto y tasa según tu perfil.' },
      { q: '¿Cuánto dan de límite de crédito en una primera tarjeta en Bolivia?', a: 'Depende del banco y tus ingresos. Una primera tarjeta suele otorgar entre Bs 5.000 y Bs 20.000 de límite. Cuanto más alto el límite, mayor el riesgo si no se maneja con disciplina.' },
      { q: '¿Qué debo revisar antes de firmar el contrato de una tarjeta de crédito?', a: 'Tres números clave: la TNA, el mantenimiento mensual y la tasa de mora. Pedí que te los expliquen en bolivianos concretos, no solo en porcentajes.' },
    ],
    ctaLine: '¿Ya tenés tarjeta y querés saber cuánto te está costando realmente?',
  },
  'pago-minimo': {
    keyword: 'pago mínimo tarjeta de crédito Bolivia',
    titleHook: 'Por qué el pago mínimo de tu tarjeta nunca te deja salir de la deuda',
    h1Suffix: 'entendí qué es el pago mínimo de una tarjeta de crédito — y por qué es una trampa',
    slug: 'pago-minimo-tarjeta-credito-bolivia',
    explicacion: [
      'El pago mínimo es el monto más bajo que te permite el banco para "estar al día". En Bolivia equivale aproximadamente a los intereses del mes más el 1% del capital. Suena razonable hasta que hacés los números.',
      'Con una deuda de <strong>Bs {deuda}</strong> al <strong>{tasa}% TNA</strong>, tu interés mensual es de <strong>Bs {interesMensual}</strong>. Si pagás solo el mínimo, cubrís los intereses y casi nada del capital. La deuda sigue igual, generando nuevos intereses sobre el mismo monto.',
    ],
    insight: 'El pago mínimo está diseñado para que nunca termines de pagar. Con Bs {deuda} al {tasa}% TNA pagando solo el mínimo, necesitarías más de 20 años para saldarla — y pagarías más de 3 veces el monto original solo en intereses.',
    faqs: [
      { q: '¿Qué incluye el pago mínimo de una tarjeta de crédito en Bolivia?', a: 'Cubre los intereses del mes más aproximadamente el 1% del capital adeudado, más el mantenimiento mensual. Casi nada reduce tu deuda real.' },
      { q: '¿Cuánto tiempo llevaría pagar una tarjeta solo con el pago mínimo?', a: 'Con Bs {deuda} al {tasa}% TNA pagando solo el mínimo, podrían pasar más de 15-20 años. Terminarías pagando varias veces el monto original.' },
      { q: '¿Qué alternativa existe al pago mínimo en Bolivia?', a: 'Refinanciar la deuda con una tasa más baja y cuota fija. Así sabés exactamente cuándo termina.' },
    ],
    ctaLine: '¿Cuánto estás pagando realmente en tu tarjeta?',
  },
  'tna-tea': {
    keyword: 'diferencia TNA TEA tarjeta de crédito Bolivia',
    titleHook: 'La diferencia entre TNA y TEA en Bolivia — lo que el banco no te explica',
    h1Suffix: 'entendí la diferencia entre TNA y TEA — y por qué importa en tu tarjeta de crédito',
    slug: 'diferencia-tna-tea-tarjeta-credito-bolivia',
    explicacion: [
      'La <strong>TNA (Tasa Nominal Anual)</strong> es el número que los bancos anuncian. Si tu tarjeta dice "24% TNA", eso es lo que ves en el contrato. Pero no es lo que realmente pagás.',
      'La <strong>TEA (Tasa Efectiva Anual)</strong> incluye la capitalización mensual. Una TNA del {tasa}% se convierte en una TEA del {tea}%. No parece mucho, pero sobre Bs {deuda} de deuda esa diferencia son Bs {difAnual} adicionales al año.',
    ],
    insight: 'Con una TNA del {tasa}%, tu TEA real es {tea}%. Sobre Bs {deuda} de deuda, esa diferencia equivale a Bs {difAnual} adicionales por año — dinero que pagás de más sin saberlo.',
    faqs: [
      { q: '¿Qué es la TNA en Bolivia y por qué la usan los bancos?', a: 'TNA es la Tasa Nominal Anual. Los bancos la usan porque el número parece más bajo. No incluye el efecto de la capitalización mensual.' },
      { q: '¿Cómo se calcula la TEA de una tarjeta de crédito en Bolivia?', a: 'TEA = (1 + TNA/12)^12 - 1. Con una TNA del {tasa}%: TEA = {tea}%.' },
      { q: '¿La TEA incluye el mantenimiento mensual?', a: 'No. La TEA solo refleja la capitalización de intereses. El mantenimiento es un cargo adicional.' },
    ],
    ctaLine: '¿Querés saber cuál es la TEA real de tu tarjeta?',
  },
  'mantenimiento': {
    keyword: 'mantenimiento tarjeta de crédito Bolivia cuánto cuesta',
    titleHook: 'Cuánto te cuesta el mantenimiento de tu tarjeta de crédito en Bolivia — el cargo que nadie calcula',
    h1Suffix: 'calculé cuánto pagué en mantenimiento de tarjeta de crédito en Bolivia — el número me sorprendió',
    slug: 'mantenimiento-tarjeta-credito-bolivia',
    explicacion: [
      'Además de los intereses, tu tarjeta cobra un cargo fijo mensual: el mantenimiento. En Bolivia varía entre Bs 80 y Bs 180 por mes según el banco. Parece poco, pero se acumula de forma silenciosa.',
      'Con <strong>Bs {mantenimiento} de mantenimiento por mes</strong>, son <strong>Bs {mantenimientoAnual} al año</strong> — sin importar si usás o no la tarjeta.',
    ],
    insight: 'En {years} años de tarjeta, solo el mantenimiento de Bs {mantenimiento}/mes sumó Bs {totalMantenimiento}. Ese dinero salió de tu bolsillo sin reducir ni un boliviano de la deuda original.',
    faqs: [
      { q: '¿Cuánto es el mantenimiento de una tarjeta de crédito en Bolivia?', a: 'Varía entre Bs 80 y Bs 180 por mes según el banco.' },
      { q: '¿El mantenimiento se cobra aunque no use la tarjeta?', a: 'Sí. Es un cargo fijo mensual que corre independientemente del uso.' },
      { q: '¿Cómo puedo dejar de pagar el mantenimiento?', a: 'Solo cerrando la tarjeta. Si refinanciás con Tu Préstamo, pagás el saldo, cerrás la tarjeta y el mantenimiento desaparece.' },
    ],
    ctaLine: '¿Cuánto estás pagando en mantenimiento sin calcularlo?',
  },
  'interes-compuesto': {
    keyword: 'interés compuesto tarjeta de crédito Bolivia cómo funciona',
    titleHook: 'Cómo el interés compuesto convierte Bs 17.000 en más de Bs 68.000 — lo que nadie te explica',
    h1Suffix: 'vi cómo el interés compuesto hacía crecer mi deuda aunque yo seguía pagando',
    slug: 'interes-compuesto-tarjeta-credito-bolivia',
    explicacion: [
      'El interés compuesto funciona así: cada mes, los intereses se calculan sobre el total de la deuda — incluyendo los intereses del mes anterior que no pagaste. Pagás intereses sobre intereses.',
      'Con <strong>Bs {deuda} de deuda</strong> al <strong>{tasa}% TNA</strong>, el primer mes generás Bs {interesMensual} de intereses. Si no cubrís ese monto, el segundo mes los intereses se calculan sobre Bs {deudaSegundoMes}.',
    ],
    insight: 'Una deuda de Bs {deuda} al {tasa}% TNA, con pagos mínimos durante {years} años, puede costar Bs {totalPagado} en total. El interés compuesto multiplicó la deuda original por más de 4.',
    faqs: [
      { q: '¿Qué es el interés compuesto en una tarjeta de crédito?', a: 'Es cuando los intereses no pagados de un mes se suman al capital y generan nuevos intereses el siguiente mes.' },
      { q: '¿Cómo afecta el interés compuesto a mi tarjeta en Bolivia?', a: 'Si pagás solo el mínimo, los intereses no cubiertos se capitalizan y la deuda crece aunque estés pagando.' },
      { q: '¿Cómo salgo del ciclo del interés compuesto?', a: 'Refinanciando con un préstamo de cuota fija. Pagás un monto fijo cada mes y sabés exactamente cuándo termina.' },
    ],
    ctaLine: '¿Querés calcular cuánto te está costando el interés compuesto?',
  },
  'refinanciamiento': {
    keyword: 'refinanciar tarjeta de crédito Bolivia cómo funciona',
    titleHook: 'Cómo refinancié mi tarjeta de crédito en Bolivia después de 11 años — y por qué creé Tu Préstamo',
    h1Suffix: 'cerré mi deuda de tarjeta de crédito en Bolivia — y entendí cómo funciona el refinanciamiento',
    slug: 'refinanciar-tarjeta-credito-bolivia',
    explicacion: [
      'Refinanciar significa reemplazar tu deuda actual — con tasa alta y sin fecha de cierre — con un nuevo crédito a tasa más baja y cuota fija.',
      'Las tarjetas en Bolivia cobran entre 24% y 28% TNA. Tu Préstamo ofrece refinanciamiento desde el 15% TNA. Sobre Bs {deuda} de deuda esa diferencia puede representar Bs {ahorro} de ahorro en intereses totales.',
    ],
    insight: 'Refinanciar de {tasa}% TNA a 15% TNA sobre una deuda de Bs {deuda} puede significar ahorrar Bs {ahorro} en intereses totales. Y lo más importante: sabés exactamente cuándo termina.',
    faqs: [
      { q: '¿Qué es el refinanciamiento de tarjeta de crédito en Bolivia?', a: 'Es cambiar tu deuda de tarjeta (tasa alta) por un préstamo personal a tasa más baja y cuota fija.' },
      { q: '¿Quién puede refinanciar su tarjeta con Tu Préstamo?', a: 'Personas con deuda de tarjeta boliviana, ingresos demostrables y sin problemas graves en INFOCRED. Proceso 100% en línea.' },
      { q: '¿Cuánto tarda el refinanciamiento con Tu Préstamo?', a: 'La evaluación toma 48-72 horas hábiles. Si aprobamos, el pago al banco se hace en las siguientes 24 horas hábiles.' },
    ],
    ctaLine: '¿Querés saber si calificás para refinanciar tu tarjeta?',
  },
};

const CTA_DATA = {
  auditor:    { url: '/auditor-de-tarjetas', label: 'Usá el auditor de tarjetas gratis →', sub: 'Descubrí cuánto te cobra realmente tu tarjeta — sin registro, en 2 minutos.' },
  calculadora:{ url: '/calculadora',         label: 'Calculá cuánto ahorrarías →',         sub: 'Simulá tu refinanciamiento y mirá la diferencia en tu cuota mensual.' },
  formulario: { url: '/solicitud',           label: 'Solicitar evaluación gratuita →',      sub: 'El equipo de Tu Préstamo revisa tu caso y te responde en 48 horas hábiles.' },
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt = n => Math.round(n).toLocaleString('es-BO');

function calcNums(form) {
  const deuda = parseFloat(form.deuda) || 17000;
  const tasa  = parseFloat(form.tasa)  || 24;
  const mant  = parseFloat(form.mantenimiento) || 120;
  const total = parseFloat(form.totalPagado)   || 68000;
  const yr    = parseInt(form.year) || 2014;
  const years = 2025 - yr;
  const interesMensual  = deuda * tasa / 100 / 12;
  const tea             = (Math.pow(1 + tasa / 100 / 12, 12) - 1) * 100;
  const difAnual        = deuda * (tea - tasa) / 100;
  const mantAnual       = mant * 12;
  const totalMant       = mant * 12 * years;
  const deudaSegundoMes = deuda + interesMensual;
  const ahorro          = Math.max(0, total - deuda * (1 + 0.15 / 12 * 12 * years));
  return { deuda, tasa, mant, total, years, interesMensual, tea, difAnual,
           mantAnual, totalMant, deudaSegundoMes, ahorro };
}

function tpl(s, nums, pais, year) {
  return s
    .replace(/{deuda}/g,              fmt(nums.deuda))
    .replace(/{tasa}/g,               nums.tasa)
    .replace(/{interesMensual}/g,     fmt(nums.interesMensual))
    .replace(/{tea}/g,                nums.tea.toFixed(2))
    .replace(/{difAnual}/g,           fmt(nums.difAnual))
    .replace(/{mantenimiento}/g,      fmt(nums.mant))
    .replace(/{mantenimientoAnual}/g, fmt(nums.mantAnual))
    .replace(/{totalMantenimiento}/g, fmt(nums.totalMant))
    .replace(/{years}/g,              nums.years)
    .replace(/{totalPagado}/g,        fmt(nums.total))
    .replace(/{deudaSegundoMes}/g,    fmt(nums.deudaSegundoMes))
    .replace(/{ahorro}/g,             fmt(nums.ahorro))
    .replace(/{pais}/g,               pais)
    .replace(/{year}/g,               year);
}

// ── PERSISTENCIA ─────────────────────────────────────────────────────────────
const LS_FORM = 'gen_form_v1';

function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    try {
      // Limpiar datos obsoletos de versiones anteriores y reintentar
      ['gen_photo_v1', 'gen_generated_v1'].forEach(k => localStorage.removeItem(k));
      if (value != null) localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
}

// Cache a nivel de módulo — sobrevive remounts de React (cambios de ruta, refresh de auth)
// No depende de localStorage ni sessionStorage para la navegación dentro de la misma sesión
let _cachedForm      = null;
let _cachedPhotoUrl  = null;
let _cachedPhotoUrl2 = null;
let _cachedGenerated = null;

// buildResult: función pura que calcula el artículo desde el formulario (sin side effects)
function buildResult(form) {
  const c = CONCEPTOS[form.concepto];
  if (!c) return null;
  const nums = calcNums(form);
  const ft   = s => tpl(s, nums, form.pais, form.year);
  const kw   = form.keyword || c.keyword;
  const titleTag  = ft(c.titleHook);
  const h1        = `En ${form.pais}, ${ft(c.h1Suffix)}`;
  const metaDesc  = `Isaac Alfaro, fundador de Tu Préstamo Bolivia, cuenta cómo su experiencia en ${form.pais} en ${form.year} le enseñó sobre ${kw.split(' ').slice(0, 4).join(' ')}. Historia real con números reales de Bolivia.`;
  const slugBase  = form.pais.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const slug      = `finanzas-de-isaac/${form.year}-${slugBase}-${c.slug}`;
  const canonical = `https://tuprestamobo.com/${slug}`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', headline: titleTag, description: metaDesc,
        author: { '@type': 'Person', name: 'Isaac Alfaro', jobTitle: 'Fundador de Tu Préstamo Bolivia' },
        publisher: { '@type': 'Organization', name: 'Tu Préstamo Bolivia', url: 'https://tuprestamobo.com' },
        inLanguage: 'es-BO', url: canonical, keywords: kw },
      { '@type': 'FAQPage', mainEntity: c.faqs.map(f => ({
          '@type': 'Question', name: ft(f.q),
          acceptedAnswer: { '@type': 'Answer', text: ft(f.a) },
        })) },
    ],
  };
  return { titleTag, h1, metaDesc, slug, canonical, keyword: kw, schema, c, nums, ft };
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
const TABS = [
  { id: 'form',     label: '1 · Formulario' },
  { id: 'articulo', label: '2 · Artículo' },
  { id: 'seo',      label: '3 · SEO & Tags' },
  { id: 'schema',   label: '4 · Schema.org' },
];

const FORM_INITIAL = {
  pais: 'Brasil', year: '2014', concepto: 'primera-tarjeta',
  keyword: 'cómo sacar tarjeta de crédito Bolivia primera vez',
  historia: '', aprendizaje: '',
  deuda: '17000', tasa: '24', mantenimiento: '120', totalPagado: '68000',
  datoSorpresa: '', captionFoto: '', captionFoto2: '', cta: 'auditor',
};

export default function AdminGeneradorArticulos() {

  const [tab, setTab]               = useState('form');
  const [form, setForm]             = useState(() => _cachedForm || lsGet(LS_FORM, FORM_INITIAL));
  const [kwManual, setKwManual]     = useState(false);
  const [generated, setGenerated]   = useState(() => _cachedGenerated || null);
  const [photoUrl, setPhotoUrl]     = useState(() => _cachedPhotoUrl || null);
  const [photoUrl2, setPhotoUrl2]   = useState(() => _cachedPhotoUrl2 || null);
  const [saving, setSaving]   = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [copied, setCopied]   = useState('');

  // Sincronizar estado al cache de módulo (sobrevive remounts)
  useEffect(() => { _cachedForm = form; lsSet(LS_FORM, form); }, [form]);
  useEffect(() => { _cachedPhotoUrl  = photoUrl;  }, [photoUrl]);
  useEffect(() => { _cachedPhotoUrl2 = photoUrl2; }, [photoUrl2]);
  useEffect(() => { _cachedGenerated = generated; }, [generated]);

  // Al montar: si no hay cache en memoria, intentar reconstruir desde localStorage
  useEffect(() => {
    ['gen_photo_v1', 'gen_generated_v1'].forEach(k => localStorage.removeItem(k));
    if (!_cachedGenerated) {
      const saved = lsGet(LS_FORM, null);
      if (saved?.historia?.trim()) setGenerated(buildResult(saved));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'concepto' && !kwManual) {
        next.keyword = CONCEPTOS[value]?.keyword || '';
      }
      return next;
    });
    if (field === 'keyword') setKwManual(true);
  };

  const handlePhoto = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handlePhoto2 = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoUrl2(ev.target.result);
    reader.readAsDataURL(file);
  };

  const generate = () => {
    const result = buildResult(form);
    if (!result) return;
    setGenerated(result);
    setSavedId(null);
    setTab('articulo');
  };

  const saveArticle = async () => {
    if (!generated) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('articulos_borrador')
        .insert({
          titulo:          generated.titleTag,
          slug:            generated.slug,
          pais:            form.pais,
          year:            parseInt(form.year),
          concepto:        form.concepto,
          keyword:         generated.keyword,
          historia:        form.historia,
          aprendizaje:     form.aprendizaje,
          dato_sorpresa:   form.datoSorpresa,
          caption_foto:    form.captionFoto,
          limite_credito:  parseFloat(form.deuda) || null,
          tna:             parseFloat(form.tasa) || null,
          mantenimiento:   parseFloat(form.mantenimiento) || null,
          total_pagado:    parseFloat(form.totalPagado) || null,
          seo_title:       generated.titleTag,
          meta_descripcion:generated.metaDesc,
          schema_json:     generated.schema,
          cta_destino:     form.cta,
          estado:          'borrador',
        })
        .select('id')
        .single();
      if (error) throw error;
      setSavedId(data.id);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const clearAll = () => {
    _cachedForm = null;
    _cachedPhotoUrl = null;
    _cachedPhotoUrl2 = null;
    _cachedGenerated = null;
    localStorage.removeItem(LS_FORM);
    setForm(FORM_INITIAL);
    setPhotoUrl(null);
    setPhotoUrl2(null);
    setGenerated(null);
    setSavedId(null);
    setKwManual(false);
    setTab('form');
  };

  const copyText = async (text, label) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="gen-root">

      {/* Header */}
      <header className="gen-hdr">
        <div className="gen-hdr-left">
          <span className="gen-hdr-title">Generador de Artículos · "14 Años con la Tarjeta"</span>
          <span className="gen-hdr-sub">Herramienta interna — Tu Préstamo Bolivia</span>
        </div>
        <div className="gen-hdr-right">
          {savedId && (
            <span className="gen-saved-chip">✓ Guardado en Supabase</span>
          )}
          {generated && !savedId && (
            <button className="gen-btn-save" onClick={saveArticle} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar borrador'}
            </button>
          )}
          <button className="gen-btn-primary" onClick={generate}>
            Generar artículo →
          </button>
          <button className="gen-btn-nuevo" onClick={() => {
            if (window.confirm('¿Empezar un artículo nuevo? Se borrará el formulario actual.')) clearAll();
          }}>
            + Nuevo
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="gen-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`gen-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {generated && t.id !== 'form' && <span className="gen-tab-dot" />}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="gen-content">

        {/* ── TAB: FORMULARIO ── */}
        {tab === 'form' && (
          <div className="gen-form-wrap">

            <div className="gen-card">
              <div className="gen-card-hd"><span className="gen-num">1</span>Identificación del episodio</div>
              <div className="gen-card-bd">
                <div className="gen-row2">
                  <div className="gen-field">
                    <label>País del viaje</label>
                    <select value={form.pais} onChange={e => setField('pais', e.target.value)}>
                      {['Brasil','Argentina','Uruguay','Chile','Ecuador','Paraguay','Colombia','Perú'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="gen-field">
                    <label>Año del viaje</label>
                    <input type="number" min="2010" max="2025" value={form.year}
                      onChange={e => setField('year', e.target.value)} />
                  </div>
                </div>
                <div className="gen-field">
                  <label>Concepto financiero del episodio</label>
                  <select value={form.concepto} onChange={e => setField('concepto', e.target.value)}>
                    <option value="primera-tarjeta">★ Episodio 0 — Cómo conseguí mi primera tarjeta</option>
                    <option value="pago-minimo">El pago mínimo — la trampa</option>
                    <option value="tna-tea">TNA vs TEA — la tasa que no te dicen</option>
                    <option value="mantenimiento">El mantenimiento mensual — el cargo oculto</option>
                    <option value="interes-compuesto">El interés compuesto — cómo crece la deuda</option>
                    <option value="refinanciamiento">El refinanciamiento — la salida</option>
                  </select>
                </div>
                <div className="gen-field">
                  <label>Keyword SEO objetivo</label>
                  <input type="text" value={form.keyword}
                    onChange={e => setField('keyword', e.target.value)}
                    placeholder="Se auto-sugiere al elegir el concepto" />
                  <span className="gen-hint">Podés editarla. Se auto-sugiere al cambiar el concepto.</span>
                </div>
              </div>
            </div>

            <div className="gen-card">
              <div className="gen-card-hd"><span className="gen-num">2</span>La historia — en tu propia voz</div>
              <div className="gen-card-bd">
                <div className="gen-field">
                  <label>Pegá tu historia completa acá</label>
                  <textarea rows={14} value={form.historia}
                    onChange={e => setField('historia', e.target.value)}
                    placeholder={'Escribí o pegá tu historia tal como la contarías a un amigo. Con tus palabras, tu dialecto, tus detalles. No la resumas.\n\nEj: El año 2014 se celebró el Mundial de fútbol en Brasil, mi sueño desde pequeño como buen futbolero que soy...'} />
                  <span className="gen-hint">Tu voz es lo más valioso. No corrijas el estilo — los detalles humanos y el dialecto boliviano son lo que conecta con el lector.</span>
                </div>
                <div className="gen-field">
                  <label>Una o dos líneas hacia adelante — el gancho de la serie</label>
                  <textarea rows={4} value={form.aprendizaje}
                    onChange={e => setField('aprendizaje', e.target.value)}
                    placeholder='Conectá el final de la historia con lo que vino después. Ej: Lo que no sabía ese día era que ese papel que firmé en el banco me iba a acompañar los siguientes 11 años. Hoy, a mis 36, entiendo exactamente por qué.' />
                  <span className="gen-hint">Este párrafo cierra el episodio y engancha al lector con el siguiente artículo de la serie.</span>
                </div>
              </div>
            </div>

            <div className="gen-card">
              <div className="gen-card-hd"><span className="gen-num">3</span>Los números reales</div>
              <div className="gen-card-bd">
                <div className="gen-row2">
                  <div className="gen-field">
                    <label>Límite de crédito otorgado (Bs)</label>
                    <input type="number" value={form.deuda} onChange={e => setField('deuda', e.target.value)} />
                  </div>
                  <div className="gen-field">
                    <label>Tasa nominal anual (% TNA)</label>
                    <input type="number" value={form.tasa} onChange={e => setField('tasa', e.target.value)} />
                  </div>
                </div>
                <div className="gen-row2">
                  <div className="gen-field">
                    <label>Mantenimiento mensual (Bs)</label>
                    <input type="number" value={form.mantenimiento} onChange={e => setField('mantenimiento', e.target.value)} />
                  </div>
                  <div className="gen-field">
                    <label>Total pagado al final (Bs)</label>
                    <input type="number" value={form.totalPagado} onChange={e => setField('totalPagado', e.target.value)} />
                  </div>
                </div>
                <div className="gen-field">
                  <label>Un dato que sorprende (se destaca en el artículo)</label>
                  <input type="text" value={form.datoSorpresa}
                    onChange={e => setField('datoSorpresa', e.target.value)}
                    placeholder='Ej: Con Bs 17.000 de límite de tarjeta me fui al Mundial de Brasil 2014 — sin leer ninguna condición del contrato' />
                </div>
              </div>
            </div>

            <div className="gen-card">
              <div className="gen-card-hd"><span className="gen-num">4</span>Las fotos del viaje</div>
              <div className="gen-card-bd">
                <div className="gen-photos-row">

                  <div className="gen-photo-col">
                    <div className="gen-photo-col-label">Foto 1 — Apertura del artículo</div>
                    <div className="gen-upload-zone">
                      <input type="file" accept="image/*" onChange={handlePhoto} />
                      {photoUrl ? (
                        <>
                          <img src={photoUrl} className="gen-photo-preview" alt="preview foto 1" />
                          <button className="gen-photo-remove" onClick={e => { e.preventDefault(); setPhotoUrl(null); _cachedPhotoUrl = null; }}>✕ Quitar</button>
                        </>
                      ) : (
                        <>
                          <div className="gen-upload-icon">📷</div>
                          <div className="gen-upload-txt">Con amigos / aeropuerto</div>
                          <div className="gen-upload-sub">Hacé clic o arrastrá</div>
                        </>
                      )}
                    </div>
                    <div className="gen-field" style={{ marginTop: 10 }}>
                      <label>Pie de foto 1</label>
                      <input type="text" value={form.captionFoto}
                        onChange={e => setField('captionFoto', e.target.value)}
                        placeholder='Ej: Isaac con Diego y Pedro antes del viaje' />
                    </div>
                  </div>

                  <div className="gen-photo-col">
                    <div className="gen-photo-col-label">Foto 2 — En el estadio</div>
                    <div className="gen-upload-zone">
                      <input type="file" accept="image/*" onChange={handlePhoto2} />
                      {photoUrl2 ? (
                        <>
                          <img src={photoUrl2} className="gen-photo-preview" alt="preview foto 2" />
                          <button className="gen-photo-remove" onClick={e => { e.preventDefault(); setPhotoUrl2(null); _cachedPhotoUrl2 = null; }}>✕ Quitar</button>
                        </>
                      ) : (
                        <>
                          <div className="gen-upload-icon">🏟️</div>
                          <div className="gen-upload-txt">En el estadio / partido</div>
                          <div className="gen-upload-sub">Hacé clic o arrastrá</div>
                        </>
                      )}
                    </div>
                    <div className="gen-field" style={{ marginTop: 10 }}>
                      <label>Pie de foto 2</label>
                      <input type="text" value={form.captionFoto2}
                        onChange={e => setField('captionFoto2', e.target.value)}
                        placeholder='Ej: Estadio Mané Garrincha, Brasilia, junio 2014' />
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div className="gen-card">
              <div className="gen-card-hd"><span className="gen-num">5</span>CTA final del artículo</div>
              <div className="gen-card-bd">
                <div className="gen-field">
                  <label>¿A dónde llevás al lector?</label>
                  <div className="gen-radio-row">
                    {[
                      { val: 'auditor',     label: 'Auditor de tarjetas' },
                      { val: 'calculadora', label: 'Calculadora de ahorro' },
                      { val: 'formulario',  label: 'Solicitar evaluación' },
                    ].map(opt => (
                      <label key={opt.val} className={`gen-radio-opt ${form.cta === opt.val ? 'checked' : ''}`}>
                        <input type="radio" name="cta" value={opt.val}
                          checked={form.cta === opt.val}
                          onChange={() => setField('cta', opt.val)} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button className="gen-btn-big" onClick={generate}>
              Generar artículo completo →
            </button>
          </div>
        )}

        {/* ── TAB: ARTÍCULO ── */}
        {tab === 'articulo' && (
          <div className="gen-preview-wrap">
            {!generated ? (
              <div className="gen-empty">
                <div className="gen-empty-icon">📄</div>
                <div className="gen-empty-msg">Completá el formulario y generá el artículo</div>
              </div>
            ) : (
              <ArticlePreview generated={generated} form={form} photoUrl={photoUrl} photoUrl2={photoUrl2} />
            )}
            {generated && savedId && (
              <div className="gen-saved-note">
                ✓ Guardado en Supabase · ID: <code>{savedId}</code>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: SEO ── */}
        {tab === 'seo' && (
          <div className="gen-meta-wrap">
            {!generated ? (
              <div className="gen-empty"><div className="gen-empty-icon">🔍</div><div className="gen-empty-msg">Generá el artículo primero</div></div>
            ) : (
              <SeoPanel generated={generated} copyText={copyText} copied={copied} />
            )}
          </div>
        )}

        {/* ── TAB: SCHEMA ── */}
        {tab === 'schema' && (
          <div className="gen-meta-wrap">
            {!generated ? (
              <div className="gen-empty"><div className="gen-empty-icon">⚙️</div><div className="gen-empty-msg">Generá el artículo primero</div></div>
            ) : (
              <SchemaPanel generated={generated} copyText={copyText} copied={copied} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── ARTÍCULO PREVIEW ──────────────────────────────────────────────────────────
function ArticlePreview({ generated, form, photoUrl, photoUrl2 }) {
  const { c, nums, ft, h1, keyword } = generated;
  const esOrigen = c.esOrigen;
  const cta = CTA_DATA[form.cta];

  const rows = esOrigen ? [
    ['Límite de crédito otorgado',                        `Bs ${fmt(nums.deuda)}`],
    ['Tasa nominal anual (TNA)',                          `${nums.tasa}%`],
    ['Mantenimiento mensual',                             `Bs ${fmt(nums.mant)}`],
    ['Costo en intereses si usás el límite completo',    `Bs ${fmt(nums.interesMensual)}/mes`],
    ['Costo mensual total (interés + mantenimiento)',     `Bs ${fmt(nums.interesMensual + nums.mant)}`],
    [`Acumulado en ${nums.years} años (solo interés + mant.)`, `Bs ${fmt((nums.interesMensual + nums.mant) * 12 * nums.years)}`],
  ] : [
    ['Deuda original',                   `Bs ${fmt(nums.deuda)}`],
    ['Tasa de la tarjeta',               `${nums.tasa}% TNA`],
    ['Interés mensual',                  `Bs ${fmt(nums.interesMensual)}`],
    ['Mantenimiento mensual',            `Bs ${fmt(nums.mant)}`],
    ['Costo mensual total',              `Bs ${fmt(nums.interesMensual + nums.mant)}`],
    [`Total pagado en ${nums.years} años`, `Bs ${fmt(nums.total)}`],
  ];
  if (form.datoSorpresa) rows.push(['📌 El dato que sorprende', form.datoSorpresa]);

  const eyebrow   = esOrigen ? `Episodio 0 · El Origen · ${form.pais} · ${form.year}` : `14 Años con la Tarjeta · ${form.pais} · ${form.year}`;
  const tableLabel = esOrigen ? `El contrato que firmé · ${form.pais}, ${form.year}` : `Mi tarjeta · ${form.pais}, ${form.year}`;
  const h2Tabla   = esOrigen ? 'El contrato en números — lo que firmé' : 'En números — lo que pasaba con mi tarjeta';
  const h2Aprend  = esOrigen ? 'Lo que ojalá alguien me hubiera explicado antes de firmar' : `Lo que aprendí en ${form.pais}`;
  const h2Concepto = esOrigen
    ? '¿Qué condiciones tiene una tarjeta de crédito en Bolivia?'
    : `¿Qué es ${keyword.split(' ').slice(0, 5).join(' ')}?`;

  return (
    <article className="art">
      <span className="art-eyebrow">{eyebrow}</span>
      <h1 className="art-h1">{h1}</h1>
      <p className="art-meta">Por Isaac Alfaro · Fundador de Tu Préstamo Bolivia</p>

      {photoUrl
        ? <img src={photoUrl} className="art-photo" alt={form.captionFoto || ''} />
        : <div className="art-photo-ph">📷 Foto 1 — apertura del artículo</div>
      }
      {(form.captionFoto || photoUrl) && (
        <p className="art-caption">{form.captionFoto || ''}</p>
      )}

      {form.historia.split('\n').filter(Boolean).map((p, i) => (
        <p key={i} className="art-p">{p}</p>
      ))}

      {photoUrl2
        ? <img src={photoUrl2} className="art-photo" alt={form.captionFoto2 || ''} />
        : <div className="art-photo-ph">🏟️ Foto 2 — en el estadio</div>
      }
      {(form.captionFoto2 || photoUrl2) && (
        <p className="art-caption">{form.captionFoto2 || ''}</p>
      )}

      <h2 className="art-h2">{h2Concepto}</h2>
      {c.explicacion.map((p, i) => (
        <p key={i} className="art-p" dangerouslySetInnerHTML={{ __html: ft(p) }} />
      ))}

      <h2 className="art-h2">{h2Tabla}</h2>
      <div className="art-data-box">
        <div className="art-data-label">{tableLabel}</div>
        {rows.map(([k, v], i) => (
          <div key={i} className="art-data-row">
            <span className="art-data-key">{k}</span>
            <span className="art-data-val">{v}</span>
          </div>
        ))}
      </div>

      <h2 className="art-h2">{h2Aprend}</h2>
      {form.aprendizaje.split('\n').filter(Boolean).map((p, i) => (
        <p key={i} className="art-p">{p}</p>
      ))}
      <div className="art-insight">
        <strong>La conclusión: </strong>
        <span dangerouslySetInnerHTML={{ __html: ft(c.insight) }} />
      </div>

      <h2 className="art-h2">Preguntas frecuentes</h2>
      {c.faqs.map((f, i) => (
        <div key={i} className="art-faq">
          <div className="art-faq-q" dangerouslySetInnerHTML={{ __html: ft(f.q) }} />
          <div className="art-faq-a" dangerouslySetInnerHTML={{ __html: ft(f.a) }} />
        </div>
      ))}

      <div className="art-cta">
        <h3>{c.ctaLine}</h3>
        <p>{cta.sub}</p>
        <a href={`https://tuprestamobo.com${cta.url}`} className="art-cta-btn">{cta.label}</a>
      </div>
    </article>
  );
}

// ── SEO PANEL ────────────────────────────────────────────────────────────────
function SeoPanel({ generated, copyText, copied }) {
  const { titleTag, metaDesc, slug, canonical, keyword } = generated;
  const tl = titleTag.length;
  const dl = metaDesc.length;
  const tc = tl <= 60 ? 'ok' : tl <= 70 ? 'warn' : 'bad';
  const dc = dl <= 155 ? 'ok' : dl <= 165 ? 'warn' : 'bad';
  const helmetCode = `<Helmet>\n  <title>${titleTag}</title>\n  <meta name="description" content="${metaDesc}" />\n  <link rel="canonical" href="${canonical}" />\n</Helmet>`;

  return (
    <div className="gen-seo">
      <MetaBlock label="Title tag" badge={`${tl}/60`} badgeCls={tc}><div className="gen-code">{titleTag}</div></MetaBlock>
      <MetaBlock label="Meta description" badge={`${dl}/155`} badgeCls={dc}><div className="gen-code">{metaDesc}</div></MetaBlock>
      <MetaBlock label="URL sugerida"><div className="gen-code">https://tuprestamobo.com/{slug}</div></MetaBlock>
      <MetaBlock label="Keyword objetivo"><div className="gen-code">{keyword}</div></MetaBlock>
      <MetaBlock label="Bloque Helmet (React)" copyLabel="helmet" copyText={copyText} copied={copied} codeId="helmetCode">
        <div className="gen-code" id="helmetCode">{helmetCode}</div>
      </MetaBlock>
    </div>
  );
}

// ── SCHEMA PANEL ─────────────────────────────────────────────────────────────
function SchemaPanel({ generated, copyText, copied }) {
  const schemaStr = JSON.stringify(generated.schema, null, 2);
  const full = `<script type="application/ld+json">\n${schemaStr}\n<\/script>`;
  return (
    <div className="gen-seo">
      <MetaBlock label="Schema.org JSON-LD" copyLabel="schema" copyText={copyText} copied={copied} codeId="schemaCode">
        <div className="gen-code" id="schemaCode">{full}</div>
      </MetaBlock>
      <div className="gen-info-box">
        Este bloque va dentro del &lt;Helmet&gt; del componente React del artículo.
        Incluye <strong>Article</strong> (Google News, rich results) y <strong>FAQPage</strong> (acordeones en resultados de búsqueda).
      </div>
    </div>
  );
}

function MetaBlock({ label, badge, badgeCls, children, copyLabel, copyText, copied, codeId }) {
  return (
    <div className="gen-meta-block">
      <div className="gen-meta-label">
        <span>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {badge && <span className={`gen-char-count ${badgeCls}`}>{badge}</span>}
          {copyLabel && (
            <button className="gen-copy-btn" onClick={() => {
              const el = document.getElementById(codeId);
              if (el) copyText(el.innerText, copyLabel);
            }}>
              {copied === copyLabel ? '✓ Copiado' : 'Copiar'}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
