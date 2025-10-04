import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Rocket, Sparkles, CheckCircle, Play, Coins, RotateCcw, MinusCircle, Sun, Moon, Globe, UserCheck, CloudSun, CloudDrizzle, Fuel, TrendingUp, Atom, Sigma, Users } from 'lucide-react';

// Tipos locales
type IconComponent = React.ComponentType<any>;

interface Part {
  id: string;
  name: string;
  name_es?: string;
  name_en?: string;
  requiredOrder?: number;
  color?: string;
  mass: number;
  fact?: string;
  fact_es?: string;
  fact_en?: string;
  svg?: string;
}

type FactStatus = 'placed' | 'removed' | 'reordered' | 'info';

interface FactData extends Partial<Part> {
  status?: FactStatus;
  fact?: string;
}

interface LocalWeather {
  description?: string;
  icon?: string;
  iconComponent?: IconComponent;
}

// Declaración mínima para KaTeX en window
declare global {
  interface Window { katex?: any; }
}

// Constantes Físicas y de Juego
const EARTH_GRAVITY = 9.8; // Gravedad terrestre (m/s^2)
const ASTRONAUT_UNIT_MASS = 100; // Masa añadida por astronauta (unidades de juego)
const FUEL_CALC_SCALE_FACTOR = 15; // Factor para convertir la masa total en unidades de combustible jugables

// --- CONFIGURACIÓN DE TEXTOS TRADUCIDOS ---
const translations: any = {
  es: {
    title: 'Aprende a Construir Cohetes',
    mission: 'Misión',
    objective: 'Objetivo',
    coins: 'Monedas',
    partsPanelTitle: 'Piezas para Misión',
    requiredOrder: 'Orden Requerido',
    assemblyTitle: 'Ensamblaje para',
    dragToStart: 'Arrastra una pieza del panel izquierdo para comenzar el Ensamblaje.',
    currentOrder: 'Orden Actual',
    undo: 'Deshacer Última',
    launch: '¡LANZAR!',
    missingParts: 'Faltan Piezas',
    reattempt: 'Reintentar',
    nextLevel: 'Nivel Siguiente',
    educationalDataTitle: 'Datos Educativos (NASA)',
    dragForFact: 'Arrastra una pieza al ensamblaje para conocer su **Dato Científico** y función real.',
    locationStatus: 'Tu Astronauta y Misión',
    detectedLocation: 'Ubicación Detectada: %s, %s',
    simulatedWeather: 'Clima Local Simulado: %s %s',
    // Textos para Combustible y Progreso
    gasNeeded: 'Combustible Requerido',
    enterGas: 'Ingresa Combustible (Unidades)',
    progressTitle: 'Progreso de la Misión',
    partsProgress: 'Ensamblaje de Piezas',
    fuelStatus: 'Estado del Combustible',
    fuelSufficient: 'Suficiente',
    fuelInsufficient: 'Insuficiente',
    // Textos de Fórmula
    formulaTitle: 'Fórmula de Combustible (Inspirada en Tsiolkovsky)',
    formulaExplanation: 'El combustible necesario depende de la masa total de tu cohete, la gravedad en el planeta de destino y el peso de la tripulación. **Cuanto más pesado el cohete y más alta la gravedad, más combustible se necesita.**',
  // Keep the LaTeX without surrounding $$ so rendering code can control display mode
  formulaLatex: 'U_{fuel} = \\lceil (M_{\\text{seco}} + M_{\\text{ast}}) \\times \\frac{G_{\\text{destino}}}{9.8} \\times 15 \\rceil',
    formulaLegend: '**$M_{\\text{seco}}$**: Masa de las piezas. **$M_{\\text{ast}}$**: Masa de la tripulación. **$G_{\\text{destino}}$**: Gravedad del planeta destino.',
    partStatus: {
      placed: '¡Pieza Colocada!',
      alreadyAssembled: 'Información de %s.',
      removed: 'Pieza Retirada.',
      reordered: 'Pieza Reordenada.',
    },
    facts: {
      placed: 'Pieza **%s** colocada en la posición actual #%d. ¡Recuerda, puedes reordenar las piezas arrastrándolas en el cohete!',
      complete: 'Ensamblaje completo. Revisa la carga de combustible y la secuencia de piezas antes de lanzar.',
      removed: 'Has retirado la pieza **%s**. Ahora el cohete tiene %d piezas.',
      reordered: 'Pieza **%s** reordenada con éxito. Puedes mover las piezas libremente. ¡El orden de abajo hacia arriba debe ser correcto antes de lanzar!',
    },
    launchMessages: {
      success: '¡ÉXITO! Lanzamiento perfecto a %s. Has ganado %d monedas. ¡Sigue aprendiendo!',
      wrongOrder: '¡ADVERTENCIA! El orden de las piezas es incorrecto. El vuelo fue inestable. ¡Reintenta!',
      missing: '¡FALLO! Faltan piezas esenciales. Completa el ensamblaje.',
      insufficientGas: '¡FALLO CRÍTICO! Combustible insuficiente. Necesitas al menos %d unidades para alcanzar %s.',
      allCompleted: '¡Has completado todos los niveles! Reiniciando a Misión Básica.',
    },
    levelNames: [
        'Misión a Órbita Terrestre', 
        'Misión de Entrega de Satélite (GEO)', 
        'Viaje Tripulado a la Luna', 
        'Misión a Marte'
    ],
    levelDescriptions: [
        'Ensambla un cohete simple para alcanzar la órbita terrestre más cercana.',
        'Añade una Carga Útil para llegar a una órbita geoestacionaria, superando la gravedad terrestre.',
        'El ensamblaje más complejo: ¡prepara un cohete para llevar humanos a la Luna!',
        '¡El desafío final! Crea el cohete multi-etapa más complejo para un viaje de larga duración a Marte.'
    ],
  assembleStep: 'Ensamblar',
  fuelStep: 'Combustible',
  launchStep: 'Lanzamiento',
  },
  en: {
    title: 'Learn to Build Rockets',
    mission: 'Mission',
    objective: 'Objective',
    coins: 'Coins',
    partsPanelTitle: 'Parts for Mission',
    requiredOrder: 'Required Order',
    assemblyTitle: 'Assembly for',
    dragToStart: 'Drag a part from the left panel to start the assembly.',
    currentOrder: 'Current Order',
    undo: 'Undo Last',
    launch: 'LAUNCH!',
    missingParts: 'Missing Parts',
    reattempt: 'Retry',
    nextLevel: 'Next Level',
    educationalDataTitle: 'Educational Data (NASA)',
    dragForFact: 'Drag a part onto the assembly to learn its scientific fact and real-world function.',
    locationStatus: 'Your Astronaut & Mission',
    detectedLocation: 'Detected Location: %s, %s',
    simulatedWeather: 'Simulated Local Weather: %s %s',
    // Fuel and progress texts
    gasNeeded: 'Fuel Required',
    enterGas: 'Enter Fuel (Units)',
    progressTitle: 'Mission Progress',
    partsProgress: 'Parts Assembly',
    fuelStatus: 'Fuel Status',
    fuelSufficient: 'Sufficient',
    fuelInsufficient: 'Insufficient',
    // Formula texts
    formulaTitle: 'Fuel Formula (Inspired by Tsiolkovsky)',
    formulaExplanation: 'The fuel required depends on the total mass of your rocket, the destination gravity, and the crew mass. Heavier rockets and higher gravity require more fuel.',
    // Keep LaTeX raw for the KaTeX renderer
    formulaLatex: 'U_{fuel} = \\lceil (M_{\\text{dry}} + M_{\\text{crew}}) \\times \\frac{G_{\\text{dest}}}{9.8} \\times 15 \\rceil',
    formulaLegend: '**$M_{\\text{dry}}$**: Dry mass (parts). **$M_{\\text{crew}}$**: Crew mass. **$G_{\\text{dest}}$**: Destination gravity.',
    partStatus: {
      placed: 'Part Placed!',
      alreadyAssembled: 'Info for %s.',
      removed: 'Part Removed.',
      reordered: 'Part Reordered.',
    },
    facts: {
      placed: 'Part **%s** placed at position #%d. You can reorder parts by dragging them in the rocket!',
      complete: 'Assembly complete. Check fuel and order before launching.',
      removed: 'You removed the part **%s**. The rocket now has %d parts.',
      reordered: 'Part **%s** reordered successfully. The bottom-to-top order matters for launch!',
    },
    launchMessages: {
      success: 'SUCCESS! Perfect launch to %s. You earned %d coins. Keep learning!',
      wrongOrder: 'WARNING! The part order is incorrect. Flight was unstable. Try again!',
      missing: 'FAIL! Essential parts are missing. Complete the assembly.',
      insufficientGas: 'CRITICAL FAIL! Insufficient fuel. You need at least %d units to reach %s.',
      allCompleted: 'You completed all levels! Resetting to Basic Mission.',
    },
    levelNames: [
      'Basic Mission (4 Parts)',
      'Low Earth Orbit Mission',
      'Geostationary Satellite Delivery (GEO)',
      'Crewed Moon Mission',
      'Mars Mission'
    ],
    levelDescriptions: [
      'Simple 4-piece assembly to reach a low orbit.',
      'Assemble a rocket to reach low Earth orbit.',
      'Add a payload to reach geostationary orbit.',
      'Complex assembly to carry humans to the Moon.',
      'Final challenge to build a multi-stage rocket for Mars.'
    ],
    assembleStep: 'Assemble',
    fuelStep: 'Fuel',
    launchStep: 'Launch',
  },
  fr: {
    title: 'Apprenez à Construire des Fusées',
    mission: 'Mission',
    objective: 'Objectif',
    coins: 'Pièces',
    partsPanelTitle: 'Pièces pour la Mission',
    requiredOrder: 'Ordre Requis',
    assemblyTitle: 'Assemblage pour',
    dragToStart: 'Faites glisser une pièce depuis le panneau gauche pour commencer l\'assemblage.',
    currentOrder: 'Ordre Actuel',
    undo: 'Annuler',
    launch: 'LANCER!',
    missingParts: 'Pièces Manquantes',
    reattempt: 'Réessayer',
    nextLevel: 'Niveau Suivant',
    educationalDataTitle: 'Données Éducatives (NASA)',
    dragForFact: 'Faites glisser une pièce sur l\'assemblage pour connaître son fait scientifique et sa fonction réelle.',
    gasNeeded: 'Carburant Requis',
    enterGas: 'Entrez le Carburant (Unités)',
    progressTitle: 'Progrès de la Mission',
    partsProgress: 'Assemblage des Pièces',
    fuelStatus: 'État du Carburant',
    fuelSufficient: 'Suffisant',
    fuelInsufficient: 'Insuffisant',
    formulaTitle: 'Formule de Carburant (Inspirée de Tsiolkovsky)',
    formulaExplanation: 'Le carburant nécessaire dépend de la masse totale de votre fusée, de la gravité de la planète de destination et du poids de l\'équipage.',
    assembleStep: 'Assembler',
    fuelStep: 'Carburant',
    launchStep: 'Lancement',
  },
  ca: {
    title: 'Aprèn a Construir Coets',
    mission: 'Missió',
    objective: 'Objectiu',
    coins: 'Monedes',
    partsPanelTitle: 'Peces per a la Missió',
    requiredOrder: 'Ordre Requerit',
    assemblyTitle: 'Muntatge per a',
    dragToStart: 'Arrossega una peça del panell esquerre per començar el muntatge.',
    currentOrder: 'Ordre Actual',
    undo: 'Desfer Últim',
    launch: 'LLANÇAR!',
    missingParts: 'Falten Peces',
    reattempt: 'Torna-ho a intentar',
    nextLevel: 'Següent Nivell',
    educationalDataTitle: 'Dades Educatives (NASA)',
    dragForFact: 'Arrossega una peça al muntatge per conèixer el seu fet científic i funció real.',
    locationStatus: 'El teu Astronauta i Missió',
    detectedLocation: 'Ubicació Detectada: %s, %s',
    simulatedWeather: 'Clima Local Simulat: %s %s',
    gasNeeded: 'Combustible Requerit',
    enterGas: 'Introdueix Combustible (Unitats)',
    progressTitle: 'Progrés de la Missió',
    partsProgress: 'Muntatge de Peces',
    fuelStatus: 'Estat del Combustible',
    fuelSufficient: 'Suficient',
    fuelInsufficient: 'Insuficient',
    formulaTitle: 'Fórmula de Combustible (Inspirada en Tsiolkovsky)',
    formulaExplanation: 'El combustible necessari depèn de la massa seca del teu coet, la gravetat de destinació i el pes de la tripulació.',
    formulaLatex: 'U_{fuel} = \\lceil (M_{\text{seco}} + M_{\text{ast}}) \\times \\frac{G_{\text{destino}}}{9.8} \\times 15 \\rceil',
    formulaLegend: '**$M_{\text{seco}}$**: Massa seca. **$M_{\text{ast}}$**: Massa tripulació. **$G_{\text{destino}}$**: Gravetat destinació.',
    partStatus: { placed: 'Peces Col·locada!', alreadyAssembled: 'Informació de %s.', removed: 'Peca Retirada.', reordered: 'Peca Reordenada.' },
    facts: { placed: 'Peca **%s** col·locada a la posició #%d.', complete: 'Muntatge complet.', removed: 'Has retirat la peca **%s**.', reordered: 'Peca **%s** reordenada.' },
    launchMessages: { success: 'ÈXIT! Llançament perfecte a %s. Has guanyat %d monedes.', wrongOrder: 'AVÍS! Ordre incorrecte.', missing: 'FALLO! Falten peces.', insufficientGas: 'FALLO CRÍTIC! Combustible insuficient.', allCompleted: 'Has completat tots els nivells!' },
    levelNames: ['Missió Bàsica (4 Peces)', 'Missió a Òrbita Terrestre', 'Missió de Lliurament de Satèl·lit (GEO)', 'Viatge Tripulat a la Lluna', 'Missió a Mart'],
    levelDescriptions: ['Muntatge senzill amb 4 peces.', 'Muntatge per a òrbita terrestre baixa.', 'Afegeix un carregament per arribar a GEO.', 'Muntatge complex per portar humans a la Lluna.', 'Desafiament final per a Mart.']
    ,assembleStep: 'Muntar',
    fuelStep: 'Combustible',
    launchStep: 'Llançament'
  }
};

// Función para obtener texto traducido (soporta placeholders)
const getText = (lang: string, key: string, ...args: any[]): string => {
  let text: any = translations[lang]?.[key] ?? translations['es'][key]; // Usar ES como fallback
  if (typeof text === 'object') {
    const subKey = args.shift();
    text = text?.[subKey] ?? subKey;
  }

  if (typeof text !== 'string') return String(text ?? '');

  let argIndex = 0;
  return text.replace(/%[sd]/g, (_match: string) => {
    const value = args[argIndex++];
    return value !== undefined ? String(value) : _match;
  });
};

// Helper: map part id to asset image (Vite import via new URL)
const getPartAsset = (id: string) => {
  try {
    switch (id) {
      case 'engine': return new URL('./assets/Ares_5_Main_Rocket.png', import.meta.url).href;
      case 'p1': return new URL('./assets/1.png', import.meta.url).href;
      case 'p2': return new URL('./assets/2.png', import.meta.url).href;
      case 'p3': return new URL('./assets/3.png', import.meta.url).href;
      case 'p4': return new URL('./assets/4.png', import.meta.url).href;
      case 'body': return new URL('./assets/Ares_5_Secondary_Rocket.png', import.meta.url).href;
      case 'nose': return new URL('./assets/Ares_5_Tertiary_Rocket.png', import.meta.url).href;
      case 'payload': return new URL('./assets/Ares_5_Payload_Rocket.png', import.meta.url).href;
      case 'booster': return new URL('./assets/SaturnV_Secondary_Rocket.png', import.meta.url).href;
      case 'crew': return new URL('./assets/SaturnV_Tertiary_Rocket.png', import.meta.url).href;
      case 'command': return new URL('./assets/SaturnV_Main_Rocket.png', import.meta.url).href;
      default: return '';
    }
  } catch (e) {
    return '';
  }
};

// Helper: choose an image for a level part so every level shows images 1..4
const getImageForPart = (part: Part, idx: number) => {
  // Prefer explicit pN ids or matching asset
        if (part.id && /^p[1-4]$/.test(part.id)) {
    const img = getPartAsset(part.id);
    if (img) return img;
  }

  // If the part has a requiredOrder within 1..4, use that image index
        if (part.requiredOrder && part.requiredOrder >= 1 && part.requiredOrder <= 4) {
    const img = getPartAsset(`p${part.requiredOrder}`);
    if (img) return img;
  }

  // Otherwise, map by index modulo 4
        const fallbackIndex = (idx % 4) + 1;
  return getPartAsset(`p${fallbackIndex}`) || '';
};

// Función para convertir el código de país (ISO 3166-1 alpha-2) a un emoji de bandera Unicode
const getFlagEmoji = (countryCode?: string | null) => {
  if (!countryCode) return '🌎';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};


// --- DATOS BASE Y NIVELES ---

// Añadir la propiedad 'mass' (Masa Seca en unidades de juego)
const BASE_COMPONENTS = [
  { id: 'engine', name_es: 'Motor de Empuje (E1)', name_en: 'Thrust Engine (E1)', requiredOrder: 1, color: 'bg-red-700', mass: 300, fact_es: 'El **Motor de Empuje** genera la fuerza (empuje) al quemar propelente. Esta es la única forma de escapar de la gravedad terrestre.', fact_en: 'The **Thrust Engine** generates force (thrust) by burning propellant. This is the only way to escape Earth\'s gravity.',
    svg: `<path d="M12 22l-3-4h6l-3 4z" fill="#f87171"/><rect x="8" y="10" width="8" height="8" fill="#4b5563" stroke="#1f2937" strokeWidth="1"/><path d="M12 24l-4-4h8l-4 4z" fill="#facc15"/><rect x="10" y="18" width="4" height="2" fill="#374151"/>`
  },
  { id: 'body', name_es: 'Módulo de Combustible (M1)', name_en: 'Fuel Module (M1)', requiredOrder: 2, color: 'bg-indigo-600', mass: 400, fact_es: 'El **Módulo de Combustible** almacena grandes cantidades de propelente líquido o sólido. Es la parte más larga del cohete.', fact_en: 'The **Fuel Module** stores large amounts of liquid or solid propellant. It is the longest part of the rocket.', 
    svg: `<rect x="6" y="4" width="12" height="16" fill="#4f46e5" stroke="#3730a3" strokeWidth="1"/><rect x="7" y="5" width="10" height="14" fill="#6366f1" opacity="0.5"/><path d="M6 10h12" stroke="#fff" strokeWidth="1" strokeDasharray="3,3"/>`
  },
  { id: 'nose', name_es: 'Cono Aerodinámico (C1)', name_en: 'Aerodynamic Cone (C1)', requiredOrder: 3, color: 'bg-cyan-500', mass: 100, fact_es: 'El **Cono Aerodinámico** tiene una forma puntiaguda para minimizar la resistencia del aire (drag), ¡lo que permite al cohete volar más rápido!', fact_en: 'The **Aerodynamic Cone** has a pointed shape to minimize air resistance (drag), which allows the rocket to fly faster!', 
    svg: `<path d="M12 2l-6 8h12l-6 -8z" fill="#06b6d4" stroke="#0891b2" strokeWidth="1"/><path d="M12 2l-4 6h8l-4 -6z" fill="#22d3ee"/>`
  },
];

const GAME_LEVELS = [
  { 
    level: 1, 
    target_es: 'Órbita Básica', target_en: 'Basic Orbit',
    planet_es: 'Tierra', planet_en: 'Earth', gravity: EARTH_GRAVITY, astronauts: 0,
    requiredParts: [
      { id: 'p1', name_es: 'Pieza 1', name_en: 'Part 1', requiredOrder: 1, color: 'bg-blue-500', mass: 100, svg: '' },
      { id: 'p2', name_es: 'Pieza 2', name_en: 'Part 2', requiredOrder: 2, color: 'bg-green-500', mass: 100, svg: '' },
      { id: 'p3', name_es: 'Pieza 3', name_en: 'Part 3', requiredOrder: 3, color: 'bg-yellow-500', mass: 100, svg: '' },
      { id: 'p4', name_es: 'Pieza 4', name_en: 'Part 4', requiredOrder: 4, color: 'bg-red-500', mass: 100, svg: '' },
    ],
    reward: 5,
  },
  { 
    level: 2, 
    target_es: 'Órbita Geoestacionaria (GEO)', target_en: 'Geostationary Orbit (GEO)',
    planet_es: 'Tierra', planet_en: 'Earth', gravity: EARTH_GRAVITY, astronauts: 0, // Gravedad terrestre (9.81 m/s^2) - mayor delta-v
    requiredParts: [
        { ...BASE_COMPONENTS[0], mass: 350, fact_es: BASE_COMPONENTS[0].fact_es + ' (Motor de Alta Eficiencia)', fact_en: BASE_COMPONENTS[0].fact_en + ' (High Efficiency Engine)' }, 
        { id: 'payload', name_es: 'Carga Útil/Satélite (P1)', name_en: 'Payload/Satellite (P1)', requiredOrder: 2, color: 'bg-yellow-400', mass: 250,
            fact_es: 'La **Carga Útil** es el objeto que el cohete lleva al espacio. Un satélite GEO requiere mucha energía para alcanzar su órbita final.', fact_en: 'The **Payload** is the object the rocket carries into space. A GEO satellite requires a lot of energy to reach its final orbit.',
            svg: `<circle cx="12" cy="12" r="6" fill="#fcd34d" stroke="#b45309" strokeWidth="1"/><path d="M12 6v-2M12 18v-2M6 12h-2M18 12h-2" stroke="#b45309" strokeWidth="2"/>` 
        },
        { ...BASE_COMPONENTS[2], requiredOrder: 3 },
    ],
    reward: 25,
  },
  {
    level: 3,
    target_es: 'Luna', target_en: 'Moon',
    planet_es: 'Luna', planet_en: 'Moon', gravity: 1.62, astronauts: 3, // Gravedad Lunar (1.62 m/s^2)
    requiredParts: [
        { ...BASE_COMPONENTS[0], mass: 400, fact_es: BASE_COMPONENTS[0].fact_es + ' (Motor Principal de la Etapa)', fact_en: BASE_COMPONENTS[0].fact_en + ' (Main Stage Engine)' }, 
        { id: 'booster', name_es: 'Cohetes Auxiliares (B1)', name_en: 'Auxiliary Rockets (B1)', requiredOrder: 2, color: 'bg-orange-500', mass: 350,
            fact_es: 'Los **Cohetes Auxiliares** (Boosters) se desprenden para reducir el peso, pero añaden masa inicial al cohete.', fact_en: 'The **Auxiliary Rockets** (Boosters) detach to reduce weight, but add initial mass to the rocket.', 
            svg: `<rect x="6" y="14" width="4" height="8" fill="#f97316" stroke="#c2410c" strokeWidth="1"/><rect x="14" y="14" width="4" height="8" fill="#f97316" stroke="#c2410c" strokeWidth="1"/>`
        },
        { ...BASE_COMPONENTS[1], mass: 500, fact_es: BASE_COMPONENTS[1].fact_es + ' (Gran Tanque de Transferencia)', fact_en: BASE_COMPONENTS[1].fact_en + ' (Large Transfer Tank)', requiredOrder: 3 }, 
        { id: 'crew', name_es: 'Cápsula de Tripulación (T1)', name_en: 'Crew Capsule (T1)', requiredOrder: 4, color: 'bg-cyan-500', mass: 500,
            fact_es: 'La **Cápsula de Tripulación** alberga 3 astronautas. ¡Recuerda, cada astronauta añade peso extra!', fact_en: 'The **Crew Capsule** houses 3 astronauts. Remember, each astronaut adds extra weight!', 
            svg: `<path d="M6 10a6 6 0 0 1 12 0v6a2 2 0 0 1 -2 2H8a2 2 0 0 1 -2 -2v-6z" fill="#06b6d4" stroke="#0e7490" strokeWidth="1"/><circle cx="12" cy="12" r="2" fill="#fff"/>`
        },
        { id: 'command', name_es: 'Módulo de Comando (M2)', name_en: 'Command Module (M2)', requiredOrder: 5, color: 'bg-gray-400', mass: 200, 
            fact_es: 'El **Módulo de Comando** es el "cerebro" del cohete, con la computadora de vuelo y navegación.', fact_en: 'The **Command Module** is the rocket\'s "brain," housing the flight computer and navigation.',
            svg: `<path d="M12 2l-6 8h12l-6 -8z" fill="#9ca3af" stroke="#4b5563" strokeWidth="1"/><rect x="8" y="8" width="8" height="2" fill="#374151"/>`
        },
    ],
    reward: 50,
  },
  {
    level: 4,
    target_es: 'Marte', target_en: 'Mars',
    planet_es: 'Marte', planet_en: 'Mars', gravity: 3.71, astronauts: 4, // Gravedad Marciana (3.71 m/s^2)
    requiredParts: [
        { ...BASE_COMPONENTS[0], mass: 450, fact_es: BASE_COMPONENTS[0].fact_es + ' (Motor Iónico)', fact_en: BASE_COMPONENTS[0].fact_en + ' (Ionic Engine)', requiredOrder: 1 }, 
        { id: 'fuel_stage_1', name_es: 'Etapa Propulsora (P1)', name_en: 'Propellant Stage (P1)', requiredOrder: 2, color: 'bg-green-700', mass: 500,
            fact_es: 'La **Etapa Propulsora** es la primera de varias. El concepto de cohetes multi-etapa es clave para misiones a Marte.', fact_en: 'The **Propellant Stage** is the first of several. The concept of multi-stage rockets is key for missions to Mars.', 
            svg: `<rect x="6" y="10" width="12" height="10" fill="#047857" stroke="#065f46" strokeWidth="1"/><path d="M6 10h12" stroke="#fff" strokeWidth="1" strokeDasharray="2,2"/>`
        },
        { ...BASE_COMPONENTS[1], mass: 500, fact_es: BASE_COMPONENTS[1].fact_es + ' (Gran Tanque Intermedio)', fact_en: BASE_COMPONENTS[1].fact_en + ' (Large Intermediate Tank)', requiredOrder: 3 }, 
        { id: 'habitat', name_es: 'Módulo de Hábitat', name_en: 'Habitat Module', requiredOrder: 4, color: 'bg-yellow-700', mass: 600,
            fact_es: 'El **Módulo de Hábitat** contiene provisiones y espacio vital para 4 astronautas. Es la pieza más pesada.', fact_en: 'The **Habitat Module** contains provisions and living space for 4 astronauts. It is the heaviest piece.', 
            svg: `<path d="M6 10a6 6 0 0 1 12 0v4a2 2 0 0 1 -2 2H8a2 2 0 0 1 -2 -2v-4z" fill="#b45309" stroke="#92400e" strokeWidth="1"/><rect x="8" y="11" width="8" height="2" fill="#d97706"/>`
        },
        { ...BASE_COMPONENTS[2], mass: 100, fact_es: BASE_COMPONENTS[2].fact_es + ' (Cono de Escudo Térmico)', fact_en: BASE_COMPONENTS[2].fact_en + ' (Heat Shield Cone)', requiredOrder: 5 }, 
    ],
    reward: 100,
  }
];

// --- COMPONENTE PRINCIPAL ---

const App = () => {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [assembledParts, setAssembledParts] = useState<Part[]>([]);
  const [currentFact, setCurrentFact] = useState<FactData | null>(null);
  const [isLaunched, setIsLaunched] = useState<boolean>(false);
  const [launchMessage, setLaunchMessage] = useState<{ text: string; success: boolean }>({ text: '', success: false });
  const [score, setScore] = useState<number>(0);
  // Phase: 1 = Assemble, 2 = Fuel, 3 = Launch
  const [phase, setPhase] = useState<number>(1);
  const [launchLocation, setLaunchLocation] = useState<string>('Earth');
  
  // Estados para Dark/Light Mode e Idioma
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<string>('es');

  // Estados para Ubicación/Clima y Combustible
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [localWeather, setLocalWeather] = useState<LocalWeather | null>(null);
  const [playerFuel, setPlayerFuel] = useState<number>(0);

  // Referencia para el contenedor de la fórmula KaTeX
  const formulaContainerRef = useRef<HTMLDivElement | null>(null);


  // --- EFECTOS INICIALES ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('rocket-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme as 'dark' | 'light');
    }
  const browserLang = navigator.language.split('-')[0];
  if (['es', 'en', 'ca'].includes(browserLang)) {
    setLanguage(browserLang);
  }
  }, []);

  // Efecto para renderizar KaTeX (Reemplaza el script problemático)
  useEffect(() => {
  const el = formulaContainerRef.current;
  if (!el) return;

  const raw = el.textContent ?? '';
  // Quitar delimitadores $ si el texto los incluye por accidente
  const cleaned = raw.replace(/^\$+|\$+$/g, '').trim();

  if (window.katex && typeof window.katex.render === 'function') {
    try {
      window.katex.render(cleaned, el, {
        throwOnError: false,
        displayMode: true,
      });
    } catch (e) {
      console.error('KaTeX rendering error:', e);
      el.textContent = cleaned; // fallback a texto plano
    }
  } else {
    // Si KaTeX no está presente (p. ej. en tests), mostrar la fórmula cruda
    el.textContent = cleaned;
  }
  }, [currentLevel]); // currentLevel por si la fórmula cambiara

  useEffect(() => {
    const fetchLocationAndWeather = async () => {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            if (data.country_code) setCountryCode(String(data.country_code));
            if (data.city) setCity(String(data.city));

            const randomWeather = Math.random();
            let weatherData = {};
            
            if (randomWeather < 0.3) {
                weatherData = { description: 'Soleado y Despejado, 25°C', icon: '☀️', iconComponent: Sun };
            } else if (randomWeather < 0.6) {
                weatherData = { description: 'Nublado, 18°C', icon: '☁️', iconComponent: CloudSun };
            } else {
                weatherData = { description: 'Lluvia Ligera, 15°C', icon: '🌧️', iconComponent: CloudDrizzle };
            }
            setLocalWeather(weatherData as LocalWeather);

        } catch (err) {
            console.error("Error fetching location/weather:", err);
            setCountryCode('UN');
            setCity('Tierra');
            setLocalWeather({ description: 'Estándar', icon: '🌎', iconComponent: Globe });
        }
    };
    fetchLocationAndWeather();
  }, []);


  // --- LÓGICA DE JUEGO Y UTILIDADES ---

  const t = (key: string, ...args: any[]) => getText(language, key, ...args);
  const langSuffix = 'es'; // Mantener el juego en español por defecto

  const levelData = useMemo(() => {
    const data = GAME_LEVELS.find(l => l.level === currentLevel) || GAME_LEVELS[0];
    
    // Calcular Masa Seca Total (Dry Mass)
    const totalDryMass = data.requiredParts.reduce((sum, part) => sum + part.mass, 0);
    // Calcular Masa de Astronautas
    const totalAstronautMass = data.astronauts * ASTRONAUT_UNIT_MASS;
    
    // --- NUEVA FÓRMULA DE CÁLCULO DE COMBUSTIBLE (Inspirada en Física) ---
    // U_fuel = round_up((M_seco + M_ast) * (G_destino / G_tierra) * FactorEscala)
    const gravityFactor = data.gravity / EARTH_GRAVITY;
    const totalMassForCalc = totalDryMass + totalAstronautMass;
    
    const requiredFuel = Math.ceil(totalMassForCalc * gravityFactor * FUEL_CALC_SCALE_FACTOR);
    // --------------------------------------------------------------------
    
    return {
        ...data,
        requiredFuel: requiredFuel, 
        totalDryMass: totalDryMass,
        totalAstronautMass: totalAstronautMass,
        targetPlanet: data[`planet_${langSuffix}`],
        gravity: data.gravity,
        name: translations[langSuffix].levelNames[data.level - 1],
        description: translations[langSuffix].levelDescriptions[data.level - 1],
        target: data[`target_${langSuffix}`],
    requiredParts: data.requiredParts.map((p: any) => ({
      ...p,
      name: p[`name_${langSuffix}`] ?? p.name,
      fact: p[`fact_${langSuffix}`] ?? p.fact,
    })) as Part[],
    };
  }, [currentLevel]); // Dependencias: currentLevel

  // Helper: map selected launch location to gravity
  const getGravityForLocation = (loc: string) => {
    switch ((loc || '').toLowerCase()) {
      case 'moon': return 1.62;
      case 'mars': return 3.71;
      case 'earth':
      default:
        return EARTH_GRAVITY;
    }
  };

  // Gravity chosen by the user (launch site)
  const selectedGravity = getGravityForLocation(launchLocation);

  const totalPartsRequired = levelData.requiredParts.length;
  const isAssemblyComplete = assembledParts.length === totalPartsRequired;

  // Compute required fuel from assembled parts when available (user requested: base fuel on part-1 assembly)
  const computedRequiredFuel = useMemo(() => {
    const massFromAssembled = assembledParts.length > 0 ? assembledParts.reduce((s, p) => s + (p.mass || 0), 0) : levelData.totalDryMass;
    const totalAstronautMass = levelData.totalAstronautMass;
    // use selectedGravity (based on chosen launchLocation) instead of level default gravity
    const gravityFactor = selectedGravity / EARTH_GRAVITY;
    return Math.ceil((massFromAssembled + totalAstronautMass) * gravityFactor * FUEL_CALC_SCALE_FACTOR);
  }, [assembledParts, levelData, selectedGravity]);

  // Use the computed value when assembly exists or when in fuel phase, otherwise fallback to level default
  const requiredFuel = computedRequiredFuel ?? levelData.requiredFuel;
  const isFuelSufficient = playerFuel >= requiredFuel;

  const correctlyOrderedParts = useMemo(() => {
    return [...(levelData.requiredParts || [])].sort((a: any, b: any) => (a.requiredOrder ?? 0) - (b.requiredOrder ?? 0)) as Part[];
  }, [levelData]);

  // Manejadores de Drag & Drop (sin cambios significativos)
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isLaunched || e.dataTransfer.getData("assembledIndex")) return;
    if (phase !== 1) return; // only allow assembling in phase 1
                const partId = e.dataTransfer.getData("partId");
    const part = (levelData.requiredParts || []).find((p: Part) => p.id === partId) as Part | undefined;
    if (!part || assembledParts.find(p => p.id === part.id)) return;

    const newPartsList = [...assembledParts, part];
    setAssembledParts(newPartsList);
    const nextOrderNumber = newPartsList.length;
    let factMessage = t('facts', 'placed', part.name, nextOrderNumber);

    if (nextOrderNumber === totalPartsRequired) {
      setLaunchMessage({ text: t('facts', 'complete'), success: true });
      factMessage = t('facts', 'complete');
    }
    setCurrentFact({ ...part, status: 'placed', fact: factMessage });
  }, [assembledParts, isLaunched, totalPartsRequired, levelData, t]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, partId: string) => {
    e.dataTransfer.setData("partId", partId);
    // If there is an image in the panel with this part id, use it as drag preview
    try {
      const img = document.querySelector(`img[data-part-img="${partId}"]`) as HTMLImageElement | null;
      if (img) {
        const rect = img.getBoundingClientRect();
        e.dataTransfer.setDragImage(img, rect.width / 2, rect.height / 2);
      }
    } catch (err) {
      // ignore
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleAssemblyDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.stopPropagation();
    e.dataTransfer.setData("assembledIndex", String(index));
    try {
      // prefer the actual image inside the assembly item as drag preview
      const img = (e.currentTarget as HTMLElement).querySelector('img') as HTMLImageElement | null;
      if (img) {
        const rect = img.getBoundingClientRect();
        e.dataTransfer.setDragImage(img, rect.width / 2, rect.height / 2);
      }
    } catch (err) {
      // ignore
    }
  };
  
  const handleAssemblyDrop = useCallback((e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (isLaunched) return;
    const draggedAssemblyIndex = parseInt(e.dataTransfer.getData("assembledIndex"), 10);
    if (isNaN(draggedAssemblyIndex) || draggedAssemblyIndex === targetIndex) return;

    const newParts = [...assembledParts];
    const [movedPart] = newParts.splice(draggedAssemblyIndex, 1);
    newParts.splice(targetIndex, 0, movedPart);

    setAssembledParts(newParts);
    setLaunchMessage({ text: '', success: false });
    setCurrentFact({ name: movedPart.name, fact: t('facts', 'reordered', movedPart.name), status: 'reordered' });
  }, [assembledParts, isLaunched, t]);

  const handleRemoveLastPart = () => {
    if (isLaunched || assembledParts.length === 0) return;
    const lastPart = assembledParts[assembledParts.length - 1];
    setAssembledParts(assembledParts.slice(0, -1));
    setCurrentFact({ ...lastPart, status: 'removed', fact: t('facts', 'removed', lastPart.name, assembledParts.length - 1) });
    setLaunchMessage({ text: '', success: false });
  };
  
  // Manejar el evento de 'Lanzamiento'
  const handleLaunch = () => {
    setIsLaunched(true);
    let success = false;
    let message = '';

    if (!isAssemblyComplete) {
      message = t('launchMessages', 'missing');
    } else if (!isFuelSufficient) {
      message = t('launchMessages', 'insufficientGas', requiredFuel, levelData.target);
    } else {
      const correctOrder = assembledParts.every((part, index) => part.id === correctlyOrderedParts[index].id);
      
      if (correctOrder) {
        success = true;
        setScore(prev => prev + levelData.reward);
        message = t('launchMessages', 'success', levelData.target, levelData.reward);
      } else {
        message = t('launchMessages', 'wrongOrder');
      }
    }

    setLaunchMessage({ text: message, success });
  };
  
  const resetGame = (advance = false) => {
    setAssembledParts([]);
    setCurrentFact(null);
    setIsLaunched(false);
    setLaunchMessage({ text: '', success: false });
    setPlayerFuel(0); 
    
    if (advance && currentLevel < GAME_LEVELS.length) {
        setCurrentLevel(currentLevel + 1);
    } else if (advance && currentLevel === GAME_LEVELS.length) {
        setCurrentLevel(1); 
        setLaunchMessage({ text: t('launchMessages', 'allCompleted'), success: true });
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('rocket-theme', newTheme);
  };

  // Definición de Clases de Tema
  const themeClasses = {
    dark: {
        bg: 'bg-gray-950 text-white',
        cardBg: 'bg-gray-900',
        infoCardBg: 'bg-gray-800',
        border: 'border-gray-800',
        text: 'text-gray-400',
        icon: 'text-pink-400',
        rocketBorder: 'border-indigo-400',
    },
    light: {
        bg: 'bg-gray-100 text-gray-900',
        cardBg: 'bg-white',
        infoCardBg: 'bg-gray-200',
        border: 'border-gray-300',
        text: 'text-gray-600',
        icon: 'text-pink-600',
        rocketBorder: 'border-indigo-600',
    }
  };
  const tc = themeClasses[theme];


  // --- COMPONENTES AUXILIARES ---

  const AstronautInfo: React.FC<{ launchLocation: string }> = ({ launchLocation }) => {
    const flag = getFlagEmoji(countryCode);
    const LocationIcon = UserCheck;
    const WeatherIcon = (localWeather?.iconComponent as IconComponent) || CloudSun;

  return (
        <div className={`p-4 rounded-xl shadow-lg border-2 flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 ${tc.cardBg} ${theme === 'dark' ? 'border-indigo-700' : 'border-indigo-300'}`}>
            <div className='flex items-center space-x-3'>
                <div className="flex flex-col items-center">
                    <LocationIcon className={`w-10 h-10 ${tc.icon} animate-pulse-slow`} />
                    <span className="text-4xl">{flag}</span>
                </div>
                <div className="text-left">
                    <h3 className={`font-extrabold text-lg ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`}>{t('locationStatus')}</h3>
          <p className={`text-sm ${tc.text}`}>
            {city ? t('detectedLocation', city, countryCode) : 'Detectando Ubicación...'}
          </p>
                </div>
            </div>

            {localWeather && launchLocation === 'Earth' && (
                <div className={`flex items-center space-x-2 p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}>
                    <WeatherIcon className={`w-6 h-6 ${tc.icon}`} />
          <div className="text-sm">
            <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('simulatedWeather', localWeather?.description ?? '', localWeather?.icon ?? '')}</p>
          </div>
                </div>
            )}
        </div>
    );
  };
  
  const MissionProgress: React.FC<{ partsCount: number; totalParts: number; fuelLoaded: number; fuelRequired: number; themeClasses: any; theme: 'dark' | 'light'; t: (k: string, ...a: any[]) => string; levelData: any; phase: number; launchLocation: string; setLaunchLocation: (s:string) => void }> = ({ partsCount, totalParts, fuelLoaded, fuelRequired, themeClasses, theme, t, levelData, phase, launchLocation, setLaunchLocation }) => {
    const assemblyPercentage = totalParts > 0 ? (partsCount / totalParts) * 100 : 0;
    const fuelStatus = fuelLoaded >= fuelRequired;
    const tc = themeClasses[theme];

  return (
    <div className={`p-4 rounded-xl shadow-lg border-2 ${tc.cardBg} ${theme === 'dark' ? 'border-purple-700' : 'border-purple-300'} mb-6`}>
      {/* Phase progress moved into MissionProgress */}
      <PhaseProgress phase={phase} />
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-xl font-bold flex items-center ${theme === 'dark' ? 'text-purple-400' : 'text-purple-700'}`}>
                <TrendingUp className="w-5 h-5 mr-2" /> {t('progressTitle')}
              </h3>
              <div>
                <label className="text-sm mr-2">Launch Site:</label>
                <select value={launchLocation} onChange={(e) => setLaunchLocation(e.target.value)} className="px-2 py-1 rounded">
                  <option value="Earth">Earth</option>
                  <option value="Moon">Moon</option>
                  <option value="Mars">Mars</option>
                </select>
              </div>
            </div>

            {/* Datos de la Misión (Planeta, Gravedad, Tripulación) */}
            <div className={`grid grid-cols-3 gap-2 text-sm mb-4 p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div className={`flex flex-col items-center p-1 rounded ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'}`}>
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-xs">{levelData.targetPlanet}</span>
                </div>
                <div className={`flex flex-col items-center p-1 rounded ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'}`}>
                    <Atom className="w-4 h-4 text-red-400" />
          <span className="font-semibold text-xs">G: {selectedGravity} m/s²</span>
                </div>
                <div className={`flex flex-col items-center p-1 rounded ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'}`}>
                    <Users className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-xs">{levelData.astronauts} Tripulantes</span>
                </div>
            </div>

            {/* Progreso de Ensamblaje */}
            <div className="mb-4">
                <p className={`text-sm font-semibold mb-1 ${tc.text}`}>{t('partsProgress')}: {partsCount}/{totalParts}</p>
                <div className="w-full bg-gray-600 rounded-full h-2.5">
                    <div 
                        className="h-2.5 rounded-full bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${assemblyPercentage}%` }}
                    />
                </div>
            </div>

            {/* Estado del Combustible */}
            <div>
                <p className={`text-sm font-semibold mb-1 flex items-center justify-between ${tc.text}`}>
                    <span>{t('fuelStatus')} ({t('gasNeeded')}: {fuelRequired})</span>
                    <span className={`font-bold ${fuelStatus ? 'text-green-500' : 'text-red-500'}`}>
                        {fuelStatus ? t('fuelSufficient') : t('fuelInsufficient')}
                    </span>
                </p>
                <div className="w-full bg-gray-600 rounded-full h-2.5">
                    <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${fuelStatus ? 'bg-green-500' : 'bg-red-500'}`} 
                        style={{ width: `${Math.min(100, (fuelLoaded / fuelRequired) * 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
  };


  const RocketDisplay: React.FC<{ parts: Part[] }> = ({ parts }) => (
    <div 
      className={`flex flex-col items-center w-full h-full justify-end p-4 border-4 border-dashed ${tc.rocketBorder} rounded-xl shadow-inner overflow-auto relative ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}
      style={{ minHeight: 0 }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className={`absolute top-4 left-4 font-bold ${tc.text}`}>
        {t('partsPanelTitle')}: {parts.length} / {totalPartsRequired}
      </div>
      
  <div className="w-full transition-all duration-500 relative" style={{ minHeight: '300px' }}>
        {parts.length === 0 && (
          <p className={`text-lg my-12 select-none animate-pulse ${tc.text}`}>
            {t('dragToStart')}
          </p>
        )}

        {levelData.level === 1 ? (
          // For the basic orbit show images stacked and centered with absolute positioning
          <div className="relative w-full h-full flex items-end justify-center" style={{ minHeight: 300 }}>
            {parts.map((part: Part, index: number) => {
              const img = getImageForPart(part, index);
              // scale offsets based on count
              const overlapPx = Math.max(6, 14 - parts.length * 2);
              const mid = (parts.length - 1) / 2;
              const baseOffset = 16 + (4 - parts.length) * 8; // fewer parts sit higher
              const offset = Math.round((index - mid) * overlapPx + baseOffset);
              const widthRem = `${10 - Math.min(4, parts.length) }rem`;
              if (img) {
                return (
                    <img
                    key={part.id + index}
                    data-part-img={part.id}
                    src={img}
                    alt={part.name || part.name_es}
                    draggable={!isLaunched}
                    onDragStart={(e) => handleAssemblyDragStart(e as any, index)}
                    onDrop={(e) => handleAssemblyDrop(e as any, index)}
                    onDragOver={handleDragOver}
                    className="object-contain transition-all duration-300"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bottom: `${offset}px`,
                        zIndex: 100 + index,
                        width: widthRem,
                        height: 'auto'
                      }}
                  />
                );
              }
              // fallback
              return (
                <div
                  key={part.id + index}
                  draggable={!isLaunched}
                  onDragStart={(e) => handleAssemblyDragStart(e, index)}
                  onDrop={(e) => handleAssemblyDrop(e, index)}
                  onDragOver={handleDragOver}
                  className={`w-full md:w-3/5 lg:w-1/2 h-28 flex items-center justify-center text-white font-bold relative transition-all duration-500 transform ${part.color} border-4 ${theme === 'dark' ? 'border-gray-900' : 'border-gray-700'} shadow-xl mb-[-4px] rounded-lg cursor-move`}
                  style={{ zIndex: part.requiredOrder }}
                >
                  <svg viewBox="0 0 24 24" className="w-16 h-16 mr-2" dangerouslySetInnerHTML={{ __html: part.svg || '' }} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col-reverse items-center justify-start w-full">
            {parts.map((part: Part, index: number) => {
              const img = getImageForPart(part, index);
              const count = parts.length;
              // size down when there are many small parts, enlarge when few
              const size = count <= 2 ? 40 : count === 3 ? 30 : 24;
              const sizePx = `${size}px`;
              if (img) {
                return (
                  <img
                    key={part.id + index}
                    data-part-img={part.id}
                    src={img}
                    alt={part.name || part.name_es}
                    draggable={!isLaunched}
                    onDragStart={(e) => handleAssemblyDragStart(e as any, index)}
                    onDrop={(e) => handleAssemblyDrop(e as any, index)}
                    onDragOver={handleDragOver}
                    className="object-contain mr-2 transition-all duration-500"
                    style={{ zIndex: part.requiredOrder, width: sizePx, height: sizePx }}
                  />
                );
              }
              return (
                <div 
                  key={part.id + index} 
                  draggable={!isLaunched}
                  onDragStart={(e) => handleAssemblyDragStart(e, index)}
                  onDrop={(e) => handleAssemblyDrop(e, index)}
                  onDragOver={handleDragOver}
                  className={`w-full md:w-3/5 lg:w-1/2 h-28 flex items-center justify-center text-white font-bold relative transition-all duration-500 transform ${part.color} border-4 ${theme === 'dark' ? 'border-gray-900' : 'border-gray-700'} shadow-xl mb-[-4px] rounded-lg cursor-move`}
                  style={{ zIndex: part.requiredOrder }}
                >
                  <svg viewBox="0 0 24 24" className="w-16 h-16 mr-2" dangerouslySetInnerHTML={{ __html: part.svg || '' }} />
                  <span className="text-sm text-shadow select-none absolute top-1 right-2 opacity-80">{part.name}</span>
                  <span className="absolute bottom-1 right-2 text-xs opacity-70">{t('currentOrder')} #{index + 1}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Improved 3-step horizontal progress bar
  const PhaseProgress: React.FC<{ phase: number }> = ({ phase }) => {
    const steps = [t('assembleStep') || 'Assemble', t('fuelStep') || 'Fuel', t('launchStep') || 'Launch'];
    const pct = ((phase - 1) / Math.max(1, steps.length - 1)) * 100;
    return (
      <div className="w-full max-w-3xl mx-auto mb-4 px-4">
        <div className="relative h-14 flex items-center">
          {/* subtle background line */}
          <div className="absolute left-6 right-6 top-1/2 transform -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-700 rounded" />

          {/* animated gradient fill */}
          <div
            className="absolute left-6 top-1/2 transform -translate-y-1/2 h-1 rounded transition-all duration-700 ease-out"
            style={{ width: `calc(${pct}% )`, background: 'linear-gradient(90deg,#34d399,#10b981)' }}
            aria-hidden
          />

          {steps.map((label, idx) => {
            const leftPct = (idx / Math.max(1, steps.length - 1)) * 100;
            const done = idx + 1 < phase || (idx + 1 === phase && phase === steps.length && phase > 1 && playerFuel >= requiredFuel);
            const active = idx + 1 === phase;
            return (
              <div
                key={label}
                style={{ left: `calc(${leftPct}% )` }}
                className="absolute transform -translate-x-1/2 flex flex-col items-center select-none"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 shadow-sm transition-transform duration-300 ${done ? 'bg-green-500 text-white border-green-600 scale-105' : active ? 'bg-white text-indigo-600 border-indigo-400 scale-105' : 'bg-white text-gray-700 border-gray-300'}`}>
                  <span className="text-sm">{done ? '✓' : idx + 1}</span>
                </div>
                <span className="text-xs mt-2 text-center w-28 truncate text-gray-600 dark:text-gray-300">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Auto-advance: when assembly is complete and correctly ordered, go to Fuel phase
  useEffect(() => {
    if (phase !== 1) return;
    if (assembledParts.length !== totalPartsRequired) return;
    const correct = assembledParts.every((p, i) => p.id === (correctlyOrderedParts[i]?.id));
    if (correct) {
      setPhase(2);
      setCurrentFact({ status: 'info', fact: t('facts', 'complete') } as FactData);
    }
  }, [assembledParts, phase, totalPartsRequired, correctlyOrderedParts, t]);

  // Auto-advance: when fuel is sufficient in phase 2, go to Launch phase
  useEffect(() => {
    if (phase !== 2) return;
    if (playerFuel >= requiredFuel) {
      setPhase(3);
    }
  }, [playerFuel, phase, requiredFuel]);

  const InfoDisplay: React.FC<{ factData: FactData | null }> = ({ factData }) => {
    if (!factData) {
      return (
        <div className={`p-4 md:p-6 ${tc.infoCardBg} rounded-xl h-full flex flex-col justify-center text-center shadow-lg overflow-auto`}>
          <p className={`text-lg font-inter ${tc.text}`} dangerouslySetInnerHTML={{ __html: t('dragForFact') }}/>
          <Sparkles className={`w-16 h-16 mx-auto mt-4 animate-spin ${tc.icon}`} />
        </div>
      );
    }

    let IconComponent, titleColor, iconColor, statusText;

    switch (factData.status) {
      case 'placed':
        IconComponent = CheckCircle;
        titleColor = 'text-green-400';
        iconColor = 'text-green-500';
        statusText = t('partStatus', 'placed');
        break;
      case 'removed': 
        IconComponent = MinusCircle;
        titleColor = 'text-red-400';
        iconColor = 'text-red-500';
        statusText = t('partStatus', 'removed');
        break;
      case 'reordered': 
        IconComponent = RotateCcw;
        titleColor = 'text-orange-400';
        iconColor = 'text-orange-500';
        statusText = t('partStatus', 'reordered');
        break;
      default: // Muestra el hecho de la pieza al hacer clic
        IconComponent = Atom;
        titleColor = 'text-blue-400';
        iconColor = 'text-blue-500';
        statusText = t('educationalDataTitle');
        break;
    }

    return (
      <div className={`p-4 md:p-6 ${tc.infoCardBg} rounded-xl h-full shadow-lg overflow-auto`}>
        <div className={`flex items-center mb-4 border-b pb-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
          <IconComponent className={`w-6 h-6 mr-2 ${iconColor}`} /> 
          <h3 className={`text-xl font-bold ${titleColor}`}>
            {factData.status === 'placed' || factData.status === 'removed' || factData.status === 'reordered' ? statusText : factData.name}
          </h3>
        </div>
        <p className={`mb-4 text-base italic leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} dangerouslySetInnerHTML={{ __html: factData.fact ?? '' }}/>
      </div>
    );
  };
  
  const FuelControl: React.FC = () => (
    <div className={`p-4 rounded-xl shadow-lg border-2 mt-4 ${tc.cardBg} ${theme === 'dark' ? 'border-red-700' : 'border-red-300'}`}>
        <h3 className={`text-xl font-bold mb-3 flex items-center ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
            <Fuel className="w-5 h-5 mr-2" /> {t('enterGas')} ({t('gasNeeded')}: {requiredFuel})
        </h3>
    <input
      type="number"
      value={playerFuel}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerFuel(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={isLaunched}
            min="0"
            max="9999"
            className={`w-full p-3 rounded-lg text-lg font-mono transition-all duration-300 
                ${isFuelSufficient ? 'border-green-500 focus:border-green-600' : 'border-red-500 focus:border-red-600'} 
                ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} 
                border-2 focus:ring-4 focus:ring-opacity-50`}
            placeholder={t('enterGas')}
        />
    <p className={`mt-2 text-xs font-semibold ${isFuelSufficient ? 'text-green-400' : 'text-red-400'}`}>
      {t('gasNeeded')}: **{requiredFuel}** {isFuelSufficient ? `(¡Carga óptima!)` : `(¡Faltan ${requiredFuel - playerFuel} unidades!)`}
    </p>
    </div>
  );
  
  const FuelFormulaCard: React.FC = () => (
  <div className={`p-4 rounded-xl shadow-lg border-2 mt-4 ${tc.cardBg} ${theme === 'dark' ? 'border-yellow-700' : 'border-yellow-300'}`}>
    <h3 className={`text-lg font-bold mb-3 flex items-center ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
      <Sigma className="w-5 h-5 mr-2" /> Fuel Formula (Inspired by Tsiolkovsky)
    </h3>
    <p className={`mb-2 text-sm ${tc.text}`}>The fuel required depends on the total mass of your rocket, the destination gravity, and the crew mass. Heavier rockets and higher gravity require more fuel.</p>

    <div className={`bg-gray-800 p-3 rounded-lg my-3 text-white overflow-x-auto`}>
      <pre className="whitespace-pre-wrap text-sm">{`U_{fuel} = \lceil (M_{\text{dry}} + M_{\text{crew}}) \times \frac{G_{\text{dest}}}{9.8} \times 15 \rceil`}</pre>
    </div>

  <p className={`text-xs ${tc.text}`}>M_dry: Dry mass (parts). M_crew: Crew mass. G_dest: Destination gravity.</p>

    <div className="mt-4 pt-2 border-t border-dashed border-gray-600">
      <h4 className="text-sm font-semibold text-indigo-400 mb-1">Masa de la Misión:</h4>
      <ul className={`text-xs ${tc.text} space-y-1`}>
    <li><span className="font-mono bg-indigo-900/50 p-1 rounded">Masa Seca (Piezas - M_seco):</span> {levelData.totalDryMass} Unidades</li>
    <li><span className="font-mono bg-indigo-900/50 p-1 rounded">Masa Tripulación (M_ast - {levelData.astronauts} Px):</span> {levelData.totalAstronautMass} Unidades</li>
    <li><span className="font-mono bg-indigo-900/50 p-1 rounded">Gravedad Destino (G_destino - {levelData.targetPlanet}):</span> {levelData.gravity} m/s²</li>
      </ul>
    </div>
  </div>
  );


  // --- RENDER PRINCIPAL ---

  return (
    <div className={`min-h-screen p-4 font-sans antialiased ${tc.bg} flex flex-col`}> 
      <style>
        {`
        .font-sans { font-family: 'Inter', sans-serif; }
        .text-shadow { text-shadow: 1px 1px 3px rgba(0,0,0,0.8); }
        .animate-pulse-slow { animation: pulse-slow 3s infinite; }
        @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        /* KaTeX styling (para que no parezca roto antes de renderizar) */
        .katex { font-size: 1.1em; }
        `}
      </style>
      
  <div className="w-full mx-auto flex-1 flex flex-col px-4 md:px-8">
        <header className={`text-center py-6 border-b mb-8 ${tc.border}`}>
            {/* Controles de Tema, Idioma y Score */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2 items-center">
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-full transition-colors duration-300 shadow-md ${theme === 'dark' ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                        title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Switch to Dark Mode'}
                    >
                        {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                    </button>

                    {/* Language selector: ES / EN / CA */}
                    <div className="flex items-center space-x-2">
                      {['en','fr','ca','es'].map(code => (
                        <button
                          key={code}
                          onClick={() => setLanguage(code)}
                          title={code.toUpperCase()}
                          aria-label={code.toUpperCase()}
                          aria-pressed={language === code}
                          className={`p-2 rounded-full transition-colors duration-300 shadow-md flex items-center justify-center w-9 h-9 ${language === code ? (theme === 'dark' ? 'bg-yellow-400 text-gray-900' : 'bg-indigo-600 text-white') : (theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800')}`}
                        >
                          <span className="text-sm font-bold">{code.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                </div>

                <div className={`flex items-center font-bold text-yellow-300 p-1 px-3 rounded-full shadow-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-700 text-yellow-200'}`}>
                    <Coins className="w-5 h-5 mr-1" /> {t('coins')}: {score}
                </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
                {t('title')} - {t('mission')} {levelData.level}
            </h1>
            <p className={`mt-2 text-lg flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 ${tc.text}`}>
                <span>{t('objective')}: **{levelData.name}**. {levelData.description}</span>
            </p>
        </header>
        
        {/* Componente de Astronauta/Clima */}
    <div className="mb-6">
      <AstronautInfo launchLocation={launchLocation} />
        </div>
        
        {/* Barra de Progreso de la Misión */}
    <MissionProgress 
      partsCount={assembledParts.length} 
      totalParts={totalPartsRequired} 
      fuelLoaded={playerFuel}
      fuelRequired={requiredFuel}
      themeClasses={themeClasses}
      theme={theme}
      t={t}
      levelData={levelData}
  phase={phase}
      launchLocation={launchLocation}
      setLaunchLocation={setLaunchLocation}
    />


  <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
          
          {/* Columna 1: Panel de Partes (Draggable) */}
          <div className={`lg:col-span-1 p-4 rounded-2xl shadow-2xl h-full ${tc.cardBg}`}>
            <h2 className={`text-2xl font-bold mb-4 text-indigo-400 border-b pb-2 ${tc.border}`}>
              {t('partsPanelTitle')} {levelData.level}
            </h2>
            {/* Parts panel: level 1 should be 2x2 and show larger images; other levels adapt */}
            {levelData.level === 1 ? (
              <div className="grid grid-cols-2 gap-4">
                {levelData.requiredParts.map((part, idx) => {
                  const imgSrc = getImageForPart(part, idx);
                  return imgSrc ? (
                    <img
                      key={part.id}
                      data-part-img={part.id}
                      src={imgSrc}
                      alt={part.name || part.name_es}
                      draggable={!assembledParts.find(p => p.id === part.id) && !isLaunched}
                      onDragStart={(e) => handleDragStart(e as any, part.id)}
                      onClick={() => setCurrentFact(part)}
                      className={`w-full object-contain ${assembledParts.find(p => p.id === part.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-grab hover:scale-105'}`}
                      style={{ height: 180 }}
                    />
                  ) : (
                    <div key={part.id} className="w-full h-36 flex items-center justify-center bg-gray-100 rounded-lg">
                      <span>{part.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4`}> 
                {levelData.requiredParts.map((part, idx) => {
                  const imgSrc = getImageForPart(part, idx);
                  return imgSrc ? (
                    <img
                      key={part.id}
                      data-part-img={part.id}
                      src={imgSrc}
                      alt={part.name || part.name_es}
                      draggable={!assembledParts.find(p => p.id === part.id) && !isLaunched}
                      onDragStart={(e) => handleDragStart(e as any, part.id)}
                      onClick={() => setCurrentFact(part)}
                      className={`w-full object-contain ${assembledParts.find(p => p.id === part.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-grab hover:scale-105'}`}
                      style={{ height: 120 }}
                    />
                  ) : (
                    <div key={part.id} className="w-full h-28 flex items-center justify-center bg-gray-100 rounded-lg">
                      <span>{part.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columna 2: Área de Ensamblaje, Combustible y Controles (Drop Area) */}
          <div className="lg:col-span-1 flex flex-col space-y-4 h-full">
            <h2 className={`text-2xl font-bold text-center text-blue-400 border-b pb-2 ${tc.border}`}>
              {t('assemblyTitle')} {levelData.target}
            </h2>

            {/* Phase progress handled above MissionProgress */}
            <div className="flex-1 min-h-0">
              <RocketDisplay parts={assembledParts} />
            </div>
            
            {/* Control de Combustible - only in phase 2 */}
            {phase === 2 && (
              <>
                <FuelControl />
                {/* Panel de Fórmula - moved to only show in Fuel phase */}
                <FuelFormulaCard />
              </>
            )}
            
            {/* Botones de Control */}
            <div className="flex justify-center mt-6 space-x-4">
                {assembledParts.length > 0 && !isLaunched && (
                    <button
                        onClick={handleRemoveLastPart}
                        className="p-3 bg-yellow-600 hover:bg-yellow-700 text-gray-900 font-bold rounded-full text-md shadow-lg transition transform hover:scale-[1.03] flex items-center"
                    >
                        <MinusCircle className="w-5 h-5 mr-2" /> {t('undo')}
                    </button>
                )}
                
                {phase === 3 ? (
                  // Launch phase
                  isLaunched ? (
                    // After launch: show nextLevel if success else reattempt
                    launchMessage.success && currentLevel < GAME_LEVELS.length ? (
                      <button
                        onClick={() => resetGame(true)}
                        className="p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-lg shadow-lg transition transform hover:scale-[1.03] flex items-center"
                      >
                        <Play className="w-6 h-6 mr-2" /> {t('nextLevel')}
                      </button>
                    ) : (
                      <button
                        onClick={() => resetGame(false)}
                        className="p-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-lg shadow-lg transition transform hover:scale-[1.03] flex items-center"
                      >
                        <RotateCcw className="w-6 h-6 mr-2" /> {t('reattempt')}
                      </button>
                    )
                  ) : (
                    // Not launched yet: allow launch if ready
                    <button
                      onClick={handleLaunch}
                      disabled={!(isAssemblyComplete && playerFuel > 0)}
                      className={`p-4 font-bold rounded-full text-xl shadow-2xl transition duration-300 transform flex items-center ${ (isAssemblyComplete && playerFuel > 0) ? 'bg-green-500 hover:bg-green-600 text-gray-900 hover:scale-[1.05]' : 'bg-gray-600 text-gray-400 cursor-not-allowed' }`}
                    >
                      <Rocket className="w-6 h-6 mr-2" /> {isAssemblyComplete ? t('launch') : t('missingParts')}
                    </button>
                  )
                ) : (
                  // Not in launch phase: show disabled launch button as placeholder
                  <button className="p-4 font-bold rounded-full text-xl shadow-2xl bg-gray-500 text-gray-200 cursor-not-allowed" disabled>
                    <Rocket className="w-6 h-6 mr-2" /> {t('launch')}
                  </button>
                )}
            </div>

      {/* Phase navigation removed: auto-advances when assembly/fuel conditions are met */}

            {/* Mensaje de Lanzamiento (Resultado) */}
            {launchMessage.text && (
                <div className={`mt-4 p-4 rounded-xl font-semibold text-center shadow-inner 
                    ${launchMessage.success 
                        ? 'bg-green-900/70 border-2 border-green-500 text-green-200' 
                        : 'bg-red-900/70 border-2 border-red-500 text-red-200'}`}
                >
                    {launchMessage.text}
                </div>
            )}
          </div>

          {/* Columna 3: Información Educativa */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <h2 className={`text-2xl font-bold mb-4 text-pink-400 border-b pb-2 ${tc.border}`}>
              {t('educationalDataTitle')}
            </h2>
            <div className="flex-1 min-h-0">
              <InfoDisplay factData={currentFact} />
            </div>
          </div>
          
        </main>
      </div>
    </div>
  );
};

export default App;
