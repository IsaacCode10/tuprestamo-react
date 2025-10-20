import React, { useState, useEffect } from 'react';
import './InteractiveForm.css';

const InteractiveForm = ({ questions, onSubmit, schema }) => { // <-- Recibimos el schema
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentValue, setCurrentValue] = useState('');
  const [error, setError] = useState('');

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const answerForCurrentQuestion = answers[currentQuestion.clave];
    if (currentQuestion.tipo === 'checkbox') {
      setCurrentValue(answerForCurrentQuestion || false);
    } else {
      setCurrentValue(answerForCurrentQuestion || '');
    }
  }, [currentQuestionIndex, questions, answers, currentQuestion.clave, currentQuestion.tipo]);

  const handleInputChange = (e) => {
    setError('');
    const { type, value, checked } = e.target;
    setCurrentValue(type === 'checkbox' ? checked : value);
  };

  const handleNext = () => {
    setError('');

    // --- NUEVA LÓGICA DE VALIDACIÓN CON ZOD ---
    if (schema) {
      // 1. Creamos un validador solo para el campo actual
      const fieldSchema = schema.pick({ [currentQuestion.clave]: true });
      
      // 2. Validamos el valor actual contra ese sub-esquema
      const result = fieldSchema.safeParse({ [currentQuestion.clave]: currentValue });

      // 3. Si la validación falla, mostramos el error y detenemos el avance
      if (!result.success) {
        // Extraemos el primer mensaje de error para el campo
        const errorMessage = result.error.errors[0].message;
        setError(errorMessage);
        return;
      }
    }
    // --- FIN DE LA NUEVA LÓGICA ---

    const newAnswers = { ...answers, [currentQuestion.clave]: currentValue };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Antes de hacer el submit final, validamos el objeto completo de respuestas
      if (schema) {
        const finalResult = schema.safeParse(newAnswers);
        if (!finalResult.success) {
          // Si algo falla en la validación final (aunque no debería si validamos paso a paso),
          // lo mostramos en consola y evitamos el envío.
          console.error("Error de validación final:", finalResult.error.flatten().fieldErrors);
          setError("Hubo un error inesperado al validar el formulario. Por favor, recarga la página.");
          return;
        }
        // Enviamos los datos ya validados y parseados por Zod
        onSubmit(finalResult.data);
        return;
      }
      // Fallback si no hay schema
      onSubmit(newAnswers);
    }
  };

  const handlePrev = () => {
    setError('');
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const renderInput = () => {
    const { tipo, clave, opciones } = currentQuestion;

    switch (tipo) {
      case 'select':
        return (
          <select key={clave} id={clave} name={clave} value={currentValue} onChange={handleInputChange} className="interactive-input">
            <option value="" disabled>Selecciona una opción...</option>
            {opciones.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
          </select>
        );
      case 'checkbox':
        return (
          <div className="checkbox-container">
            <input key={clave} type="checkbox" id={clave} name={clave} checked={!!currentValue} onChange={handleInputChange} className="interactive-checkbox" />
            <label htmlFor={clave} className="checkbox-label">{currentQuestion.texto}</label>
          </div>
        );
      default:
        return (
          <input
            key={clave}
            type={tipo}
            id={clave}
            name={clave}
            value={currentValue}
            onChange={handleInputChange}
            className="interactive-input"
            placeholder="Escribe tu respuesta aquí..."
            autoComplete="off"
          />
        );
    }
  };

  return (
    <div className="interactive-form-container">
      <div className="question-container">
        {currentQuestion.tipo !== 'checkbox' && (
            <label htmlFor={currentQuestion.clave} className="question-label">
            {currentQuestion.texto}
            </label>
        )}
        {renderInput()}
        {currentQuestion.helperText && <p className="helper-text">{currentQuestion.helperText}</p>}
        {error && <p style={{ color: '#c73e1d', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }}>{error}</p>}
      </div>
      <div className="navigation-buttons">
        {currentQuestionIndex > 0 && (
          <button onClick={handlePrev} className="btn btn--secondary">Anterior</button>
        )}
        <button onClick={handleNext} className="btn btn--primary">
          {currentQuestionIndex < questions.length - 1 ? 'Siguiente' : 'Finalizar'}
        </button>
      </div>
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default InteractiveForm;