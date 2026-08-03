import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/supabaseClient';
import { trackEvent } from '@/analytics.js';
import './BlogArticlePage.css';

// Convierte el texto de "historia" en los bloques del artículo, respetando el orden en que
// fueron escritos. Marcadores reconocidos dentro del texto:
//   ## Subtítulo          -> encabezado H2
//   "Frase entre comillas" (párrafo que empieza y termina con ") -> cita destacada
//   [FOTO2]               -> foto 2 + su pie, en ese punto exacto
//   [TABLA]               -> la tabla de datos (tabla_titulo / tabla_filas)
//   [REVEAL]              -> el bloque de monto acumulado (reveal_label/numero/sub)
//   cualquier otra línea  -> párrafo normal
function renderHistoria(historia, row, tablaFilas) {
  const lineas = (historia || '').split('\n').map(s => s.trim()).filter(Boolean);
  return lineas.map((linea, i) => {
    if (linea.startsWith('## ')) {
      return <h2 key={i}>{linea.slice(3)}</h2>;
    }
    if (linea === '[FOTO2]') {
      if (!row.foto2_url && !row.foto2_caption) return null;
      return (
        <React.Fragment key={i}>
          {row.foto2_url && <div className="photo-slot"><img src={row.foto2_url} alt={row.foto2_caption || ''} /></div>}
          {row.foto2_caption && <p className="caption">{row.foto2_caption}</p>}
        </React.Fragment>
      );
    }
    if (linea === '[TABLA]') {
      if (!tablaFilas.length) return null;
      return (
        <div className="data-wrap" key={i}>
          {row.tabla_titulo && <div className="data-head">{row.tabla_titulo}</div>}
          {tablaFilas.map((f, j) => (
            <div key={j} className="data-row">
              <span className="dk">{f.label}</span>
              <span className="dv">{f.valor}</span>
            </div>
          ))}
        </div>
      );
    }
    if (linea === '[REVEAL]') {
      if (!row.reveal_numero) return null;
      return (
        <div className="reveal" key={i}>
          {row.reveal_label && <div className="reveal-label">{row.reveal_label}</div>}
          <div className="reveal-number">{row.reveal_numero}</div>
          {row.reveal_sub && <div className="reveal-sub" dangerouslySetInnerHTML={{ __html: row.reveal_sub }} />}
        </div>
      );
    }
    if (linea.length > 1 && linea.startsWith('"') && linea.endsWith('"')) {
      return <div className="pq" key={i}>{linea.slice(1, -1)}</div>;
    }
    return <p key={i}>{linea}</p>;
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LS_SUSCRITO = 'finanzas_isaac_suscrito';

function SuscripcionCapitulos({ origenSlug }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(() => {
    try { return localStorage.getItem(LS_SUSCRITO) ? 'success' : 'idle'; }
    catch { return 'idle'; }
  });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setStatus('error');
      return;
    }
    setStatus('submitting');
    const { error } = await supabase
      .from('blog_suscriptores')
      .insert({ email: email.trim().toLowerCase(), origen_slug: origenSlug });
    // Codigo 23505 = email duplicado (unique constraint) -> tratarlo como exito, ya esta suscripto
    if (error && error.code !== '23505') {
      setStatus('error');
      return;
    }
    try { localStorage.setItem(LS_SUSCRITO, '1'); } catch {}
    trackEvent('Blog Subscribed', { slug: origenSlug });
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div className="suscripcion suscripcion--ok">
        <div className="suscripcion-eyebrow">📬 Seguí la serie</div>
        <p>¡Listo! Te aviso por correo apenas salga el próximo capítulo.</p>
      </div>
    );
  }

  return (
    <div className="suscripcion">
      <div className="suscripcion-eyebrow">📬 Seguí la serie</div>
      <h3>¿Querés enterarte primero cuando salga el próximo capítulo?</h3>
      <p>Te aviso por correo antes de publicarlo en redes — sin spam, solo los capítulos nuevos.</p>
      <form className="suscripcion-form" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
          placeholder="tu@email.com"
          aria-label="Tu email"
        />
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Enviando…' : 'Avisame'}
        </button>
      </form>
      {status === 'error' && <span className="suscripcion-error">Revisá el email e intentá de nuevo.</span>}
    </div>
  );
}

export default function BlogArticlePage() {
  const { articleSlug } = useParams();
  const [state, setState] = useState({ loading: true, row: null, notFound: false });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, row: null, notFound: false });
    supabase
      .from('articulos')
      .select('*')
      .eq('slug', articleSlug)
      .eq('publicado', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setState({ loading: false, row: null, notFound: true });
        } else {
          setState({ loading: false, row: data, notFound: false });
          trackEvent('Viewed Blog Article', { slug: data.slug, titulo: data.titulo });
        }
      });
    return () => { cancelled = true; };
  }, [articleSlug]);

  if (state.loading) {
    return <div style={{ padding: '80px 20px', textAlign: 'center', color: '#8496AC' }}>Cargando artículo...</div>;
  }

  if (state.notFound) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, marginBottom: 10 }}>Artículo no encontrado</h1>
        <p style={{ color: '#8496AC', marginBottom: 20 }}>Puede que ya no esté disponible o el enlace sea incorrecto.</p>
        <Link to="/">Volver al inicio</Link>
      </div>
    );
  }

  const row = state.row;
  const canonical = `https://tuprestamobo.com/finanzas-de-isaac/${row.slug}`;
  const tablaFilas = Array.isArray(row.tabla_filas) ? row.tabla_filas : [];
  const faqs = Array.isArray(row.faqs) ? row.faqs : [];
  const cuerpo = renderHistoria(row.historia, row, tablaFilas);

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: row.seo_title || row.titulo,
        description: row.seo_description || '',
        author: { '@type': 'Person', name: 'Isaac Alfaro', jobTitle: 'Fundador de Tu Préstamo Bolivia' },
        publisher: { '@type': 'Organization', name: 'Tu Préstamo Bolivia', url: 'https://tuprestamobo.com' },
        inLanguage: 'es-BO',
        url: canonical,
      },
      ...(faqs.length ? [{
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question', name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }] : []),
    ],
  };

  return (
    <>
      <Helmet>
        <title>{row.seo_title || row.titulo}</title>
        {row.seo_description && <meta name="description" content={row.seo_description} />}
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <article className="art">
        {row.serie_label && <div className="art-series">{row.serie_label}</div>}

        <h1>{row.titulo}</h1>

        <div className="byline">
          <div className="byline-avatar">IA</div>
          <div className="byline-meta">
            <strong>Isaac Alfaro</strong> — Fundador de Tu Préstamo Bolivia
            <div>{row.fecha_texto}{row.fecha_texto && row.tiempo_lectura ? ' · ' : ''}{row.tiempo_lectura}</div>
          </div>
        </div>

        {(row.foto1_url || row.foto1_caption) && (
          <>
            {row.foto1_url
              ? <div className="photo-slot"><img src={row.foto1_url} alt={row.foto1_caption || ''} /></div>
              : null}
            {row.foto1_caption && <p className="caption">{row.foto1_caption}</p>}
          </>
        )}

        {cuerpo}

        {faqs.length > 0 && (
          <>
            <h2>Preguntas frecuentes</h2>
            {faqs.map((f, i) => (
              <details key={i} className="faq">
                <summary className="fq">{f.q}</summary>
                <div className="fa" dangerouslySetInnerHTML={{ __html: f.a }} />
              </details>
            ))}
          </>
        )}

        <SuscripcionCapitulos origenSlug={row.slug} />

        {row.cta_titulo && (
          <div className="cta">
            {row.cta_eyebrow && <div className="cta-eyebrow">{row.cta_eyebrow}</div>}
            <h3>{row.cta_titulo}</h3>
            {row.cta_texto && <p>{row.cta_texto}</p>}
            {row.cta_boton_url && row.cta_boton_label && (
              <a className="cta-btn" href={row.cta_boton_url}>{row.cta_boton_label}</a>
            )}
          </div>
        )}

        {row.nav_siguiente_titulo && (
          <div className="snav">
            <div className="sn">
              <div className="sn-lbl">← Anterior</div>
              <div className="sn-dis">Este es el primer episodio</div>
            </div>
            <div className="sn r">
              <div className="sn-lbl">Próximo →</div>
              <div className="sn-title">{row.nav_siguiente_titulo}</div>
            </div>
          </div>
        )}
      </article>
    </>
  );
}
