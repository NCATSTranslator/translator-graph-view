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
- **Node chrome** — optional client-rendered hover controls at the node corners, with `onNodeRemove` / `onNodeMenu` callbacks
- **Optional connection handles** — hide and disable node connection handles via `showHandles`
- **Smart text formatting** — gene/protein names uppercased, other names title-cased, Roman numerals detected and preserved
- **Full TypeScript type definitions** — complete generics for nodes, edges, selections, geometry, and all props
- **Dual module output** — ESM and CommonJS builds with a separate CSS stylesheet

## How It Works

### Architecture

The library exports a single primary component (`GraphView`) that wraps ReactFlow in a `ReactFlowProvider`, a settings context, and a node-chrome context. Internally it:

1. **Transforms input data** — converts the Biolink-model `GraphData` (a record-based format with `nodes` and `edges` keyed by ID) into ReactFlow's flat node/edge arrays. During transformation, each node is assigned a deterministic color via a hash of its primary Biolink type, a display label (first name), a simplified type string, and an SVG icon. Edges sharing the same node pair are indexed so the renderer can offset them.

2. **Computes layout via web worker** — the `useGraphLayout` hook instantiates an ELK instance pointing at a user-provided worker URL. It builds an ELK graph descriptor with the chosen layout algorithm's options, sends it to the worker, and applies the returned positions to the ReactFlow nodes. Layout is recomputed whenever the data or layout type changes, with stale-cancellation to avoid race conditions.

3. **Syncs layout to ReactFlow state** — the `useLayoutSync` hook pushes layouted nodes/edges into ReactFlow's controlled state and triggers `fitView` with a short delay so the viewport frames the graph.

4. **Handles selection** — the `useSelection` hook translates ReactFlow's `OnSelectionChangeParams` back into domain-level `GraphNode[]` and `GraphEdge[]` objects. The optional `useControlledSelection` hook allows the parent to drive selection from the outside by toggling `selected` flags on the flow nodes/edges.

5. **Handles hover with geometry** — the `useHoverGeometry` hook tracks which node or edge the pointer is over, queries the DOM for its bounding rect (scoped to the current `GraphView` instance to avoid cross-graph collisions), computes a named anchor point, and invokes the caller's `onNodeHover`/`onEdgeHover` with the geometry. On viewport pan/zoom, geometry is re-measured via `requestAnimationFrame` so tooltip positions stay accurate.

6. **Renders custom node and edge components** — `GraphNode` displays the type icon, a formatted label, top/bottom handles (optionally hidden), and client-provided hover chrome. `GraphEdge` supports four path algorithms plus a multi-edge quadratic bezier mode, dashed stroke for inferred edges, and a floating label rendered via ReactFlow's `EdgeLabelRenderer`.

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
| `onAnnotationHover` | `(annotationId: string \| null) => void` | - | Fires when an annotation is hovered or unhovered |
| `hoveredNodeId` | `string \| null` | - | Controlled hover: focuses the given node and dims the rest |
| `hoveredEdgeId` | `string \| null` | - | Controlled hover: focuses the given edge + endpoints and dims the rest |
| `hoveredAnnotationId` | `string \| null` | - | Controlled hover: shows annotation hovered state (no dimming) |
| `nodeHoverAnchor` | `HoverAnchorPosition` | `'topCenter'` | Anchor point returned in `HoverGeometry` for node hovers |
| `edgeHoverAnchor` | `HoverAnchorPosition` | `'midpoint'` | Anchor point returned in `HoverGeometry` for edge hovers |
| `clearHoverOnViewportChange` | `boolean` | `false` | Clear the hover when the viewport pans/zooms instead of re-measuring it every frame |
| `selectedIds` | `string[]` | - | Controlled selection by node/edge ID |
| `edgeType` | `EdgeType` | `'straight'` | Edge path style: `'bezier'`, `'straight'`, `'step'`, or `'smoothstep'` |
| `showEdgeLabels` | `boolean` | `true` | Show predicate labels on edges |
| `showMiniMap` | `boolean` | `true` | Show the zoomable/pannable minimap |
| `showHandles` | `boolean` | `true` | Show connection handles on hover and allow connections |
| `nodeChrome` | `GraphNodeChrome` | - | Client-rendered chrome at the top-left and bottom-right of each graph node |
| `getNodeIcon` | `GraphNodeIconRenderer` | - | Client icon lookup; `null`/`undefined` uses the library default, `false` hides the icon |
| `getNodeColor` | `GraphNodeColorRenderer` | - | Client background-color lookup; `null`/`undefined` keeps the default node background |
| `onNodeRemove` | `(nodeId: string) => void` | - | Fires from node chrome `onRemove` |
| `onNodeMenu` | `(nodeId: string, position: { x: number; y: number }) => void` | - | Fires from node chrome `onMenu` with a viewport position |
| `multiEdgeSpacing` | `number` | `60` | Pixel spacing between parallel edges sharing the same node pair |
| `annotations` | `GraphAnnotation[]` | - | Controlled annotation overlays (positions in graph coordinates) |
| `onAnnotationsChange` | `(annotations: GraphAnnotation[]) => void` | - | Fires when an annotation is dragged, edited, or deleted |
| `annotationStyles` | `GraphAnnotationStyles` | - | Client-configurable annotation appearance (background, delete button, icons) |
| `hoverStyles` | `GraphHoverStyles` | - | Client-configurable hover / dim appearance (opacity, classNames) |
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

### Node chrome

Pass `nodeChrome` to render hover controls at the top-left and bottom-right corners of each graph node. Chrome is hidden until the node is hovered or contains focus (keyboard users can tab to chrome buttons). Memoize the `nodeChrome` object (or hoist slot renderers) so GraphView does not rebuild it every render.

`onRemove` and `onMenu` are only present when you pass `onNodeRemove` / `onNodeMenu`. Pointer-triggered menus use `clientX` / `clientY`; keyboard activation (or calling `onMenu()` with no event) falls back to the node's bounding-rect center.

```tsx
const nodeChrome = {
  topLeft: ({ onRemove }) =>
    onRemove ? <button type="button" onClick={onRemove}>Remove</button> : null,
  bottomRight: ({ onMenu }) =>
    onMenu ? <button type="button" onClick={onMenu}>Menu</button> : null,
};

<GraphView
  data={data}
  elkWorkerUrl={elkWorkerUrl}
  showHandles={false}
  nodeChrome={nodeChrome}
  onNodeRemove={(nodeId) => console.log('remove', nodeId)}
  onNodeMenu={(nodeId, position) => console.log('menu', nodeId, position)}
/>
```

### Node icons

Pass `getNodeIcon` to replace the built-in type icon on each graph node. The first argument is the **simplified primary type** (for example `"Drug"`), not a Biolink CURIE. Full types are on `node.types`.

- Return `null` or `undefined` to keep the library icon for that node.
- Return `false` to hide the icon.
- Icons are wrapped in a 24×24 slot that sizes both `svg` and `img`.

The library keeps the callback identity stable, so an inline `getNodeIcon` does not re-render edges or annotations. Hoist or wrap in `useCallback` if you also want to avoid extra work inside the renderer itself. Compose with `getNodeTypeIcon` when you only want to override some types.

```tsx
import { GraphView, getNodeTypeIcon } from 'translator-graph-view';

<GraphView
  data={data}
  elkWorkerUrl={elkWorkerUrl}
  getNodeIcon={(type, node) => {
    if (node.id === 'special') return <img alt="" src="/special.svg" />;
    if (type === 'Drug') return <MyDrugIcon />;
    return getNodeTypeIcon(type);
  }}
/>
```

### Node spacing

Layouts space nodes by their bounding boxes, so the boxes handed to ELK track
what the stylesheet actually paints: `NODE_HEIGHT` is the real 32px node height,
and each node's width comes from `estimateNodeWidth`, clamped to the stylesheet's
own 60–200px bounds. A box larger than the painted node would reappear as gap the
configured spacing never asked for.

`layoutConfigs` therefore expresses spacing as the gap you actually see. Adjust
those values to trade density against breathing room; note that the `radial`
(stress) algorithm positions mainly by `elk.stress.desiredEdgeLength` and largely
ignores `elk.spacing.nodeNode`.

### Node colors

Pass `getNodeColor` to set a node's background from its type. Like `getNodeIcon`,
the first argument is the **simplified primary type** (for example `"Drug"`), not
a Biolink CURIE; full types are on `node.types`.

- Return `{ background, hoverBackground }` to color the node.
- Omit `hoverBackground` to reuse `background` on hover.
- Return `null` or `undefined` to leave that node on the default background.

With no renderer supplied, every node keeps the default `#DCDCE6` background, so
adding the prop is opt-in per node. Colors are applied as the `--tgv-node-bg` and
`--tgv-node-bg-hover` custom properties, and the hover background also applies
when a node is hovered externally via `hoveredNodeId`.

```tsx
const typeColors: Record<string, { background: string; hoverBackground: string }> = {
  Drug: { background: '#DCE9FF', hoverBackground: '#C4DAFF' },
  Disease: { background: '#FFE0E0', hoverBackground: '#FFC9C9' },
};

<GraphView
  data={data}
  elkWorkerUrl={elkWorkerUrl}
  getNodeColor={(type) => typeColors[type] ?? null}
/>
```

The library keeps the callback identity stable, so an inline `getNodeColor` does
not re-render edges or annotations.

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

When a controlled hover id is set, the graph applies **neighborhood focus**:

- **Node:** the hovered node, its incident edges, and neighbor nodes stay full opacity; everything else is dimmed.
- **Edge:** that edge and its two endpoints stay full opacity; everything else is dimmed.
- **Annotation:** the annotation shows its hovered style; the rest of the graph is not dimmed.

**Uncontrolled** — nodes and edges show hover styles on mouseover with no props needed.

**Outbound events** — use `onNodeHover` / `onEdgeHover` / `onAnnotationHover` to react to hover changes:

```tsx
const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

<GraphView
  data={data}
  elkWorkerUrl={elkWorkerUrl}
  onNodeHover={(node) => setHoveredNode(node)}
/>

{hoveredNode && <div>Hovering: {hoveredNode.names[0]}</div>}
```

**Controlled (bidirectional)** — pass `hoveredNodeId` / `hoveredEdgeId` / `hoveredAnnotationId` to drive highlights from external UI (e.g. a sidebar list), and use the outbound hover callbacks to update that state when the user hovers inside the graph:

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

#### Hover styles

Override dimming / hovered appearance via `hoverStyles` (sensible defaults apply when omitted):

```tsx
<GraphView
  data={data}
  elkWorkerUrl={elkWorkerUrl}
  hoverStyles={{
    dimmedOpacity: 0.25,
    dimmedNodeClassName: 'my-dimmed-node',
    hoveredAnnotationClassName: 'my-hovered-annotation',
  }}
/>
```

| Field | Default | Description |
|-------|---------|-------------|
| `dimmedOpacity` | `0.3` | Opacity for dimmed elements (`--tgv-dimmed-opacity`) |
| `dimmedNodeClassName` | - | Extra class on dimmed nodes |
| `dimmedEdgeClassName` | - | Extra class on dimmed edges |
| `dimmedAnnotationClassName` | - | Extra class on dimmed annotations |
| `hoveredNodeClassName` | - | Extra class on hovered nodes |
| `hoveredEdgeClassName` | - | Extra class on hovered edges |
| `hoveredAnnotationClassName` | - | Extra class on hovered annotations |

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

#### Clearing hover while the viewport moves

Re-measuring calls your hover callback once per frame for as long as the gesture lasts. If your consumer stores the geometry in state, that is a re-render per frame, and any hover-driven dimming stays on — forcing the compositor to blend every dimmed element on every frame of the pan. On large graphs this makes a pan that starts over a node noticeably heavier than one that starts over empty space.

Set `clearHoverOnViewportChange` to drop the hover instead. The callback fires once with `null` on the first frame of the gesture, tooltips and dimming clear, and nothing further fires until the pointer enters another element:

```tsx
<GraphView
  data={data}
  elkWorkerUrl="/elk-worker.min.js"
  clearHoverOnViewportChange
  onNodeHover={(node, geometry) => setHover(node ? { node, geometry } : null)}
/>
```

Keep the default (`false`) if your tooltips are meant to track their element while the user pans.

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

interface GraphNodeChromeContext {
  node: GraphNode;
  selected: boolean;
  onRemove?: () => void;
  onMenu?: (event?: React.MouseEvent) => void;
}

interface GraphNodeChrome {
  topLeft?: (ctx: GraphNodeChromeContext) => React.ReactNode;
  bottomRight?: (ctx: GraphNodeChromeContext) => React.ReactNode;
}

type GraphNodeIconRenderer = (
  type: string,
  node: GraphNode,
) => React.ReactNode | null | undefined;
```

### Exported Hooks

- **`useGraphLayout({ nodes, edges, layout, elkWorkerUrl })`** — Computes ELK layout positions for ReactFlow nodes/edges via a web worker. Returns `{ nodes, edges, isLayouting }`.
- **`useSelection({ data, onSelectionChange })`** — Manages node/edge selection state, translating ReactFlow selection events back into domain-level objects.
- **`useGraphSettings()`** — Access the `GraphSettings` context (`multiEdgeSpacing`, `annotationStyles`, `hoverStyles`).
- **`useNodeChrome()`** — Access the node-chrome context (`nodeChrome`, `onNodeRemove`, `onNodeMenu`, `getNodeIcon`) when rendering `GraphNode` outside `GraphView`.

### Exported Utilities

| Function | Description |
|----------|-------------|
| `transformNodesToFlow(data)` | Convert `GraphData` to ReactFlow node array with colors, labels, and types |
| `transformEdgesToFlow(data, edgeType?, showLabels?)` | Convert `GraphData` to ReactFlow edge array with pair indexing |
| `transformAnnotationsToFlow(annotations)` | Convert `GraphAnnotation[]` to ReactFlow annotation nodes |
| `extractAnnotationsFromFlow(nodes)` | Extract `GraphAnnotation[]` from a ReactFlow node array |
| `isAnnotationNode(node)` | Type guard for annotation flow nodes |
| `getColorForType(type)` | Get a deterministic color for a Biolink type string (18-color palette) |
| `getNodeTypeIcon(type)` | Return the library SVG icon for a simplified (or `biolink:`) type |
| `simplifyTypeName(type)` | Extract a readable name from a prefixed type URI (`"biolink:Drug"` → `"Drug"`) |
| `getPrimaryType(types)` | Return the first type from a types array |
| `formatPredicate(predicate)` | Format a predicate for display (`"biolink:treats"` → `"treats"`) |
| `getNodesById(data, ids)` | Look up nodes by ID array |
| `getEdgesById(data, ids)` | Look up edges by ID array |
| `NODE_WIDTH` / `NODE_HEIGHT` | Fallback node dimensions used by the layout engine (120×32) |
| `NODE_MIN_WIDTH` / `NODE_MAX_WIDTH` | Width bounds the node stylesheet enforces (60 / 200) |
| `getNodeDisplayLabel(label, type)` | The label text as rendered (all caps for `Gene`/`Protein`, otherwise title case) |
| `estimateNodeWidth(label, type)` | Estimated rendered node width, used as the node's layout box |

### Exported Types

All TypeScript types are exported for consumer use:

`GraphData`, `GraphNodeType`, `GraphEdgeType`, `GraphViewProps`, `LayoutType`, `EdgeType`, `Selection`, `Result`, `Path`, `Publication`, `Trial`, `Provenance`, `GraphNodeData`, `GraphEdgeData`, `FlowNode`, `FlowGraphNode`, `FlowAnnotationNode`, `FlowEdge`, `HoverAnchorPosition`, `HoverGeometry`, `GraphAnnotation`, `GraphAnnotationStyles`, `GraphHoverStyles`, `GraphNodeChrome`, `GraphNodeChromeContext`, `GraphNodeColors`, `GraphNodeColorRenderer`

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
- Node chrome (hover remove/menu controls) and optional connection handles
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
