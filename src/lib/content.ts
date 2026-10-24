// All copy for the site. A figure legend pairs each reference numeral drawn in
// the figure with the name of the part; both highlight each other on hover.

import type { FigureName } from './scenes';

export const links = {
  email: 'fenilramoliya2103@gmail.com',
  x: 'https://x.com/fenillramoliya',
  github: 'https://github.com/fenil210',
  linkedin: 'https://in.linkedin.com/in/fenilramoliya210',
  scholar: 'https://scholar.google.com/citations?user=WZt_Xe8AAAAJ&hl=en',
};

export type Legend = [string, string][];

export const hero = {
  title: ['Fenil Ramoliya', 'builds AI agents and the systems they run on.'],
  lede:
    'I work on every layer of that: the harness and runtime around the model, the tools and protocols agents act through, and the infrastructure that keeps them fast, affordable and correct under real traffic. I do it at Cactus Communications, mostly on Paperpal, for an academic world I first knew as a researcher.',
  legend: [
    ['10', 'Orchestrator'],
    ['12', 'Sub-agents'],
    ['20', 'Tool layer'],
    ['22', 'Retrieval index'],
    ['30', 'Compute'],
    ['40', 'Request'],
    ['50', 'Model'],
  ] as Legend,
};

export interface System {
  id: string;
  fig: FigureName;
  figNo: string;
  legend: Legend;
  name: string;
  body: string;
  inside: string[];
  stack: string;
}

export const systems: System[] = [
  {
    id: 'runtime',
    fig: 'runtime',
    figNo: '2',
    name: 'Agent harnesses and runtimes',
    body:
      'The harness decides what the model sees, which tools it may use, where its state lives, and what happens when a run stops for an approval and resumes an hour later on another machine. I have worked on that layer for assistants that carry multi-step work through to the end, from proof of concept to a phased production rollout.',
    inside: [
      'Planning and delegation: a supervisor breaks work into steps and hands them to sub-agents, each with scoped context and tools.',
      'Durable execution. Every step is checkpointed, so a run survives interrupts, crashes and deploys.',
      'Human approval modelled as a state of the run, not an instruction in a prompt.',
      'Context engineering: what to load, what to compact and what to drop as a run grows.',
      'Streaming APIs kept apart from the workers that do the long tasks.',
      'Sandboxed code execution for analysis and generated files.',
    ],
    stack: 'LangGraph · Deep Agents · FastAPI · Postgres',
    legend: [
      ['60', 'Context'],
      ['61', 'Plan'],
      ['62', 'Supervisor'],
      ['64', 'Sub-agents'],
      ['66', 'Streamed output'],
      ['68', 'Sandbox'],
      ['69', 'Checkpoints'],
    ],
  },
  {
    id: 'fan-out',
    fig: 'fanout',
    figNo: '3',
    name: 'Multi-agent architecture',
    body:
      'Some problems need several kinds of expert judgement on the same input. The architecture I have worked on gives each kind its own specialist agent, runs them concurrently under one orchestrator, and reconciles their typed results into a single structured output. The real design work is at the boundaries: what each agent may see, how its output is validated, which model each role warrants, and how cost and latency are budgeted across a run.',
    inside: [
      'Fan-out and fan-in under one orchestrator, so a run takes as long as its slowest specialist, not the sum of all of them.',
      'Typed, validated contracts between agents. Nothing downstream parses prose.',
      'Model routing per role, sized to the job instead of the largest model everywhere.',
      'Cache-aware prompt layout, with cost accounting that counts cache discounts.',
      'Tracing across every agent and tool call in a run.',
    ],
    stack: 'async Python · Pydantic · structured outputs · Langfuse',
    legend: [
      ['70', 'Input'],
      ['72', 'Orchestrator'],
      ['74', 'Specialist agents'],
      ['76', 'Structured output'],
    ],
  },
  {
    id: 'mcp',
    fig: 'protocol',
    figNo: '4',
    name: 'MCP servers',
    body:
      'Model Context Protocol servers that put real services within reach of AI assistants, published on the Anthropic and OpenAI app marketplaces. The interesting problems are the ones demos skip: identity, large files, and tools that take minutes rather than seconds.',
    inside: [
      'A small, deliberate tool surface, designed around how models actually call tools.',
      'Large files go straight to object storage through presigned URLs, never through the model.',
      'Results rendered as interactive UI resources that follow the host’s theme.',
      'OAuth 2.0, with every token verified against an identity provider.',
      'Asynchronous jobs for long-running tools, with a status the model can poll.',
    ],
    stack: 'TypeScript · MCP SDK · OAuth 2.0 · React',
    legend: [
      ['80', 'Assistant'],
      ['81', 'Authenticated connection'],
      ['82', 'Server'],
      ['84', 'Tools'],
      ['86', 'UI resource'],
      ['88', 'Job status'],
    ],
  },
  {
    id: 'batch',
    fig: 'batch',
    figNo: '5',
    name: 'Batch LLM pipelines',
    body:
      'Not every model call has a person waiting on it. Some work is thousands of items scored, labelled or extracted in one run. The pipelines I have worked on are built to be cheap to run, safe to interrupt and easy to audit.',
    inside: [
      'Jobs submitted through an API, with inputs and results kept in object storage.',
      'A queue feeding containerised workers that scale with its depth, and to zero between runs.',
      'A larger model where judgement matters, a smaller one for retries and easy cases.',
      'Per-item checkpoints, so an interrupted run resumes instead of starting over.',
      'A written rationale with every output, so any result can be checked.',
    ],
    stack: 'Python · AWS · queues · containers',
    legend: [
      ['90', 'Input batch'],
      ['92', 'Queue'],
      ['94', 'Workers'],
      ['96', 'Outputs with rationale'],
      ['98', 'Checkpoints'],
    ],
  },
  {
    id: 'platform',
    fig: 'gateway',
    figNo: '6',
    name: 'Model platform',
    body:
      'One interface to every model the products use: frontier models across Anthropic, OpenAI, Google and Bedrock, and in-house small and fine-tuned models served alongside them. Text and image, sync, async, streaming and batch. Configuration, fallbacks and staged rollouts live in one place, so a model change ships like any other release, measured. It serves about 1.2 million requests on an average day, which is also why it is where cost is won or lost.',
    inside: [
      'Caching audited per request, because a cache that looks enabled is not the same as one that hits.',
      'Prompts ordered so the stable, cacheable part always comes first.',
      'Batch APIs for work that can wait, real time only where someone is waiting.',
      'Throughput work: workload identity, rate limits, and concurrency that queues bursts instead of failing them.',
    ],
    stack: 'Python · Anthropic · OpenAI · Gemini · Bedrock',
    legend: [
      ['100', 'Gateway'],
      ['102', 'Prompt cache'],
      ['104', 'Frontier and in-house models'],
      ['106', 'Fallback'],
      ['108', 'Rollout split'],
    ],
  },
];

// what holds for anything built for researchers; shown under the systems
export const principles = [
  { name: 'The author stays the author.', text: 'Models suggest, explain and check. Every change is visible and reversible.' },
  { name: 'Unpublished work is confidential.', text: 'A draft gets the least access, the shortest retention and no reuse.' },
  { name: 'References must be real.', text: 'Every citation is checked against scholarly records before anyone sees it.' },
];

export const projects = [
  {
    name: 'Whorl',
    text: 'Offline file conversion from the Mac menu bar. Drag a file, pick a format, done. Its own DOCX reader and writer, PDFKit and Vision OCR, 133 tests.',
    year: '2026',
    href: 'https://github.com/fenil210-cactus/whorl',
  },
  {
    name: 'Refill',
    text: 'Turns Codex and Claude Code usage-limit resets into Apple Reminders, so your Mac, iPhone and Watch tell you when you can work again.',
    year: '2026',
    href: 'https://github.com/fenil210-cactus/refill',
  },
  {
    name: 'mcp-doctor',
    text: 'Local-first diagnostics for MCP servers and coding-agent plugin setups. On PyPI as agent-plugin-diagnostics.',
    year: '2026',
    href: 'https://github.com/fenil210/mcp-doctor',
  },
  {
    name: 'shipshape-skills',
    text: 'Portable skills for coding assistants, written once and usable across tools.',
    year: '2026',
    href: 'https://github.com/fenil210-cactus/shipshape-skills',
  },
  {
    name: 'MemoraAI',
    text: 'Graph-native long-term memory for agents: entity extraction, temporal context and graph retrieval on Neo4j.',
    year: '2025',
    href: 'https://github.com/fenil210/MemoraAI',
  },
  {
    name: 'Database-MCP',
    text: 'An MCP server that connects any SQL database to an agent, with schema inspection and read-only queries.',
    year: '2025',
    href: 'https://github.com/fenil210/Database-MCP',
  },
  {
    name: 'IntelliMarket',
    text: 'Multi-agent equity research, with financial, technical and market analysts working the same question.',
    year: '2025',
    href: 'https://github.com/fenil210/IntelliMarket',
  },
  {
    name: 'AiReS',
    text: 'Chat with scientific documents across PDF, DOCX, PPTX and LaTeX. Overall first prize at MINeD’24.',
    year: '2024',
    href: 'https://github.com/fenil210/AiReS',
  },
];

const x = (id: string) => `https://x.com/fenillramoliya/status/${id}`;

export const writing = [
  {
    date: '2026-10-21',
    title: 'Bugs Aren’t the Boogeyman Anymore',
    href: x('2112819727202734364'),
  },
  {
    date: '2026-10-12',
    title: 'How I Got Codex to Orchestrate 50+ Subagent Runs',
    href: x('2109584843168178639'),
  },
  {
    date: '2026-10-05',
    title: 'Context Shouldn’t Be Append-Only',
    href: x('2107182475399283159'),
  },
  {
    date: '2026-10-04',
    title: 'Stop Calling Everything an Agent Framework',
    href: x('2106641321599410667'),
  },
  {
    date: '2026-05-09',
    title: 'Tokens, Embeddings and Context Windows',
    href: x('2053047398075924769'),
  },
  {
    date: '2026-05-01',
    title: 'The Nine Dials',
    href: x('2050197954863255892'),
  },
  {
    date: '2026-04-25',
    title: 'Vocabulary as a Design Primitive',
    href: x('2047996494146687354'),
  },
  {
    date: '2026-04-18',
    title: 'Workflow, Agent, or Multi Agent? Pick One',
    href: x('2045422362578100362'),
  },
  {
    date: '2026-04-12',
    title: 'Field Notes: AI Engineering',
    href: x('2043286966385684694'),
  },
  {
    date: '2026-04-09',
    title: 'The Builder Who Teaches. The Teacher Who Builds.',
    href: x('2042327764829946196'),
  },
];

type Theme = 'private' | 'explainable' | 'secure' | 'applied';

export const themes: { id: Theme; name: string }[] = [
  { id: 'private', name: 'Federated learning and privacy' },
  { id: 'explainable', name: 'Explainable AI' },
  { id: 'secure', name: 'Security for connected systems' },
  { id: 'applied', name: 'Applied and efficient deep learning' },
];

export const years = [2023, 2024, 2025, 2026];

// every peer-reviewed paper; j = journal article, first = first author
export const papers: { t: string; v: string; y: number; th: Theme; j?: true; first?: true }[] = [
  { t: 'HyDiT: Heterogeneous Multi-Teacher Knowledge Distillation for Compressing Vision Transformers in Autonomous Electric Vehicles', v: 'Journal of Circuits, Systems and Computers', y: 2026, th: 'applied', j: true },
  { t: 'F-Transformer: a federated transformer for efficient and privacy-preserving sequence generation', v: 'Scientific Reports', y: 2026, th: 'private', j: true },
  { t: 'MetaPrism: Intelligent Personalized Engagement Policy for User’s Security and Privacy in Metaverse Environment', v: 'Security and Privacy', y: 2025, th: 'secure', j: true },
  { t: 'Blockchain-assisted healthcare insurance fraud detection framework using ensemble learning', v: 'Computers and Electrical Engineering', y: 2025, th: 'secure', j: true },
  { t: 'Explainable AI for gastrointestinal disease diagnosis in telesurgery Healthcare 4.0', v: 'Computers and Electrical Engineering', y: 2024, th: 'explainable', j: true },
  { t: 'ML-Based Energy Consumption and Distribution Framework Analysis for EVs and Charging Stations in Smart Grid Environment', v: 'IEEE Access', y: 2024, th: 'applied', j: true, first: true },
  { t: 'Towards Privacy-Preserving and Explainable AI for Parkinson’s Disease Diagnosis Using Federated Learning on MRI Data', v: 'Workshop on Intelligent Immersification in the Metaverse', y: 2025, th: 'private' },
  { t: 'Explainable Ensemble Learning-Based Robust Intrusion Detection Framework for Power Systems', v: 'IEEE R10-HTC', y: 2025, th: 'secure' },
  { t: 'AI-enabled Framework for Intrusion Detection in DNP3-Enabled Smart Critical Infrastructures', v: 'IEEE IPRIA', y: 2025, th: 'secure' },
  { t: 'Securing IoT-enabled Metaverse with Authentication and Threat Classification Framework Using DL', v: 'IEEE ISACC', y: 2025, th: 'secure' },
  { t: 'Hybrid Explainable DL Framework for Securing Smart Critical Infrastructure Using CNN-LSTM', v: 'IEEE IC3ECSBHI', y: 2025, th: 'secure' },
  { t: 'Explainable FL-Based Framework for Diagnosis of Diabetic Retinopathy in Healthcare 4.0 Environment', v: 'IEEE ICSPIS', y: 2024, th: 'private' },
  { t: 'SDN-care: Deep Learning-assisted Software Defined Networking Framework for IoT-Healthcare', v: 'IEEE GLOBECOM', y: 2024, th: 'secure' },
  { t: 'XSH-ParK: XAI-based Parkinson Disease Diagnosis Framework for Smart Healthcare Using MRI Images', v: 'IEEE GLOBECOM', y: 2024, th: 'explainable' },
  { t: 'EL-FAM: Power System Intrusion Detection with Ensemble Learning for False Alarm Mitigation', v: 'IEEE CITS', y: 2024, th: 'secure' },
  { t: 'Smart-Sec: DL-based Cyber Threat Detection for Autonomous Smart Home System to Enhance Human Life Expectancy', v: 'IEEE CONECCT', y: 2024, th: 'secure' },
  { t: 'X-CaD: Explainable AI for Skin Cancer Diagnosis in Healthcare 4.0 Telesurgery', v: 'IEEE ICC', y: 2024, th: 'explainable', first: true },
  { t: 'X-NET: Explainable AI-Based Network Data Security Framework for Healthcare 4.0', v: 'IEEE ICC Workshops', y: 2024, th: 'explainable' },
  { t: 'Deep Learning-based Intrusion Detection Approach for Autonomous Electric Vehicles', v: 'IEEE ICC Workshops', y: 2024, th: 'secure', first: true },
  { t: 'TL-AGRO: Transfer Learning-based Perilous Insect Detection Framework for Smart Agriculture Underlying Edge Computing', v: 'IEEE CONIT', y: 2024, th: 'applied', first: true },
  { t: 'A Green IoT-Integrated AI-Based EV Scheduling Scheme for Efficient Charging Station Selection', v: 'IEEE IWCMC', y: 2024, th: 'applied', first: true },
  { t: 'FAST: AI-based Network Traffic Analysis and Load Balancing Framework Underlying SDN Clusters', v: 'IEEE SCIoT', y: 2024, th: 'applied' },
  { t: 'Ensemble Learning for Network Data Classification with SDN Clustering Underlying Smart Power Grid-Enabled Smart Cities', v: 'IEEE ICPEICES', y: 2024, th: 'applied' },
  { t: 'DNN-based Secure Remote Patient Data Analysis Framework for Improving Human Life Expectancy in Healthcare 4.0', v: 'Procedia Computer Science', y: 2024, th: 'secure' },
  { t: 'SEAM: Deep Learning-based Secure Message Exchange Framework for Autonomous EVs', v: 'IEEE GLOBECOM Workshops', y: 2023, th: 'secure', first: true },
  { t: 'Transfer Learning and CNN-Based Vehicle Identification Approach for Hit-and-Run Cases', v: 'IEEE AECE', y: 2023, th: 'applied' },
  { t: 'Deep and Transfer Learning-based Research Article Recommendation System for Healthcare Services', v: 'IEEE ICI', y: 2023, th: 'applied' },
  { t: 'DL-Based Secure Wearable Scheme for Remote Patient Data Monitoring in Healthcare 4.0', v: 'IEEE ICCCIS', y: 2023, th: 'secure', first: true },
];

export const research = {
  stats: [
    { value: '28', label: 'peer-reviewed papers' },
    { value: '6', label: 'journal articles' },
    { value: '191', label: 'citations' },
    { value: '7', label: 'h-index' },
  ],
  selected: [
    {
      title: 'F-Transformer: a federated transformer for efficient and privacy-preserving sequence generation',
      venue: 'Scientific Reports',
      year: '2026',
      cites: 22,
    },
    {
      title: 'Blockchain-assisted healthcare insurance fraud detection framework using ensemble learning',
      venue: 'Computers and Electrical Engineering',
      year: '2025',
      cites: 36,
    },
    {
      title: 'ML-based energy consumption and distribution framework analysis for EVs and charging stations in smart grid environment',
      venue: 'IEEE Access',
      year: '2024',
      cites: 34,
      first: true,
    },
    {
      title: 'Explainable AI for gastrointestinal disease diagnosis in telesurgery Healthcare 4.0',
      venue: 'Computers and Electrical Engineering',
      year: '2024',
      cites: 25,
    },
  ],
};

// newest first; from/to are fractional years (Jul 2026 = 2026.5), no `to` means it is still going
export interface Stint { role: string; where: string; when: string; from: number; to?: number; kind: 'job' | 'study' | 'pubs'; }
export const path: Stint[] = [
  { role: 'Software Engineer, AI', where: 'Cactus Communications · Paperpal', when: 'Jul 2026 – Present', from: 2026.5, kind: 'job' },
  { role: 'Software Engineer', where: 'Cactus Labs and Paperpal', when: 'Jul 2025 – Jun 2026', from: 2025.5, to: 2026.5, kind: 'job' },
  { role: 'Machine Learning Intern', where: 'Cactus Labs, Applied AI', when: 'Jan – Jun 2025', from: 2025, to: 2025.5, kind: 'job' },
  { role: 'Backend ML Intern', where: 'Cactus Labs and Paperpal', when: 'May – Jul 2024', from: 2024 + 4 / 12, to: 2024 + 7 / 12, kind: 'job' },
  { role: 'Research', where: '28 peer-reviewed papers', when: '2023 – 2026', from: 2023, to: 2027, kind: 'pubs' },
  { role: 'B.Tech, Computer Science and Engineering', where: 'Nirma University · CGPI 9.09 of 10', when: '2021 – 2025', from: 2021 + 7 / 12, to: 2025 + 5 / 12, kind: 'study' },
];

// in the order travelled; id is the ISO 3166 numeric code
export const travel = {
  countries: [
    { id: '231', name: 'Ethiopia', tz: 'Africa/Addis_Ababa' },
    { id: '710', name: 'South Africa', tz: 'Africa/Johannesburg' },
    { id: '792', name: 'Turkey', tz: 'Europe/Istanbul' },
    { id: '398', name: 'Kazakhstan', tz: 'Asia/Almaty' },
    { id: '372', name: 'Ireland', tz: 'Europe/Dublin' },
  ],
  continents: 3,
  // named as in the DataMeet boundaries; the map hatches these
  states: [
    'Arunachal Pradesh',
    'Assam',
    'Delhi',
    'Gujarat',
    'Himachal Pradesh',
    'Jammu & Kashmir',
    'Kerala',
    'Maharashtra',
    'Meghalaya',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
  ],
};

export const recognition = [
  { what: 'Rising Star of the Year', where: 'Cactus Communications, FY 2025–26' },
  { what: 'Overall first prize, MINeD’24', where: 'and second in the Cactus Communications track, for AiReS' },
  { what: 'IEEE ComSoc student travel grants', where: 'IEEE ICC 2024, Denver · IEEE GLOBECOM 2024, Cape Town' },
  { what: 'Co-host, OpenAI Codex community events', where: 'Developer meetup and hackathon, Mumbai, 2026' },
  { what: 'Mentor and judge', where: 'HackaMINeD 2025 and 2026' },
  { what: 'Reviewer', where: 'IEEE Access, IEEE GLOBECOM 2023 and 2024' },
];
