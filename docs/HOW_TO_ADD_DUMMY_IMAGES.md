# How to Add Dummy Images to Your App

## Quick Methods

### Method 1: Use ImageManager Component
1. In the App Builder, look for the **ImageManager** component (usually in a sidebar or panel)
2. Click **"+ Add Image"**
3. Use the **Quick Preset buttons** to instantly add common image sizes:
   - **Hero (1200x600)** - For hero sections
   - **Large (800x600)** - For large content images
   - **Card (400x300)** - For card components
   - **Avatar (150x150)** - For profile pictures
   - **Placeholder** - Custom placeholder with text
   - **Unsplash Tech** - Technology-themed image

### Method 2: Ask AI to Add Images
Simply ask the AI chat:
- "Add dummy images to the gallery"
- "Include placeholder images in the hero section"
- "Add avatar images for the team section"
- "Generate images for the portfolio cards"

The AI will automatically use dummy image sources like:
- Picsum (Lorem Picsum)
- Unsplash
- Placeholder.com
- Pravatar (for avatars)

## Popular Dummy Image Sources

### 1. **Picsum (Lorem Picsum)** - Random high-quality photos
```
https://picsum.photos/800/600
https://picsum.photos/400/300?random=1
https://picsum.photos/1200/600?random=2
```
- **Use for**: Hero images, galleries, cards
- **Pros**: High quality, random variety
- **Example**: `https://picsum.photos/800/600?random=5`

### 2. **Unsplash** - Professional stock photos
```
https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200
https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200
https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200
```
- **Use for**: Hero sections, featured images
- **Pros**: Professional, curated images
- **Categories**: Technology, Business, Portfolio, Product

### 3. **Placeholder.com** - Custom placeholders with text
```
https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=Hero+Image
https://via.placeholder.com/400x300/6366F1/FFFFFF?text=Card+Image
https://via.placeholder.com/150/8B5CF6/FFFFFF?text=Avatar
```
- **Use for**: Development, testing, placeholders
- **Format**: `/WIDTHxHEIGHT/BG_COLOR/TEXT_COLOR?text=TEXT`
- **Example**: `https://via.placeholder.com/1200x600/4F46E5/FFFFFF?text=Welcome`

### 4. **Pravatar** - Random avatars
```
https://i.pravatar.cc/150
https://i.pravatar.cc/150?img=1
https://i.pravatar.cc/150?img=12
```
- **Use for**: User avatars, team photos, profile pictures
- **Pros**: Consistent avatar style
- **Sizes**: 150, 300, 500, etc.

### 5. **Pexels** - Free stock photos
```
https://images.pexels.com/photos/[ID]/pexels-photo-[ID].jpeg?w=1200
```
- **Use for**: Background images, hero sections
- **Pros**: High quality, free to use

## Common Use Cases

### Hero Section Image
```jsx
<img 
  src="https://picsum.photos/1200/600" 
  alt="Hero image"
  className="w-full h-screen object-cover"
/>
```

### Image Gallery
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {[1, 2, 3, 4, 5, 6].map((idx) => (
    <img 
      key={idx} 
      src={`https://picsum.photos/400/300?random=${idx}`}
      alt={`Gallery image ${idx}`} 
      className="w-full h-64 object-cover rounded-lg shadow-md" 
    />
  ))}
</div>
```

### Team Avatars
```jsx
<div className="flex gap-4">
  {[1, 2, 3, 4].map((idx) => (
    <img 
      key={idx}
      src={`https://i.pravatar.cc/150?img=${idx}`}
      alt={`Team member ${idx}`}
      className="w-20 h-20 rounded-full"
    />
  ))}
</div>
```

### Product Cards
```jsx
<div className="bg-white rounded-xl shadow-lg overflow-hidden">
  <img 
    src="https://picsum.photos/400/300?random=1"
    alt="Product"
    className="w-full h-48 object-cover"
  />
  <div className="p-6">
    <h3>Product Name</h3>
    <p>Product description</p>
  </div>
</div>
```

## Tips

1. **Always include alt text** for accessibility
2. **Use responsive classes**: `w-full h-auto` or `object-cover`
3. **Add proper sizing**: Use Tailwind classes like `h-64`, `w-full`
4. **Use different sources**: Mix Picsum, Unsplash, and Placeholder for variety
5. **Randomize**: Use `?random=NUMBER` to get different images

## Quick Copy-Paste URLs

**Hero Images:**
- `https://picsum.photos/1200/600`
- `https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200`

**Card Images:**
- `https://picsum.photos/400/300`
- `https://via.placeholder.com/400x300/6366F1/FFFFFF?text=Card`

**Avatars:**
- `https://i.pravatar.cc/150`
- `https://i.pravatar.cc/150?img=5`

**Thumbnails:**
- `https://picsum.photos/300/200`
- `https://via.placeholder.com/300x200/EC4899/FFFFFF?text=Thumbnail`

## AI Integration

The AI will automatically:
- ✅ Include dummy images when generating components
- ✅ Use appropriate image sources for different sections
- ✅ Add proper alt text and responsive classes
- ✅ Create image galleries with multiple dummy images
- ✅ Use professional-looking images (not broken placeholders)

Just ask: **"Add images to [component name]"** or **"Include dummy images"**
