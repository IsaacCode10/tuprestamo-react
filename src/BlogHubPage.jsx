import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/supabaseClient';
import { trackEvent } from '@/analytics.js';
import './BlogHubPage.css';

// Primer párrafo "real" de la historia, saltando marcadores (## , [FOTO2], [TABLA], [REVEAL])
// y citas destacadas, para usarlo como resumen corto de la tarjeta.
function extraerResumen(historia) {
  const lineas = (historia || '').split('\n').map(s => s.trim()).filter(Boolean);
  const parrafo = lineas.find(l => !l.startsWith('##') && !l.startsWith('[') && !(l.startsWith('"') && l.endsWith('"')));
  if (!parrafo) return '';
  return parrafo.length > 160 ? parrafo.slice(0, 160).trim() + '…' : parrafo;
}

export default function BlogHubPage() {
  const [articulos, setArticulos] = useState(null);

  useEffect(() => {
    trackEvent('Viewed Blog Hub');
    supabase
      .from('articulos')
      .select('slug, titulo, serie_label, foto1_url, foto1_caption, historia, created_at')
      .eq('publicado', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setArticulos(data || []));
  }, []);

  return (
    <>
      <Helmet>
        <title>Finanzas de Isaac | Tu Préstamo Bolivia</title>
        <meta name="description" content="Historias reales de Isaac Alfaro, fundador de Tu Préstamo Bolivia, sobre tarjetas de crédito, deuda y sus viajes por Latinoamérica." />
        <link rel="canonical" href="https://tuprestamobo.com/finanzas-de-isaac" />
      </Helmet>

      <div className="hub">
        <span className="hub-eyebrow">Finanzas de Isaac</span>
        <h1 className="hub-h1">Historias reales de tarjetas de crédito, deuda y viajes</h1>
        <p className="hub-sub">Isaac Alfaro, fundador de Tu Préstamo Bolivia, cuenta lo que aprendió (a las malas) sobre el costo real de una tarjeta de crédito en Bolivia.</p>

        {articulos === null && <div className="hub-empty">Cargando…</div>}
        {articulos?.length === 0 && <div className="hub-empty">Todavía no hay episodios publicados.</div>}

        <div className="hub-list">
          {articulos?.map(a => (
            <Link key={a.slug} to={`/finanzas-de-isaac/${a.slug}`} className="hub-card">
              {a.foto1_url && <img src={a.foto1_url} alt={a.foto1_caption || ''} className="hub-card-img" />}
              <div className="hub-card-body">
                {a.serie_label && <span className="hub-card-eyebrow">{a.serie_label}</span>}
                <h2 className="hub-card-title">{a.titulo}</h2>
                <p className="hub-card-excerpt">{extraerResumen(a.historia)}</p>
                <span className="hub-card-cta">Leer episodio →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
