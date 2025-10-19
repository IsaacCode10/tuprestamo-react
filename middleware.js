
import { NextResponse } from 'next/server';

// Este middleware se ejecuta en Vercel antes de que la solicitud llegue a nuestra aplicación React.
export function middleware(request) {
  // Vercel nos da la información de geolocalización del visitante.
  const country = request.geo?.country || 'US';
  
  // Las rutas que queremos proteger para que solo sean accesibles desde Bolivia.
  const protectedPaths = ['/', '/auth', '/calculadora'];
  
  // Verificamos si la ruta a la que accede el usuario es una de las que protegemos.
  // Usamos 'endsWith' para cubrir la ruta raíz '/' y las otras exactas.
  const isProtected = protectedPaths.includes(request.nextUrl.pathname);

  // Si la ruta está protegida y el país del visitante NO es Bolivia ('BO')...
  if (isProtected && country !== 'BO') {
    const url = request.nextUrl.clone();
    url.pathname = '/no-disponible';
    // ...reescribimos la solicitud para mostrar nuestra página de "No Disponible".
    // El usuario seguirá viendo la URL original, pero el contenido será el de /no-disponible.
    return NextResponse.rewrite(url);
  }

  // Si el país es Bolivia o la ruta no está protegida, dejamos que la solicitud continúe con normalidad.
  return NextResponse.next();
}

// Configuración para que el middleware solo se ejecute en las rutas que nos interesan.
export const config = {
  matcher: ['/', '/auth', '/calculadora'],
};
