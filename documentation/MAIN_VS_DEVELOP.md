# Main vs Develop Branch Comparison

## What's in MAIN but NOT in DEVELOP

### 1. Header Navigation Tabs
**Main has:**
- 7 navigation tabs: About, Resources, Projects, Community, Whitepaper, Pricing, Docs

**Develop has:**
- 5 navigation tabs: Resources, Projects, Community, Whitepaper, Pricing
- ❌ Missing: "About" tab
- ❌ Missing: "Docs" tab

### 2. Package Lock File
**Main has:**
- `package-lock.json` (npm lock file)

**Develop has:**
- ❌ Removed `package-lock.json` (using pnpm instead)
- ✅ Has `pnpm-lock.yaml`

### 3. Logo Files
**Main has:**
- `public/eco.png` (old logo)

**Develop has:**
- ✅ `public/logo.png` (new ECOSYZ logo)
- ❌ Missing: `public/eco.png` (replaced with new logo)

### 4. CSS Styling
**Main has:**
- `.glass` class with `backdrop-filter` (translucent glass effect)
- May appear grey on some devices

**Develop has:**
- ✅ `.glass` class with solid dark background (consistent across all devices)
- ✅ Fixed grey header issue

---

## What's in DEVELOP but NOT in MAIN

### 1. Knowledge Graph Features ✅
**Develop has:**
- `app/components/KnowledgeGraph.tsx` - Main knowledge graph component
- `app/components/graph/KnowledgeGraphViewer.tsx` - Graph viewer component
- `app/api/graph/health/route.ts` - Health check endpoint
- `app/api/graph/query/route.ts` - Graph query endpoint
- `app/api/graph/expand/route.ts` - Graph expansion endpoint
- `app/api/graph/subgraph/route.ts` - Subgraph extraction endpoint
- `app/lib/graph/neo4j-client.ts` - Neo4j database client
- `app/lib/graph/entity-extractor.ts` - Entity extraction utility

**Main has:**
- ❌ None of these knowledge graph files

### 2. Configuration Files
**Develop has:**
- `env.neo4j.example` - Neo4j environment variables example
- `types/cytoscape-cola.d.ts` - TypeScript definitions
- `types/cytoscape-navigator.d.ts` - TypeScript definitions

**Main has:**
- ❌ None of these files

---

## Summary

### Missing from Develop (that Main has):
1. ❌ **"About" tab** in header navigation
2. ❌ **"Docs" tab** in header navigation  
3. ❌ **package-lock.json** file (intentionally removed)
4. ❌ **Old logo** (`eco.png` - replaced with new logo)

### Added to Develop (that Main doesn't have):
1. ✅ **Knowledge Graph** - Complete implementation with components and API routes
2. ✅ **New Logo** - Updated ECOSYZ logo
3. ✅ **Fixed Header** - Consistent dark background (no grey issue)
4. ✅ **Neo4j Integration** - Database client and configuration
5. ✅ **Graph API Routes** - Health, query, expand, subgraph endpoints

---

## Recommendation

If you want to add back the "About" and "Docs" tabs to develop:

```bash
# Option 1: Cherry-pick from main
git checkout develop
git checkout main -- app/components/Header.tsx
# Then manually edit to keep your logo changes

# Option 2: Manually add them back
# Edit app/components/Header.tsx and add:
# { href: "/about", label: "About" },
# { href: "/docs", label: "Docs" },
```

The knowledge graph features are **only in develop**, not in main. This is correct since develop is ahead of main with new features.

