import React from 'react';

const Comparativa = () => {
  return (
    <section id="comparativa" className="section section--white">
      <div className="container">
        <h2 className="section__title">Tu Préstamo vs. Banca Tradicional</h2>
        <div className="table-wrap" style={{overflowX:'auto'}}>
          <table className="table-compare" style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'10px', borderBottom:'1px solid #eee'}}>Característica</th>
                <th style={{textAlign:'left', padding:'10px', borderBottom:'1px solid #eee'}}>Tu Préstamo</th>
                <th style={{textAlign:'left', padding:'10px', borderBottom:'1px solid #eee'}}>Banca Tradicional</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{padding:'10px', borderBottom:'1px solid #f5f5f5'}}>Comisión por Pago Anticipado</td>
                <td style={{padding:'10px', borderBottom:'1px solid #f5f5f5'}}><strong>Bs 0</strong> (¡Gratis!)</td>
                <td style={{padding:'10px', borderBottom:'1px solid #f5f5f5'}}>Sí (usualmente 2%–5%)</td>
              </tr>
              <tr>
                <td style={{padding:'10px', borderBottom:'1px solid #f5f5f5'}}>Comisiones ocultas</td>
                <td style={{padding:'10px', borderBottom:'1px solid #f5f5f5'}}>No</td>
                <td style={{padding:'10px', borderBottom:'1px solid #f5f5f5'}}>Frecuentes</td>
              </tr>
              <tr>
                <td style={{padding:'10px', borderBottom:'1px solid #f5f5f5'}}>Proceso 100% Digital</td>
                <td style={{padding:'10px', borderBottom:'1px solid #f5f5f5'}}>Sí</td>
                <td style={{padding:'10px', borderBottom:'1px solid #f5f5f5'}}>No</td>
              </tr>
              <tr>
                <td style={{padding:'10px'}}>Transparencia en Intereses</td>
                <td style={{padding:'10px'}}>Total</td>
                <td style={{padding:'10px'}}>Complejo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default Comparativa;

