import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import './AdminEditorArticulos.css';

const LS_KEY = 'editor_articulo_v1';

function lsGet() {
  try { const v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
function lsSet(value) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(value)); } catch {}
}

// Cache a nivel de modulo: sobrevive si React desmonta el componente al navegar
// a otra ruta y volver, sin esperar el viaje de ida y vuelta a Supabase.
let _cache = null;

const BLANK = {
  id: null, slug: null, titulo: '', historia: '',
  foto1Caption: '', foto2Caption: '', foto1Url: null, foto2Url: null,
  publicado: false,
};

// Un borrador cacheado que ya fue publicado (por SQL, en otra pestaña, etc.) no sirve
// para seguir editando acá — se descarta para no reabrir un artículo ya lanzado.
function borradorValido() {
  const cached = _cache || lsGet();
  if (cached?.publicado) {
    _cache = null;
    try { localStorage.removeItem(LS_KEY); } catch {}
    return null;
  }
  return cached;
}

export default function AdminEditorArticulos() {
  const initial = borradorValido() || BLANK;

  const [id, setId] = useState(initial.id);
  const [slug, setSlug] = useState(initial.slug);
  const [titulo, setTitulo] = useState(initial.titulo);
  const [historia, setHistoria] = useState(initial.historia);
  const [foto1Caption, setFoto1Caption] = useState(initial.foto1Caption);
  const [foto2Caption, setFoto2Caption] = useState(initial.foto2Caption);
  const [foto1Url, setFoto1Url] = useState(initial.foto1Url);
  const [foto2Url, setFoto2Url] = useState(initial.foto2Url);
  const [publicado, setPublicado] = useState(initial.publicado);
  const [loading, setLoading] = useState(initial === BLANK);
  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | pending | saving | saved | error
  const [saveError, setSaveError] = useState('');

  // Refs con el valor mas reciente, para no depender de closures viejas en callbacks async
  const idRef = useRef(id);
  const slugRef = useRef(slug);
  const latest = useRef({ titulo, historia, foto1Caption, foto2Caption });
  useEffect(() => { idRef.current = id; }, [id]);
  useEffect(() => { slugRef.current = slug; }, [slug]);
  useEffect(() => {
    latest.current = { titulo, historia, foto1Caption, foto2Caption };
  }, [titulo, historia, foto1Caption, foto2Caption]);

  // Si no habia nada en cache/localStorage (o lo que habia ya estaba publicado), intentar
  // recuperar el ultimo borrador sin publicar desde Supabase
  useEffect(() => {
    if (borradorValido()) return;
    supabase
      .from('articulos')
      .select('*')
      .eq('publicado', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setId(data.id);
          setSlug(data.slug);
          setTitulo(data.titulo || '');
          setHistoria(data.historia || '');
          setFoto1Caption(data.foto1_caption || '');
          setFoto2Caption(data.foto2_caption || '');
          setFoto1Url(data.foto1_url || null);
          setFoto2Url(data.foto2_url || null);
          setPublicado(data.publicado || false);
        }
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar en cache de modulo + localStorage en cada cambio (instantaneo, no depende de la red)
  useEffect(() => {
    const snapshot = { id, slug, titulo, historia, foto1Caption, foto2Caption, foto1Url, foto2Url, publicado };
    _cache = snapshot;
    lsSet(snapshot);
  }, [id, slug, titulo, historia, foto1Caption, foto2Caption, foto1Url, foto2Url, publicado]);

  // Crea la fila en Supabase la primera vez que hace falta (autosave de texto o subida de foto)
  const ensureRowId = async () => {
    if (idRef.current) return idRef.current;
    const tempSlug = `borrador-${Date.now()}`;
    const { data, error } = await supabase
      .from('articulos')
      .insert({ titulo: latest.current.titulo?.trim() || 'Sin título', slug: tempSlug })
      .select('id, slug')
      .single();
    if (error) throw error;
    idRef.current = data.id;
    slugRef.current = data.slug;
    setId(data.id);
    setSlug(data.slug);
    return data.id;
  };

  // Autosave de texto: espera una pausa de escritura y recien ahi guarda
  const debounceRef = useRef(null);
  useEffect(() => {
    if (loading || publicado) return;
    if (!titulo.trim() && !historia.trim()) return;
    setSaveStatus('pending');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const rowId = await ensureRowId();
        // .eq('publicado', false) evita pisar un artículo que ya se publicó (por SQL, en
        // otra pestaña, etc.) mientras esta pestaña seguía abierta con el borrador viejo.
        const { data, error } = await supabase
          .from('articulos')
          .update({
            titulo: titulo.trim() || 'Sin título',
            historia,
            foto1_caption: foto1Caption,
            foto2_caption: foto2Caption,
          })
          .eq('id', rowId)
          .eq('publicado', false)
          .select('id');
        if (error) throw error;
        if (!data?.length) {
          setPublicado(true);
          setSaveStatus('idle');
          return;
        }
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave falló:', err);
        setSaveStatus('error');
        setSaveError(err.message || String(err));
      }
    }, 800);
    return () => clearTimeout(debounceRef.current);
  }, [titulo, historia, foto1Caption, foto2Caption, loading, publicado]);

  // Las fotos se suben apenas se eligen — no dependen de que se guarde el resto del texto
  const handleFoto = async (file, which) => {
    if (!file || publicado) return;
    const setUrl = which === 1 ? setFoto1Url : setFoto2Url;
    const setUploading = which === 1 ? setUploading1 : setUploading2;
    const reader = new FileReader();
    reader.onload = ev => setUrl(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const rowId = await ensureRowId();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${slugRef.current}/foto${which}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('articulos-imagenes').upload(path, file);
      if (upErr) throw upErr;
      const { data: publicUrlData } = supabase.storage.from('articulos-imagenes').getPublicUrl(path);
      const field = which === 1 ? 'foto1_url' : 'foto2_url';
      const { data, error } = await supabase
        .from('articulos')
        .update({ [field]: publicUrlData.publicUrl })
        .eq('id', rowId)
        .eq('publicado', false)
        .select('id');
      if (error) throw error;
      if (!data?.length) {
        setPublicado(true);
        alert('Este artículo ya fue publicado — la foto no se guardó acá. Tocá "+ Nuevo" para empezar el próximo episodio.');
        return;
      }
      setUrl(publicUrlData.publicUrl);
    } catch (err) {
      alert('Error subiendo la foto: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const nuevoEpisodio = () => {
    _cache = null;
    try { localStorage.removeItem(LS_KEY); } catch {}
    setId(null);
    setSlug(null);
    setTitulo('');
    setHistoria('');
    setFoto1Caption('');
    setFoto2Caption('');
    setFoto1Url(null);
    setFoto2Url(null);
    setPublicado(false);
    setSaveStatus('idle');
  };

  if (loading) return <div className="edt-loading">Cargando...</div>;

  const statusLabel = {
    idle: '', pending: 'Escribiendo…', saving: 'Guardando…',
    saved: '✓ Guardado', error: '⚠ Error al guardar',
  }[saveStatus];

  return (
    <div className="edt-root">
      <header className="edt-hdr">
        <div>
          <span className="edt-hdr-title">Editor de artículos · Finanzas de Isaac</span>
          <span className="edt-hdr-sub">Historia + fotos — el resto lo armamos juntos antes de lanzar</span>
        </div>
        <div className="edt-hdr-right">
          {publicado && <span className="edt-chip edt-chip-live">✓ Publicado</span>}
          {!publicado && statusLabel && (
            <span
              className={`edt-chip ${saveStatus === 'error' ? 'edt-chip-error' : ''}`}
              title={saveStatus === 'error' ? saveError : undefined}
            >
              {statusLabel}
            </span>
          )}
          {publicado && (
            <button className="edt-btn-save" onClick={nuevoEpisodio}>+ Nuevo episodio</button>
          )}
        </div>
      </header>

      {publicado && (
        <div className="edt-note" style={{ margin: '20px auto 0', maxWidth: 660 }}>
          Este artículo ya está publicado — esta pantalla ya no lo edita (para no pisar lo que
          se armó a mano). Tocá "+ Nuevo episodio" para escribir el siguiente.
        </div>
      )}

      <div className="edt-body">
        <div className="edt-field">
          <label>Título del artículo</label>
          <input
            type="text"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            disabled={publicado}
            placeholder="Ej: Fui al Mundial Brasil 2014 con una tarjeta de crédito que no entendía..."
          />
        </div>

        <div className="edt-field">
          <label>Historia — pegá el texto tal como lo escribirías</label>
          <textarea
            rows={18}
            value={historia}
            onChange={e => setHistoria(e.target.value)}
            disabled={publicado}
            placeholder="Pegá tu historia completa acá, separando párrafos con una línea en blanco."
          />
          <span className="edt-hint">Se guarda solo mientras escribís. No hace falta que esté perfecta — la pulimos juntos antes de lanzar.</span>
        </div>

        <div className="edt-photos">
          <div className="edt-photo-col">
            <div className="edt-photo-label">Foto 1 {uploading1 && '· subiendo…'}</div>
            <div className="edt-upload">
              <input type="file" accept="image/*" onChange={e => handleFoto(e.target.files?.[0], 1)} disabled={publicado} />
              {foto1Url
                ? <img src={foto1Url} alt="preview foto 1" />
                : <div className="edt-upload-ph">📷 Subir foto</div>}
            </div>
            <input
              type="text"
              className="edt-caption-input"
              value={foto1Caption}
              onChange={e => setFoto1Caption(e.target.value)}
              disabled={publicado}
              placeholder="Pie de foto (opcional)"
            />
          </div>
          <div className="edt-photo-col">
            <div className="edt-photo-label">Foto 2 {uploading2 && '· subiendo…'}</div>
            <div className="edt-upload">
              <input type="file" accept="image/*" onChange={e => handleFoto(e.target.files?.[0], 2)} disabled={publicado} />
              {foto2Url
                ? <img src={foto2Url} alt="preview foto 2" />
                : <div className="edt-upload-ph">📷 Subir foto</div>}
            </div>
            <input
              type="text"
              className="edt-caption-input"
              value={foto2Caption}
              onChange={e => setFoto2Caption(e.target.value)}
              disabled={publicado}
              placeholder="Pie de foto (opcional)"
            />
          </div>
        </div>

        {slug && (
          <div className="edt-note">
            Cuando digas que este es el artículo que querés, lo terminamos de armar (frase destacada, números, FAQs, CTA) y lo lanzamos.
          </div>
        )}
      </div>
    </div>
  );
}
