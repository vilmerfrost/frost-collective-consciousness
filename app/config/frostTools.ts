export type FrostTool = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  external?: boolean;
  badge?: string;
};

export const frostTools: FrostTool[] = [
  {
    id: "fcc",
    name: "Frost Collective Consciousness",
    tagline: "Deep multi-agent reasoning for Frost",
    description: "Run structured FCC analyses and action plans for Frost Solutions, payroll, KMA, finance and internal tools.",
    href: "/fcc",
    external: false,
    badge: "Brain",
  },
  {
    id: "study-os",
    name: "Frost Study OS",
    tagline: "Your personal learning brain",
    description: "Open the personal Study OS for yearly plan, phases, deep dives and daily focus.",
    href: "http://localhost:3000/", // TODO: Replace with actual Study OS URL
    external: true,
    badge: "Personal",
  },
  {
    id: "prompt-architect",
    name: "Prompt Architect Mode",
    tagline: "Design prompts & AI workflows",
    description: "Design, test and version advanced prompts and pipelines for Frost apps and Night Factory.",
    href: "http://localhost:3003", // TODO: Replace with actual Prompt Architect URL
    external: true,
    badge: "Builder",
  },
  {
    id: "semantic-modeler",
    name: "Frost SemanticModeler",
    tagline: "Structure concepts & domains",
    description: "Map projects, entities and relationships into a clear semantic model for AI and humans.",
    href: "http://localhost:3004/", // TODO: Replace with actual SemanticModeler URL
    external: true,
    badge: "Knowledge",
  },
  {
    id: "frost-solutions",
    name: "Frost Solutions",
    tagline: "Core app for construction teams",
    description: "Open the main Frost Solutions product (time reporting, payroll, future KMA & finance modules).",
    href: "http://localhost:3002/", // TODO: Replace with actual Frost Solutions URL
    external: true,
    badge: "Product",
  },
];

