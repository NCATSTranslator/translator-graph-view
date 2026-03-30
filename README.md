# translator-graph-view

A React TypeScript component for interactive knowledge graph visualization, designed for use with the NIH's [Biomedical Data Translator](https://ncats.nih.gov/research/research-activities/biomedical-data-translator). Built on [ReactFlow](https://reactflow.dev/) and [ELKjs](https://www.eclipse.org/elk/).

Renders [Biolink Model](https://biolink.github.io/biolink-model/) knowledge graphs with automatic layout, type-based color coding, and interactive selection.

## Features

- Interactive graph visualization with pan, zoom, and selection
- Four automatic layout algorithms: hierarchical, force-directed, and grid
- Nodes color-coded by Biolink type
- Controlled and uncontrolled selection modes
- MiniMap and zoom controls
- Full TypeScript type definitions
- ESM and CommonJS support

## Installation

```bash
npm install translator-graph-view elkjs
```

React 18+ and `elkjs` 0.9+ are required as peer dependencies.

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
| `selectedIds` | `string[]` | - | Controlled selection by node/edge ID |
| `className` | `string` | - | Additional CSS class for the container |

#### `elkWorkerUrl`

Layout computation is offloaded to a web worker, keeping the ~1.5 MB ELK engine out of your main bundle. You must provide a URL pointing to the ELK worker script. In Vite-based apps:

```ts
const elkWorkerUrl = new URL('elkjs/lib/elk-worker.min.js', import.meta.url).href;
```

For webpack or other bundlers, serve `node_modules/elkjs/lib/elk-worker.min.js` as a static asset and pass its URL.

### Layout types

- `'hierarchical'` - Layered top-to-bottom (default)
- `'hierarchicalLR'` - Layered left-to-right
- `'force'` - Force-directed
- `'grid'` - Box/grid

### Data format

```ts
interface GraphData {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
}

interface GraphNode {
  id: string;
  names: string[];
  types: string[];       // e.g. ['biolink:Drug']
  curies?: string[];
}

interface GraphEdge {
  id: string;
  subject: string;       // source node ID
  object: string;        // target node ID
  predicate: string;     // e.g. 'biolink:treats'
}
```

### Hooks

- **`useGraphLayout({ nodes, edges, layout, elkWorkerUrl })`** - Computes ELK layout positions for ReactFlow nodes/edges via a web worker
- **`useSelection({ data, onSelectionChange })`** - Manages node/edge selection state

### Utilities

- `transformNodesToFlow(data)` / `transformEdgesToFlow(data)` - Convert `GraphData` to ReactFlow format
- `getColorForType(type)` - Get a consistent color for a Biolink type string
- `simplifyTypeName(type)` - Extract a readable name from a Biolink URI
- `getNodesById(data, ids)` / `getEdgesById(data, ids)` - Look up nodes/edges by ID

## Development

```bash
npm install
npm run dev        # Start dev server with example app
npm run build      # Build the library
npm run typecheck  # Type-check without emitting
```

## License

MIT
