/**
 * Componente de prueba del canal de Framer.
 *
 * No es de Framer: lo escribí para verificar que toda la cadena funciona
 * —React, framer-motion y el sustituto de `framer`— antes de traer
 * componentes reales. Imita la estructura de un componente exportado de
 * Framer, incluidos los controles de propiedades.
 *
 * Se puede borrar cuando ya haya componentes de verdad.
 */
import { motion } from 'framer-motion';
import { addPropertyControls, ControlType } from 'framer';

interface Props {
  titulo?: string;
  color?: string;
}

export default function EjemploFramer({
  titulo = 'El canal de Framer funciona',
  color = '#00A3C4',
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02 }}
      style={{
        background: color,
        borderRadius: 16,
        padding: '28px 32px',
        color: 'white',
        fontWeight: 700,
      }}
    >
      {titulo}
    </motion.div>
  );
}

// Igual que en un componente real de Framer: sin el sustituto, esto rompe.
addPropertyControls(EjemploFramer, {
  titulo: { type: ControlType.String, title: 'Título' },
  color: { type: ControlType.Color, title: 'Color' },
});
