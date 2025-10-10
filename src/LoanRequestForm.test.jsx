import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoanRequestForm from './LoanRequestForm';
import { supabase } from './supabaseClient';

// 1. Simular (mock) el cliente de Supabase para no afectar la BD real
vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn(),
  },
}));

describe('LoanRequestForm', () => {
  // Limpiamos los mocks antes de cada prueba para que no interfieran entre sí
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar la primera pregunta del formulario al renderizarse', async () => {
    render(<LoanRequestForm onClose={vi.fn()} role="prestatario" />);
    const primeraPregunta = await screen.findByText('¡Hola! Para empezar, ¿cuál es tu nombre completo?');
    expect(primeraPregunta).toBeInTheDocument();
  });

  it('debe enviar el formulario completo y mostrar el mensaje de éxito', async () => {
    supabase.from('solicitudes').insert.mockResolvedValue({ error: null });
    render(<LoanRequestForm onClose={vi.fn()} role="prestatario" />);

    // Helper functions for filling the form
    const fillAndNext = async (labelText, value) => {
      fireEvent.change(await screen.findByLabelText(labelText), { target: { value } });
      fireEvent.click(screen.getByText('Siguiente'));
    };
    const selectAndNext = async (labelText, value) => {
      fireEvent.change(await screen.findByLabelText(labelText), { target: { value } });
      fireEvent.click(screen.getByText('Siguiente'));
    };
    const checkAndNext = async (labelText) => {
      fireEvent.click(await screen.findByLabelText(labelText));
      fireEvent.click(screen.getByText('Siguiente'));
    };

    // Simulate filling the entire form
    await fillAndNext(/nombre completo/i, 'Isaac de Prueba');
    await fillAndNext(/correo electrónico/i, 'isaac.prueba@test.com');
    await fillAndNext(/número de celular/i, '77788999');
    await selectAndNext(/departamento de Bolivia/i, 'Santa Cruz');
    await fillAndNext(/Cédula de Identidad/i, '1234567');
    await fillAndNext(/fecha de nacimiento/i, '1990-01-01');
    await selectAndNext(/situación laboral/i, 'Dependiente');
    fireEvent.click(screen.getByText('Siguiente'));
    await fillAndNext(/meses de antigüedad/i, '24');
    await fillAndNext(/ingreso mensual/i, '10000');
    fireEvent.click(screen.getByText('Siguiente'));
    await fillAndNext(/saldo total aproximado/i, '15000');
    await fillAndNext(/tasa de interés anual/i, '22');
    await fillAndNext(/monto te gustaría refinanciar/i, '15000');
    await selectAndNext(/plazo te gustaría pagarlo/i, '24');
    await checkAndNext(/autorización para consultar tu historial en Infocred/i);
    fireEvent.click(await screen.findByLabelText(/aceptas que te contactemos/i));

    // Submit the form
    fireEvent.click(screen.getByText('Finalizar'));

    // Assertions
    await waitFor(() => {
      expect(screen.getByText('¡Solicitud Enviada!')).toBeInTheDocument();
    });
    expect(supabase.from('solicitudes').insert).toHaveBeenCalledOnce();
  });

  it('debe mostrar un mensaje de error si el envío a Supabase falla', async () => {
    // 2. Configurar la simulación para que la inserción FALLE
    const errorMessage = 'Fallo de red simulado';
    supabase.from('solicitudes').insert.mockResolvedValue({ error: new Error(errorMessage) });

    render(<LoanRequestForm onClose={vi.fn()} role="prestatario" />);

    // 3. Simular el llenado del formulario (podemos acortarlo ya que no es el foco)
    await fireEvent.change(await screen.findByLabelText(/nombre completo/i), { target: { value: 'Isaac Falla' } });
    // ... y así sucesivamente para todos los campos requeridos ...
    // Para mantener la prueba rápida, asumiremos que el usuario llega al final
    // y probaremos el estado de error.
    // En una suite de tests real, podríamos crear un helper para llenar el form.
    
    // Llenado rápido de todos los campos requeridos para llegar al final
    const questions = [
      { label: /nombre completo/i, value: 'Isaac Falla' },
      { label: /correo electrónico/i, value: 'falla@test.com' },
      { label: /número de celular/i, value: '12345678' },
      { label: /departamento de Bolivia/i, value: 'Pando', type: 'select' },
      { label: /Cédula de Identidad/i, value: '7654321' },
      { label: /fecha de nacimiento/i, value: '1985-05-05' },
      { label: /situación laboral/i, value: 'Independiente', type: 'select' },
      { label: /skip/i, value: null }, // Skip optional
      { label: /meses de antigüedad/i, value: '12' },
      { label: /ingreso mensual/i, value: '5000' },
      { label: /skip/i, value: null }, // Skip optional
      { label: /saldo total aproximado/i, value: '10000' },
      { label: /tasa de interés anual/i, value: '30' },
      { label: /monto te gustaría refinanciar/i, value: '8000' },
      { label: /plazo te gustaría pagarlo/i, value: '12', type: 'select' },
      { label: /autorización para consultar tu historial en Infocred/i, type: 'check' },
      { label: /aceptas que te contactemos/i, type: 'check' },
    ];

    for (const q of questions) {
      if (q.value === null) {
        fireEvent.click(screen.getByText('Siguiente'));
        continue;
      }
      const element = await screen.findByLabelText(q.label);
      if (q.type === 'check') {
        fireEvent.click(element);
      } else {
        fireEvent.change(element, { target: { value: q.value } });
      }
      // No hacer clic en siguiente en el último paso
      if (questions.indexOf(q) < questions.length - 1) {
        fireEvent.click(screen.getByText('Siguiente'));
      }
    }

    // 4. Enviar el formulario
    fireEvent.click(screen.getByText('Finalizar'));

    // 5. Verificar los resultados
    await waitFor(() => {
      // El mensaje de error debe aparecer
      expect(screen.getByText('Hubo un problema al enviar tu solicitud. Por favor, inténtalo de nuevo más tarde.')).toBeInTheDocument();
    });

    // El mensaje de éxito NO debe aparecer
    expect(screen.queryByText('¡Solicitud Enviada!')).not.toBeInTheDocument();
    // La función de Supabase debe haber sido llamada
    expect(supabase.from('solicitudes').insert).toHaveBeenCalledOnce();
  });
});