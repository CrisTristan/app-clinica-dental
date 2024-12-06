"use client"

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const AnimatedComponent = () => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className="flex flex-col items-center">
      {/* Botón para alternar visibilidad */}
      <button
        className="mb-4 bg-blue-500 text-white px-4 py-2 rounded-md"
        onClick={() => setIsVisible(!isVisible)}
      >
        Toggle Component
      </button>

      {/* Componente animado */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ x: 50, opacity: 0 }} // Animación de entrada
            animate={{ x: 0, opacity: 1 }} // Animación activa
            exit={{ x: -50, opacity: 0 }} // Animación de salida
            transition={{ duration: 0.5 }} // Duración de la animación
            className="p-4 bg-gray-200 rounded-lg shadow-md"
          >
            Hola, ¡soy un componente animado!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedComponent;
