# Escuderos - Gestión de Turnos Premium

**Escuderos** es una plataforma moderna y minimalista diseñada para la gestión inteligente de turnos dominicales y servicios eclesiásticos. Olvida las hojas de cálculo confusas: gestiona tu equipo con una interfaz de nivel profesional inspirada en herramientas como Notion y Linear.

![Banner Escuderos](https://via.placeholder.com/1200x400/0f172a/ffffff?text=Escuderos+-+Gestion+de+Turnos+2.0)

## ✨ Características Principales

- **Gestión Visual (Drag & Drop):** Asigna escuderos a sus turnos simplemente arrastrando sus nombres.
- **Dashboard de Estadísticas:** Visualiza el progreso de cobertura del mes y la distribución de carga de trabajo en tiempo real.
- **Validación Inteligente:** Detección automática de conflictos para evitar que un escudero sea asignado a dos turnos simultáneos.
- **Modo Dual (Light & Dark):** Interfaz adaptativa optimizada para máxima legibilidad en cualquier entorno.
- **Exportación Profesional:** Genera reportes en PDF, imágenes de alta resolución (PNG) o archivos Excel con un solo clic.
- **Liderazgo Destacado:** Panel dedicado para el Coordinador General con métricas específicas.

## 🌗 Temas Visuales

El proyecto ha sido diseñado con un enfoque "Aesthetics First", utilizando una paleta de colores vibrante pero profesional.

### Modo Oscuro (Default)
Ideal para concentrarse en la lógica y reducir la fatiga visual. Utiliza tonos `slate-950` con acentos en azul eléctrico.

### Modo Claro
Diseño limpio y refrescante basado en blancos puros y sombras suaves (`soft shadow`), ideal para presentaciones y exportaciones impresas.

## 🛠️ Stack Tecnológico

- **Framework:** React 19 + Vite
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Animaciones:** Framer Motion
- **Drag & Drop:** @dnd-kit (Core & Overlay)
- **Iconografía:** Lucide React
- **Exportación:** jsPDF, html2canvas, XLSX

## 🧠 Lógica de Funcionamiento

La aplicación se basa en un estado centralizado que gestiona los turnos del mes seleccionado.

1.  **Generación de Turnos:** Cada vez que cambias de mes, la aplicación genera automáticamente la estructura de domingos basada en el calendario gregoriano.
2.  **Detección de Conflictos:** Al asignar un escudero, el sistema verifica:
    -   Si el escudero ya tiene un turno en el mismo horario.
    -   Balance de carga de trabajo mensual.
3.  **DragOverlay:** Utilizamos portales de React para asegurar que el elemento arrastrado siempre se rinda en el nivel más alto del `z-index`, evitando problemas de recorte por contenedores con `overflow: hidden`.

## 🚀 Instalación y Desarrollo

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/escuderos.git
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 📄 Licencia

Este proyecto es privado y para uso exclusivo de organización de servicios.

---

Desarrollado con ❤️ para elevar el nivel de organización.
