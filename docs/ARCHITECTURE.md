# 🏗️ Clise Architecture Guide

Welcome to the Clise architecture documentation! This guide explains how our design canvas is built, from high-level concepts to implementation details.

## 🎯 Overview

Clise is built with a **modular, performance-first architecture** that combines modern web technologies with high-performance graphics rendering. The system is designed to handle complex designs with thousands of elements while maintaining smooth 60fps performance.

### Key Design Principles

- **🎯 Single Responsibility**: Each module has one clear purpose
- **🔗 Loose Coupling**: Modules interact through well-defined interfaces
- **⚡ Performance First**: Optimized for speed and memory efficiency
- **🧪 Testable**: Clean architecture enables comprehensive testing
- **📈 Scalable**: Designed to grow with feature complexity

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Clise Application                        │
├─────────────────────────────────────────────────────────────┤
│  React UI Layer (Components, Panels, Hooks)                │
├─────────────────────────────────────────────────────────────┤
│  State Management Layer (Jotai Atoms)                      │
├─────────────────────────────────────────────────────────────┤
│  Canvas Rendering Layer (CanvasKit-WASM)                   │
├─────────────────────────────────────────────────────────────┤
│  Performance Layer (Caching, Pooling, Optimization)        │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

1. **React UI Layer**: User interface, event handling, and user interactions
2. **State Management**: Application state, element data, and user preferences
3. **Canvas Rendering**: High-performance 2D graphics rendering
4. **Performance Layer**: Caching, object pooling, and optimization strategies

## 🧩 Core Technologies

### Frontend Stack

- **React 19**: Modern UI framework with concurrent features
- **TypeScript**: Type-safe development with strict mode
- **CanvasKit-WASM**: Google's Skia-based 2D graphics library
- **Jotai**: Atomic state management for predictable updates
- **Vite**: Fast build tool and development server

### Performance Technologies

- **Object Pooling**: Reuse expensive objects (paints, filters)
- **Intelligent Caching**: Cache computed values and resources
- **View Culling**: Skip off-screen elements
- **Batch Rendering**: Group similar elements for efficiency

## 📁 Project Structure

```
src/
├── canvas/              # 🎨 Canvas rendering system
│   ├── canvaskit/      # CanvasKit-based renderer
│   │   ├── drawing/    # Main rendering coordination
│   │   ├── rendering/  # Specialized renderers & caches
│   │   ├── modules/    # Canvas component modules
│   │   └── hooks/      # React hooks for canvas
│   └── performance/    # Performance optimizations
├── components/         # 🧩 Reusable UI components
├── panels/            # 📋 Main application panels
│   ├── layers/        # Layer management
│   └── inspector/     # Property inspection
├── store/             # 🗄️ State management (Jotai atoms)
│   ├── elements/      # Element state modules
│   └── ...           # Other state modules
├── utils/             # 🛠️ Utility functions
└── styles/            # 🎨 CSS stylesheets
```

## 🎨 Canvas Rendering Architecture

### Rendering Pipeline

```
Elements → View Culling → Batch Grouping → Specialized Renderers → Canvas Output
    ↓           ↓              ↓                    ↓                ↓
  State    Performance    Optimization        CanvasKit-WASM    Visual Result
```

### Specialized Renderers

Each element type has its own optimized renderer:

- **RectangleRenderer**: Rectangles, rounded rectangles, frames
- **EllipseRenderer**: Circles, ovals, and elliptical shapes
- **TextRenderer**: Text with typography and formatting
- **PathRenderer**: Custom vector paths and shapes
- **ImageRenderer**: Images and textures

### Performance Optimizations

#### 1. Paint Object Pooling

```typescript
// Instead of creating new paint objects every time
const paint = new this.canvasKit.Paint(); // ❌ Expensive

// We reuse paint objects from a pool
const paint = this.paintPool.getFillPaint(color); // ✅ Efficient
```

**Benefits**: 60-80% reduction in object allocations

#### 2. Blur Filter Caching

```typescript
// Instead of recreating blur filters
const filter = this.canvasKit.ImageFilter.MakeBlur(blur, blur, ...); // ❌ Expensive

// We cache and reuse filters
const filter = this.blurFilterCache.getBlurFilter(blur); // ✅ Efficient
```

**Benefits**: 70-90% reduction in filter recreations

#### 3. Path Caching

```typescript
// Instead of recalculating complex paths
const path = this.createRoundedRectPath(x, y, w, h, radius); // ❌ Expensive

// We cache identical paths
const path = this.pathCache.getRoundedRectPath(x, y, w, h, radius); // ✅ Efficient
```

**Benefits**: 50-80% reduction in path generation

## 🗄️ State Management Architecture

### Atomic State with Jotai

We use **Jotai atoms** for all application state instead of React's built-in state:

```typescript
// ✅ Good - Using Jotai atoms
const [selection, setSelection] = useAtom(selectionAtom);
const [isDragging, setIsDragging] = useAtom(isDraggingAtom);

// ❌ Bad - Using React state (forbidden in our codebase)
const [selection, setSelection] = useState([]);
const [isDragging, setIsDragging] = useState(false);
```

### State Organization

```
store/
├── element-atoms.ts      # Element data and operations
├── selection-atoms.ts    # Selection state and operations
├── viewport-atoms.ts     # Zoom, pan, and viewport state
├── interaction-atoms.ts  # User interaction state
├── document-atoms.ts     # Document-level state
└── elements/            # Modularized element state
    ├── element-types.ts
    ├── element-state.ts
    └── element-operations.ts
```

### Benefits of Atomic State

- **🎯 Granular Updates**: Only affected components re-render
- **🔗 Predictable**: Clear data flow and dependencies
- **🧪 Testable**: Easy to test state logic in isolation
- **⚡ Performance**: Minimal re-renders and efficient updates

## 🧩 Component Architecture

### Modular Design Pattern

Large components are broken down into focused modules:

```typescript
// Before: Monolithic component (264 lines)
export function CanvasKitCanvas() {
  // Canvas setup, events, text editing, context menus, performance, dev tools
  // All mixed together in one large component
}

// After: Modular composition (100 lines + 7 focused modules)
export function CanvasKitCanvas() {
  return (
    <CanvasCore>
      <CanvasEvents />
      <TextEditorManager />
      <ContextMenuManager />
      <PerformanceManager />
      <DevTools />
      <DragDropManager />
    </CanvasCore>
  );
}
```

### Component Responsibilities

- **CanvasCore**: Main canvas coordination and setup
- **CanvasEvents**: Mouse, keyboard, and touch event handling
- **TextEditorManager**: Text editing functionality
- **ContextMenuManager**: Right-click context menus
- **PerformanceManager**: Performance monitoring and optimization
- **DevTools**: Development and debugging tools
- **DragDropManager**: File drag and drop handling

## 🔄 Data Flow Architecture

### State Updates Flow

```
User Action → Event Handler → Atom Update → Component Re-render → Canvas Update
     ↓              ↓              ↓              ↓              ↓
  Mouse Click   →  Handler   →  setSelection  →  React   →  Renderer
```

### Example: Selecting an Element

1. **User clicks** on canvas
2. **Event handler** processes the click
3. **Selection atom** is updated with new selection
4. **React components** re-render with new selection
5. **Canvas renderer** updates visual selection indicators

## 🎯 Key Architectural Decisions

### 1. Why CanvasKit-WASM?

**Problem**: Canvas API has performance limitations with complex scenes
**Solution**: CanvasKit-WASM provides hardware-accelerated 2D graphics

**Benefits**:

- 60fps performance with 1000+ elements
- Hardware acceleration through WebGL
- Consistent rendering across browsers
- Advanced graphics features (filters, effects)

### 2. Why Jotai Instead of Redux?

**Problem**: Redux can be complex and verbose for simple state
**Solution**: Jotai provides atomic, composable state management

**Benefits**:

- Simpler mental model
- Better TypeScript integration
- Automatic dependency tracking
- Less boilerplate code

### 3. Why Modular Architecture?

**Problem**: Large, monolithic components are hard to maintain
**Solution**: Break components into focused, single-responsibility modules

**Benefits**:

- Easier to understand and modify
- Better testability
- Parallel development
- Reduced merge conflicts

## 🚀 Performance Architecture

### Caching Strategy

We implement a **cache-first architecture** where expensive operations are cached:

```typescript
// All expensive operations go through caches
const paint = this.paintPool.getFillPaint(color);           // Paint pooling
const filter = this.blurFilterCache.getBlurFilter(blur);    // Filter caching
const path = this.pathCache.getRoundedRectPath(...);        // Path caching
const color = this.colorCache.hexToRgba(hex);               // Color caching
```

### Memory Management

- **Bounded Caches**: All caches have size limits to prevent memory bloat
- **Automatic Cleanup**: Resources are properly disposed when no longer needed
- **Object Pooling**: Expensive objects are reused instead of recreated
- **LRU Eviction**: Least recently used items are removed when caches are full

### Performance Monitoring

Built-in performance monitoring tracks:

- Render time per frame
- Cache hit rates
- Memory usage
- Element count
- Frame rate consistency

## 🧪 Testing Architecture

### Testing Strategy

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **Performance Tests**: Ensure no performance regressions
- **Visual Tests**: Verify rendering correctness

### Testing Patterns

```typescript
// Example: Testing a renderer
describe("RectangleRenderer", () => {
  it("should render rectangle with correct dimensions", () => {
    const element = createMockElement("rect", { x: 10, y: 20, w: 100, h: 50 });
    const renderer = new RectangleRenderer(mockCanvasKit);

    renderer.render(mockCanvas, element);

    expect(mockCanvas.drawRect).toHaveBeenCalledWith(10, 20, 100, 50);
  });
});
```

## 🔮 Future Architecture Considerations

### Planned Enhancements

1. **Plugin Architecture**: Allow third-party renderers and tools
2. **WebWorker Integration**: Move heavy computations to background threads
3. **WebGL Backend**: Hardware-accelerated rendering for complex scenes
4. **Collaborative Editing**: Real-time multi-user support

### Scaling Patterns

1. **Micro-Frontend Architecture**: Independent deployment of UI panels
2. **Event Sourcing**: Track all operations for advanced undo/redo
3. **CQRS Pattern**: Separate read and write models for complex operations
4. **GraphQL Integration**: Efficient data fetching for large projects

## 🛠️ Development Guidelines

### Adding New Features

1. **Follow SRP**: Each module should have single responsibility
2. **Use Dependency Injection**: Inject dependencies explicitly
3. **Implement Caching**: Add caching for expensive operations
4. **Add Tests**: Include unit and integration tests
5. **Update Documentation**: Keep docs current with changes

### Performance Guidelines

1. **Measure First**: Profile before optimizing
2. **Cache Expensive Operations**: Follow established caching patterns
3. **Pool Objects**: Reuse expensive objects when possible
4. **Monitor Impact**: Track performance improvements

### Code Organization

1. **File Naming**: Use kebab-case for all files
2. **File Size**: Maximum 200 lines per file
3. **Single Responsibility**: One clear purpose per module
4. **Explicit Dependencies**: No hidden dependencies or global state

## 📚 Further Reading

- **[Performance Optimizations](PERFORMANCE_OPTIMIZATIONS.md)** - Detailed optimization strategies
- **[Rendering System](RENDERING_SYSTEM.md)** - Canvas rendering implementation
- **[Modularization Strategy](MODULARIZATION_STRATEGY.md)** - How we broke down monolithic components
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to the project

## 🤝 Contributing to Architecture

We welcome contributions to improve the architecture! Here's how you can help:

1. **Report Issues**: Found an architectural problem? [Open an issue](https://github.com/your-username/clise/issues)
2. **Suggest Improvements**: Have ideas for better patterns? [Start a discussion](https://github.com/your-username/clise/discussions)
3. **Submit PRs**: Implement architectural improvements
4. **Improve Documentation**: Help make this guide better

---

**Happy architecting! 🏗️**

_This architecture guide is maintained by the Clise community. If you have questions or suggestions, please [open an issue](https://github.com/your-username/clise/issues) or [start a discussion](https://github.com/your-username/clise/discussions)._
