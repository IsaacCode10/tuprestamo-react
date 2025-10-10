
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BorrowerActivateAccount from './BorrowerActivateAccount';
import { supabase } from './supabaseClient';

// Mock del cliente de Supabase
vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

// Mock de react-router-dom para espiar la navegación
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('BorrowerActivateAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe registrar un nuevo usuario y redirigir al dashboard (Caso Feliz)', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    supabase.auth.signUp.mockResolvedValue({ data: { user: mockUser }, error: null });
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    render(
      <MemoryRouter initialEntries={['/']}>
        <BorrowerActivateAccount />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Nuevo Prestatario' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /registrarse y activar/i }));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(screen.getByText('¡Registro exitoso! Ahora puedes iniciar sesión.')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/borrower-dashboard');
    });
  });

  it('debe mostrar un mensaje de error si el registro falla (Caso Triste)', async () => {
    // 1. Configurar Mock para que falle
    const errorMessage = 'El usuario ya existe';
    supabase.auth.signUp.mockResolvedValue({ data: null, error: { message: errorMessage } });

    render(
      <MemoryRouter initialEntries={['/']}>
        <BorrowerActivateAccount />
      </MemoryRouter>
    );

    // 2. Llenar y enviar formulario
    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Usuario Repetido' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'repetido@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /registrarse y activar/i }));

    // 3. Verificar aserciones
    await waitFor(() => {
      // El mensaje de error debe aparecer
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });

    // La navegación NO debe ser llamada
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('debe cambiar entre modo registro y modo login', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BorrowerActivateAccount />
      </MemoryRouter>
    );

    // Estado inicial: Modo Registro
    expect(screen.getByRole('heading', { name: /activar cuenta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();

    // Cambiar a Modo Login
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    // Verificar estado de Login
    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre completo/i)).not.toBeInTheDocument();

    // Cambiar de vuelta a Modo Registro
    fireEvent.click(screen.getByRole('button', { name: /activar cuenta/i }));

    // Verificar estado de Registro nuevamente
    expect(screen.getByRole('heading', { name: /activar cuenta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
  });
});
