import React, { useState, useEffect } from 'react';
import './InteractiveForm.css';

const InteractiveForm = ({ questions, onSubmit }) => {
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentValue, setCurrentValue] = useState('');
  const [error, setError] = useState(''); // State for validation errors

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    setError(''); // Clear error when question changes
    const answerForCurrentQuestion = answers[currentQuestion.clave];
    if (currentQuestion.tipo === 'checkbox') {
      setCurrentValue(answerForCurrentQuestion || false);
    } else {
      setCurrentValue(answerForCurrentQuestion || '');
    }
  }, [currentQuestionIndex, questions, answers, currentQuestion.clave, currentQuestion.tipo]);

  const handleInputChange = (e) => {
    const { type, value, checked } = e.target;
    setCurrentValue(type === 'checkbox' ? checked : value);
  };

  const handleNext = () => {
    setError(''); // Clear previous errors

    const { validation, required } = currentQuestion;

    // Required field validation
    if (required && !currentValue) {
      setError('Este campo es obligatorio.');
      return;
    }

    // Regex validation (only if there's a value to test)
    if (validation && validation.regex && currentValue) {
      const regex = new RegExp(validation.regex);
      if (!regex.test(currentValue)) {
        setError(validation.errorMessage);
        return;
      }
    }

    // Min/Max validation for numbers
    if (currentQuestion.tipo === 'number' && validation && currentValue) {
        const numericValue = parseFloat(currentValue);
        if (!isNaN(numericValue)) {
            const min = validation.min;
            const max = validation.max;
            if ((min !== undefined && numericValue < min) || (max !== undefined && numericValue > max)) {
                setError(validation.errorMessage || `El valor debe estar entre ${min} y ${max}.`);
                return;
            }
        }
    }

    const newAnswers = { ...answers, [currentQuestion.clave]: currentValue };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onSubmit(newAnswers);
    }
  };

  const handlePrev = () => {
    setError(''); // Clear error when going back
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
            key={clave} // <-- LA SOLUCIÓN
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
      </div>

      {/* Display Validation Error */}
      {error && <p style={{ color: '#c73e1d', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }}>{error}</p>}

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