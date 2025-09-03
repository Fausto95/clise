# 🤝 Contributing to Clise

Thank you for your interest in contributing to Clise! This guide will help you get started with contributing to our design canvas project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)
- [Community Guidelines](#community-guidelines)

## 📜 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **pnpm** (recommended) or npm
- **Git** for version control
- **TypeScript** knowledge (we use strict mode)
- **React** experience (we use React 19)

### First Time Setup

1. **Fork the repository**

   - Click the "Fork" button on GitHub
   - Clone your fork: `git clone https://github.com/YOUR_USERNAME/clise.git`
   - Add upstream: `git remote add upstream https://github.com/ORIGINAL_OWNER/clise.git`

2. **Install dependencies**

   ```bash
   cd clise
   pnpm install
   ```

3. **Start development server**

   ```bash
   pnpm dev
   ```

4. **Verify setup**
   - Open `http://localhost:5173`
   - You should see the Clise canvas interface
   - Try creating some shapes to ensure everything works

## 🛠️ Development Setup

### Environment Configuration

1. **Create environment file** (optional)

   ```bash
   cp .env.example .env
   ```

2. **Configure Sentry** (for error reporting)
   ```env
   VITE_SENTRY_DSN=your_sentry_dsn_here
   ```

### Available Scripts

| Script           | Description                  |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Start development server     |
| `pnpm build`     | Build for production         |
| `pnpm preview`   | Preview production build     |
| `pnpm lint`      | Run ESLint                   |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format`    | Format code with Biome       |

### IDE Setup

We recommend using **VS Code** with these extensions:

- **TypeScript Importer** - Auto-import management
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Auto Rename Tag** - HTML/JSX tag management
- **Bracket Pair Colorizer** - Better bracket visualization

### VS Code Settings

Add to your `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.suggest.autoImports": true
}
```

## 🏗️ Project Structure

```
src/
├── canvas/              # Canvas rendering system
│   ├── canvaskit/      # CanvasKit-based renderer
│   │   ├── drawing/    # Main rendering coordination
│   │   ├── rendering/  # Specialized renderers & caches
│   │   ├── modules/    # Canvas component modules
│   │   └── hooks/      # React hooks for canvas
│   └── performance/    # Performance optimizations
├── components/         # Reusable UI components
├── panels/            # Main application panels
│   ├── layers/        # Layer management
│   └── inspector/     # Property inspection
├── store/             # State management (Jotai atoms)
│   ├── elements/      # Element state modules
│   └── ...           # Other state modules
├── utils/             # Utility functions
└── styles/            # CSS stylesheets
```

### Key Directories

- **`canvas/`** - Core rendering and canvas functionality
- **`store/`** - State management with Jotai atoms
- **`components/`** - Reusable React components
- **`panels/`** - Main application UI panels
- **`utils/`** - Pure utility functions

## 📝 Coding Standards

### TypeScript Standards

- **Strict Mode**: All TypeScript strict checks enabled
- **No `any` Types**: Use proper typing or `unknown`
- **Explicit Types**: All function parameters and return types
- **Interface Segregation**: Prefer specific interfaces over large ones

```typescript
// ✅ Good
interface ElementPosition {
  x: number;
  y: number;
}

function moveElement(element: Element, position: ElementPosition): void {
  // implementation
}

// ❌ Bad
function moveElement(element: any, position: any): any {
  // implementation
}
```

### File Naming Conventions

- **ALL files must use kebab-case**: `element-atoms.ts`, `canvas-component.tsx`
- **Component files**: `component-name.tsx`
- **Utility files**: `util-name.ts`
- **Type files**: `type-definitions.ts`
- **Hook files**: `use-hook-name.ts` or `hook-name-hooks.ts`

### File Size Limits

- **Maximum 200 lines per file**
- Split files when they exceed this limit
- Extract utilities to separate files
- Create composite hooks for related functionality

### State Management Rules

- **NEVER use React state** (`useState`, `useReducer`, `useRef` for state)
- **ALWAYS use Jotai atoms** for application state
- **Use atomic updates** for fine-grained changes
- **Prefer derived atoms** for computed values

```typescript
// ✅ Good - Using Jotai atoms
const [selection, setSelection] = useAtom(selectionAtom);
const [isDragging, setIsDragging] = useAtom(isDraggingAtom);

// ❌ Bad - Using React state
const [selection, setSelection] = useState([]);
const [isDragging, setIsDragging] = useState(false);
```

### Component Patterns

- **Functional Components**: Use arrow functions
- **Props Interface**: Define explicit prop interfaces
- **Default Props**: Use default parameters
- **Event Handlers**: Use `useCallback` for performance

```typescript
// ✅ Good
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = "primary",
}) => {
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <button className={`btn btn-${variant}`} onClick={handleClick}>
      {children}
    </button>
  );
};
```

### Performance Guidelines

- **Use `useCallback`** for event handlers
- **Use `useMemo`** for expensive calculations
- **Implement caching** for expensive operations
- **Use object pooling** for frequently created objects
- **Profile before optimizing**

## 🔧 Making Changes

### Branch Strategy

1. **Create feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Keep branches focused**

   - One feature per branch
   - Descriptive branch names
   - Keep branches up to date

3. **Commit frequently**
   ```bash
   git add .
   git commit -m "feat: add rectangle tool improvements"
   ```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(canvas): add blur filter caching
fix(selection): resolve multi-select issues
docs(readme): update installation instructions
perf(rendering): optimize paint object pooling
```

### Code Review Checklist

Before submitting a PR, ensure:

- [ ] Code follows TypeScript strict mode
- [ ] All files use kebab-case naming
- [ ] Files are under 200 lines
- [ ] No React state used (only Jotai atoms)
- [ ] Proper error handling implemented
- [ ] Performance implications considered
- [ ] Tests added for new functionality
- [ ] Documentation updated if needed
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)

## 🧪 Testing

### Testing Strategy

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **Performance Tests**: Ensure no performance regressions
- **Visual Tests**: Verify rendering correctness

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Writing Tests

```typescript
// Example test structure
describe("ElementRenderer", () => {
  it("should render rectangle correctly", () => {
    const element = createMockElement("rect");
    const renderer = new RectangleRenderer(mockCanvasKit);

    renderer.render(mockCanvas, element);

    expect(mockCanvas.drawRect).toHaveBeenCalledWith(
      element.x,
      element.y,
      element.w,
      element.h
    );
  });
});
```

### Performance Testing

```typescript
// Example performance test
describe("Performance", () => {
  it("should render 1000 elements in under 16ms", () => {
    const elements = createMockElements(1000);
    const start = performance.now();

    renderer.render(elements);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(16); // 60fps
  });
});
```

## 📤 Submitting Changes

### Pull Request Process

1. **Ensure your branch is up to date**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes**

   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request**

   - Use the PR template
   - Provide clear description
   - Link related issues
   - Add screenshots if UI changes

4. **Respond to feedback**
   - Address review comments
   - Make requested changes
   - Keep PR focused and small

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] New tests added
- [ ] Performance tested

## Checklist

- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Screenshots (if applicable)

Add screenshots for UI changes

## Related Issues

Closes #123
```

## 🐛 Issue Guidelines

### Bug Reports

When reporting bugs, include:

- **Clear description** of the problem
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Browser and OS information**
- **Console errors** (if any)
- **Screenshots** (if applicable)

### Feature Requests

For new features, provide:

- **Clear description** of the feature
- **Use case and motivation**
- **Mockups or examples** (if applicable)
- **Alternative solutions** considered
- **Additional context**

### Issue Labels

We use these labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `performance` - Performance related
- `question` - Further information requested

## 👥 Community Guidelines

### Getting Help

1. **Check Documentation**: Most questions are answered in the docs
2. **Search Issues**: Look for similar problems
3. **Ask Questions**: Use GitHub Discussions
4. **Be Patient**: Maintainers are volunteers

### Providing Help

- **Be Welcoming**: Help newcomers feel included
- **Be Patient**: Everyone learns at different rates
- **Be Constructive**: Provide helpful feedback
- **Be Respectful**: Follow the code of conduct

### Recognition

Contributors are recognized in:

- **README.md** - Major contributors
- **CHANGELOG.md** - All contributors
- **GitHub Contributors** - Automatic recognition
- **Release Notes** - Feature contributors

## 🎯 Development Priorities

### High Priority

- **Performance optimizations**
- **Bug fixes**
- **Accessibility improvements**
- **Documentation updates**

### Medium Priority

- **New features**
- **UI/UX improvements**
- **Testing coverage**
- **Developer experience**

### Low Priority

- **Nice-to-have features**
- **Code style improvements**
- **Refactoring**
- **Experimental features**

## 📚 Additional Resources

- **[Architecture Documentation](docs/ARCHITECTURE.md)** - System design
- **[Performance Guide](docs/PERFORMANCE_OPTIMIZATIONS.md)** - Optimization strategies
- **[Rendering System](docs/RENDERING_SYSTEM.md)** - Canvas implementation
- **[GitHub Discussions](https://github.com/clise-app/clise/discussions)** - Community discussions

## 🙏 Thank You

Thank you for contributing to Clise! Your contributions help make this project better for everyone. Whether you're fixing bugs, adding features, improving documentation, or helping other contributors, your work is appreciated.

---

**Happy coding! 🎉**

_If you have questions about contributing, feel free to ask in [GitHub Discussions](https://github.com/clise-app/clise/discussions) or [open an issue](https://github.com/clise-app/clise/issues)._
