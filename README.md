# translator-graph-view

A React TypeScript component library for interactive knowledge graph visualization, designed for use with the NIH's [Biomedical Data Translator](https://ncats.nih.gov/research/research-activities/biomedical-data-translator). Built on [ReactFlow](https://reactflow.dev/) (via `@xyflow/react`) and [ELKjs](https://www.eclipse.org/elk/).

Renders [Biolink Model](https://biolink.github.io/biolink-model/) knowledge graphs with automatic layout, type-based color coding and icons, interactive selection, and hover geometry for tooltip positioning.

## Features

- **Interactive graph visualization** — pan, zoom, box-select, and click interactions powered by ReactFlow
- **Five automatic layout algorithms** — hierarchical (top-down and left-right), force-directed, grid, and radial, all computed off-thread via an ELK web worker
- **Biolink type awareness** — nodes are color-coded by their Biolink type and display dedicated SVG icons for 13 common entity types (Drug, Gene, Disease, Protein, ChemicalEntity, SmallMolecule, AnatomicalEntity, BiologicalEntity, PhenotypicFeature, PathologicalProcess, PhysiologicalProcess, Polypeptide, and a default fallback)
- **Controlled and uncontrolled selection** — click or box-drag to select; optionally drive selection from outside via `selectedIds`
- **Controlled and uncontrolled hover** — built-in hover styles plus bidirectional controlled hover for syncing graph highlights with external UI (sidebars, lists, detail panels)
- **Hover geometry with anchor points** — callbacks receive bounding rects and pre-computed anchor positions in viewport coordinates, re-measured on pan/zoom via `requestAnimationFrame`, ideal for tooltip positioning
- **Multi-edge rendering** — parallel edges between the same node pair automatically spread into distinct quadratic bezier curves with configurable spacing
- **Inferred edge styling** — edges marked `inferred: true` render with a dashed stroke
- **Predicate labels** — edge labels extracted from Biolink predicates with optional show/hide
- **Edge path styles** — bezier, straight, step, and smoothstep path options
- **MiniMap and zoom controls** — zoomable/pannable minimap with neutral node dots
- **Draggable graph annotations** — parent-controlled text notes with editable content, hover delete controls, configurable styling, and savable graph-space positions
- **Smart text formatting** — gene/protein names uppercased, other names title-cased, Roman numerals detected and preserved
- **Full TypeScript type definitions** — complete generics for nodes, edges, selections, geometry, and all props
- **Dual module output** — ESM and CommonJS builds with a separate CSS stylesheet

## How It Works

### Architecture

The library exports a single primary component (`GraphView`) that wraps ReactFlow in a `ReactFlowProvider` and a settings context. Internally it:

1. **Transforms input data** — converts the Biolink-model `GraphData` (a record-based format with `nodes` and `edges` keyed by ID) into ReactFlow's flat node/edge arrays. During transformation, each node is assigned a deterministic color via a hash of its primary Biolink type, a display label (first name), a simplified type string, and an SVG icon. Edges sharing the same node pair are indexed so the renderer can offset them.

2. **Computes layout via web worker** — the `useGraphLayout` hook instantiates an ELK instance pointing at a user-provided worker URL. It builds an ELK graph descriptor with the chosen layout algorithm's options, sends it to the worker, and applies the returned positions to the ReactFlow nodes. Layout is recomputed whenever the data or layout type changes, with stale-cancellation to avoid race conditions.

3. **Syncs layout to ReactFlow state** — the `useLayoutSync` hook pushes layouted nodes/edges into ReactFlow's controlled state and triggers `fitView` with a short delay so the viewport frames the graph.

4. **Handles selection** — the `useSelection` hook translates ReactFlow's `OnSelectionChangeParams` back into domain-level `GraphNode[]` and `GraphEdge[]` objects. The optional `useControlledSelection` hook allows the parent to drive selection from the outside by toggling `selected` flags on the flow nodes/edges.

5. **Handles hover with geometry** — the `useHoverGeometry` hook tracks which node or edge the pointer is over, queries the DOM for its bounding rect (scoped to the current `GraphView` instance to avoid cross-graph collisions), computes a named anchor point, and invokes the caller's `onNodeHover`/`onEdgeHover` with the geometry. On viewport pan/zoom, geometry is re-measured via `requestAnimationFrame` so tooltip positions stay accurate.

6. **Renders custom node and edge components** — `GraphNode` displays the type icon, a formatted label, and top/bottom handles, with color driven by a CSS custom property. `GraphEdge` supports four path algorithms plus a multi-edge quadratic bezier mode, dashed stroke for inferred edges, and a floating label rendered via ReactFlow's `EdgeLabelRenderer`.

### Layout Algorithms

All layout is performed by ELK in a web worker (~1.5 MB engine kept out of the main bundle):

| Layout | ELK Algorithm | Description |
|--------|---------------|-------------|
| `hierarchical` | `layered` (DOWN) | Layered top-to-bottom with 80px node spacing and 100px inter-layer spacing |
| `hierarchicalLR` | `layered` (RIGHT) | Layered left-to-right |
| `force` | `force` (Eades model) | Force-directed with 400 iterations |
| `grid` | `box` | Aspect-ratio-aware box packing |
| `radial` | `stress` | Stress-minimization producing radial/circular layouts |

### Data Flow

```
GraphData (Biolink model)
  │
  ├─ transformNodesToFlow() → FlowNode[] (with color, label, icon, type)
  ├─ transformEdgesToFlow() → FlowEdge[] (with pair indexing, labels)
  │
  └─ useGraphLayout() → ELK worker → positioned FlowNode[]
       │
       └─ useLayoutSync() → ReactFlow state → rendered graph
```

## Installation

```bash
npm install translator-graph-view elkjs
```

React 18+ (or 19+) and `elkjs` 0.9+ are required as peer dependencies.

## Usage

```tsx
import { GraphView } from 'translator-graph-view';
import 'translator-graph-view/styles.css';

const data = {
  nodes: {
    'n1': { id: 'n1', names: ['Aspirin'], types: ['biolink:Drug'] },
    'n2': { id: 'n2', names: ['Headache'], types: ['biolink:Disease'] },
  },
  edges: {
    'e1': { id: 'e1', subject: 'n1', object: 'n2', predicate: 'biolink:treats' },
  },
};

const elkWorkerUrl = new URL('elkjs/lib/elk-worker.min.js', import.meta.url).href;

function App() {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <GraphView
        data={data}
        layout="hierarchical"
        elkWorkerUrl={elkWorkerUrl}
        onNodeClick={(node) => console.log('Clicked:', node)}
        onSelectionChange={(selection) => console.log('Selected:', selection)}
      />
    </div>
  );
}
```

The `GraphView` container must have a defined width and height.

## API

### `<GraphView />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `GraphData` | required | Graph nodes and edges |
| `elkWorkerUrl` | `string` | required | URL to the ELKjs web worker script (see below) |
| `layout` | `LayoutType` | `'hierarchical'` | Layout algorithm |
| `onSelectionChange` | `(selection: Selection) => void` | - | Fires when selection changes |
| `onNodeClick` | `(node: GraphNode) => void` | - | Fires when a node is clicked |
| `onEdgeClick` | `(edge: GraphEdge) => void` | - | Fires when an edge is clicked |
| `onNodeHover` | `(node: GraphNode \| null, geometry: HoverGeometry \| null) => void` | - | Fires when a node is hovered or unhovered |
| `onEdgeHover` | `(edge: GraphEdge \| null, geometry: HoverGeometry \| null) => void` | - | Fires when an edge is hovered or unhovered |
| `hoveredNodeId` | `string \| null` | - | Controlled hover: highlights the given node |
| `hoveredEdgeId` | `string \| null` | - | Controlled hover: highlights the given edge |
| `nodeHoverAnchor` | `HoverAnchorPosition` | `'topCenter'` | Anchor point returned in `HoverGeometry` for node hovers |
| `edgeHoverAnchor` | `HoverAnchorPosition` | `'midpoint'` | Anchor point returned in `HoverGeometry` for edge hovers |
| `selectedIds` | `string[]` | - | Controlled selection by node/edge ID |
| `edgeType` | `EdgeType` | `'straight'` | Edge path style: `'bezier'`, `'straight'`, `'step'`, or `'smoothstep'` |
| `showEdgeLabels` | `boolean` | `true` | Show predicate labels on edges |
| `showMiniMap` | `boolean` | `true` | Show the zoomable/pannable minimap |
| `multiEdgeSpacing` | `number` | `60` | Pixel spacing between parallel edges sharing the same node pair |
| `annotations` | `GraphAnnotation[]` | - | Controlled annotation overlays (positions in graph coordinates) |
| `onAnnotationsChange` | `(annotations: GraphAnnotation[]) => void` | - | Fires when an annotation is dragged, edited, or deleted |
| `annotationStyles` | `GraphAnnotationStyles` | - | Client-configurable annotation appearance (background, delete button, icons) |
| `className` | `string` | - | Additional CSS class for the container |

#### `elkWorkerUrl`

Layout computation is offloaded to a web worker, keeping the ~1.5 MB ELK engine out of your main bundle. You must provide a URL pointing to the ELK worker script. In Vite-based apps:

```ts
const elkWorkerUrl = new URL('elkjs/lib/elk-worker.min.js', import.meta.url).href;
```

For webpack or other bundlers, serve `node_modules/elkjs/lib/elk-worker.min.js` as a static asset and pass its URL.

### Annotations

Annotations are draggable text notes rendered on top of the graph. They are **parent-controlled**: the host application creates, persists, and restores them via the `annotations` prop. Positions are in **graph coordinates**, so they stay anchored as the user pans and zooms.

```tsx
import { useState } from 'react';
import { GraphView, type GraphAnnotation } from 'translator-graph-view';

function App() {
  const [annotations, setAnnotations] = useState<GraphAnnotation[]>([]);

  const addAnnotation = () =>
    setAnnotations((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: '', position: { x: 100, y: 100 } },
    ]);

  return (
    <>
      <button type="button" onClick={addAnnotation}>Add annotation</button>
      <GraphView
        data={data}
        elkWorkerUrl={elkWorkerUrl}
        annotations={annotations}
        onAnnotationsChange={setAnnotations}
        annotationStyles={{
          backgroundColor: '#FFF9C4',
          deleteButton: { backgroundColor: '#fff' },
        }}
      />
    </>
  );
}
```

Each annotation shows as an editable text box with a pale yellow background by default. On hover, a delete button appears in the top-left corner (white circle with an X icon by default). Override colors, CSS classes, and the delete icon via `annotationStyles`.

`onAnnotationsChange` fires when:
- the user finishes dragging an annotation (`onNodeDragStop`)
- the user edits text and blurs the textarea
- the user clicks the delete button

Persist the returned array (localStorage, API, etc.) and pass it back through `annotations` on reload.

### Interaction Model

The graph supports the following built-in interactions:

| Action | Behavior |
|--------|----------|
| Left-click node/edge | Select it |
| Shift+Click | Add to selection |
| Drag from empty area | Box selection (partial overlap) |
| Middle/right-button drag | Pan the viewport |
| Scroll | Zoom in/out (0.15x to 3x) |
| MiniMap drag | Pan the viewport |
| MiniMap scroll | Zoom |

### Hover

The component supports both **uncontrolled** hover (internal styling only) and **controlled** hover (you drive the highlight state from outside). Use controlled hover to synchronize highlights between the graph and an external UI like a sidebar or detail panel.

**Uncontrolled** — nodes and edges show hover styles on mouseover with no props needed.

**Outbound events** — use `onNodeHover` / `onEdgeHover` to react to hover changes:

```tsx
const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

<GraphView
  data={data}
  elkWorkerUrl={elkWorkerUrl}
  onNodeHover={(node) => setHoveredNode(node)}
/>

{hoveredNode && <div>Hovering: {hoveredNode.names[0]}</div>}
```

**Controlled (bidirectional)** — pass `hoveredNodeId` / `hoveredEdgeId` to drive highlights from external UI (e.g. a sidebar list), and use `onNodeHover` / `onEdgeHover` to update that state when the user hovers inside the graph:

```tsx
const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

// Sidebar list item triggers graph highlight
<li
  onMouseEnter={() => setHoveredNodeId(node.id)}
  onMouseLeave={() => setHoveredNodeId(null)}
>
  {node.names[0]}
</li>

// Graph triggers sidebar highlight
<GraphView
  data={data}
  elkWorkerUrl={elkWorkerUrl}
  hoveredNodeId={hoveredNodeId}
  onNodeHover={(node) => setHoveredNodeId(node?.id ?? null)}
/>
```

#### Hover geometry

The `onNodeHover` and `onEdgeHover` callbacks receive a second `HoverGeometry` argument containing the hovered element's bounding rect and a pre-computed anchor point in viewport coordinates — useful for positioning tooltips without querying the DOM yourself.

```tsx
import type { GraphNodeType, HoverGeometry } from 'translator-graph-view';

<GraphView
  data={data}
  elkWorkerUrl={elkWorkerUrl}
  nodeHoverAnchor="topCenter"
  onNodeHover={(node, geometry) => {
    if (node && geometry) {
      showTooltip({ x: geometry.anchor.x, y: geometry.anchor.y });
    } else {
      hideTooltip();
    }
  }}
/>
```

`HoverAnchorPosition` can be one of: `'topLeft'`, `'topCenter'`, `'topRight'`, `'centerLeft'`, `'center'`, `'centerRight'`, `'bottomLeft'`, `'bottomCenter'`, `'bottomRight'`, or `'midpoint'` (edges only — computes the true midpoint of the SVG path's visible segment).

When the hover callback fires with `null` (mouse leaves), `geometry` is also `null`. If DOM measurement fails (e.g. SSR), `geometry` is `null`.

While the pointer stays over the same node or edge, geometry is **re-measured on pan and zoom** (throttled with `requestAnimationFrame`) so anchors stay aligned with the viewport.

DOM queries are **scoped to this `GraphView` instance**, so multiple graphs on one page do not pick each other's elements. Element ids are escaped for attribute selectors (`CSS.escape` when available).

### Multi-edge rendering

When multiple edges connect the same pair of nodes (in either direction), they automatically spread into distinct quadratic bezier curves offset perpendicular to the straight-line path between the nodes. The label for each edge is positioned at the bezier's midpoint (t=0.5). Control the spacing with `multiEdgeSpacing` (default `60`px).

### Inferred edges

Edges with `inferred: true` in the data render with a dashed stroke to visually distinguish them from direct evidence edges.

### Layout types

- `'hierarchical'` — Layered top-to-bottom (default)
- `'hierarchicalLR'` — Layered left-to-right
- `'force'` — Force-directed (Eades model, 400 iterations)
- `'grid'` — Aspect-ratio-aware box packing
- `'radial'` — Stress-minimization (radial/circular)

### Node rendering

Each node displays:
- An **SVG icon** based on its primary Biolink type (13 dedicated icons plus a default)
- A **formatted label** — gene/protein names are uppercased; other names are title-cased with Roman numeral detection
- A **colored left border** derived deterministically from the type via a hash into an 18-color palette
- **Selection** and **hover** visual states (border/shadow changes)

### Data format

```ts
interface GraphData {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  results?: Result[];
  paths?: Record<string, Path>;
  publications?: Record<string, Publication>;
  trials?: Record<string, Trial>;
}

interface GraphNode {
  id: string;
  names: string[];
  types: string[];           // e.g. ['biolink:Drug']
  curies?: string[];
}

interface GraphEdge {
  id: string;
  subject: string;           // source node ID
  object: string;            // target node ID
  predicate: string;         // e.g. 'biolink:treats'
  predicate_url?: string;
  knowledge_level?: string;
  inferred?: boolean;        // renders with dashed stroke when true
  provenance?: Provenance[];
  publications?: { inferred?: Publication[] };
  trials?: Trial[];
  support?: unknown[];
  aras?: string[];
  description?: string;
}

interface Result {
  id: string;
  drug_name?: string;
  subject: string;
  object: string;
  paths?: string[];
}

interface Path {
  id: string;
  edges: string[];
}

interface Publication {
  id: string;
  title?: string;
  authors?: string[];
  year?: number;
  journal?: string;
  pmid?: string;
  doi?: string;
}

interface Trial {
  id: string;
  title?: string;
  status?: string;
  phase?: string;
  nctid?: string;
}

interface Provenance {
  source?: string;
  url?: string;
  evidence_type?: string;
}

interface GraphAnnotation {
  id: string;
  text: string;
  position: { x: number; y: number };
}

interface GraphAnnotationStyles {
  backgroundColor?: string;
  className?: string;
  deleteButton?: {
    backgroundColor?: string;
    className?: string;
    icon?: React.ReactNode;
  };
}
```

### Exported Hooks

- **`useGraphLayout({ nodes, edges, layout, elkWorkerUrl })`** — Computes ELK layout positions for ReactFlow nodes/edges via a web worker. Returns `{ nodes, edges, isLayouting }`.
- **`useSelection({ data, onSelectionChange })`** — Manages node/edge selection state, translating ReactFlow selection events back into domain-level objects.
- **`useGraphSettings()`** — Access the `GraphSettings` context (currently exposes `multiEdgeSpacing`).

### Exported Utilities

| Function | Description |
|----------|-------------|
| `transformNodesToFlow(data)` | Convert `GraphData` to ReactFlow node array with colors, labels, and types |
| `transformEdgesToFlow(data, edgeType?, showLabels?)` | Convert `GraphData` to ReactFlow edge array with pair indexing |
| `transformAnnotationsToFlow(annotations)` | Convert `GraphAnnotation[]` to ReactFlow annotation nodes |
| `extractAnnotationsFromFlow(nodes)` | Extract `GraphAnnotation[]` from a ReactFlow node array |
| `isAnnotationNode(node)` | Type guard for annotation flow nodes |
| `getColorForType(type)` | Get a deterministic color for a Biolink type string (18-color palette) |
| `simplifyTypeName(type)` | Extract a readable name from a prefixed type URI (`"biolink:Drug"` → `"Drug"`) |
| `getPrimaryType(types)` | Return the first type from a types array |
| `formatPredicate(predicate)` | Format a predicate for display (`"biolink:treats"` → `"treats"`) |
| `getNodesById(data, ids)` | Look up nodes by ID array |
| `getEdgesById(data, ids)` | Look up edges by ID array |
| `NODE_WIDTH` / `NODE_HEIGHT` | Default node dimensions used by the layout engine (180×60) |

### Exported Types

All TypeScript types are exported for consumer use:

`GraphData`, `GraphNodeType`, `GraphEdgeType`, `GraphViewProps`, `LayoutType`, `EdgeType`, `Selection`, `Result`, `Path`, `Publication`, `Trial`, `Provenance`, `GraphNodeData`, `GraphEdgeData`, `FlowNode`, `FlowGraphNode`, `FlowAnnotationNode`, `FlowEdge`, `HoverAnchorPosition`, `HoverGeometry`, `GraphAnnotation`, `GraphAnnotationStyles`

## Development

```bash
npm install
npm run dev          # Start Vite dev server with example app
npm run build        # Build the library (ESM + CJS + types + CSS)
npm run typecheck    # Type-check without emitting
npm run lint         # Run ESLint
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run Playwright end-to-end tests
npm run test:e2e:ui  # Run Playwright tests with UI
```

### Example App

The `example/` directory contains a full demo application that showcases all library features:
- Dataset switching (small, medium, large graphs)
- All five layout algorithms
- Selection panel with node/edge lists
- Bidirectional controlled hover between sidebar and graph
- Tooltip positioning using hover geometry anchors
- Graph statistics display

### Project Structure

```
src/
├── components/
│   ├── GraphView/      # Main component, layout sync, controlled selection/hover hooks
│   ├── nodes/          # Custom ReactFlow node component with icons and formatting
│   └── edges/          # Custom ReactFlow edge component with multi-edge and path types
├── hooks/              # useGraphLayout, useSelection, useGraphSettings
├── layouts/            # ELK layout configurations for each algorithm
├── utils/              # Data transforms, color generation, hover geometry measurement
├── assets/icons/       # SVG icons for Biolink entity types
└── types/              # TypeScript type definitions
example/                # Demo application
e2e/                    # Playwright end-to-end tests
```

## License

MIT
