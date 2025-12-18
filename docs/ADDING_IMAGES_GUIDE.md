# Adding Images and Graphics to Your Website

## Overview
This guide explains how to add images and graphics to websites built with the app builder.

## Methods for Adding Images

### Method 1: Using External Image URLs (Recommended for Quick Start)
Use images from external sources like Unsplash, Pexels, or your own hosted images.

**Example in React:**
```jsx
function Hero() {
  return (
    <div className="hero">
      <img 
        src="https://images.unsplash.com/photo-1234567890" 
        alt="Hero image"
        className="w-full h-64 object-cover"
      />
    </div>
  );
}
```

**Popular Free Image Sources:**
- **Unsplash**: `https://images.unsplash.com/photo-...`
- **Pexels**: `https://images.pexels.com/photos/...`
- **Pixabay**: `https://pixabay.com/get/...`
- **Placeholder.com**: `https://via.placeholder.com/800x600`

### Method 2: Using Base64 Encoded Images
Embed small images directly in code (for icons, logos, small graphics).

**Example:**
```jsx
const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...";

function Header() {
  return <img src={logoBase64} alt="Logo" />;
}
```

### Method 3: Using SVG Inline (Best for Icons/Graphics)
Embed SVG code directly for scalable graphics.

**Example:**
```jsx
function Icon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="currentColor"/>
    </svg>
  );
}
```

### Method 4: Using Image Assets (For Deployed Apps)
Store images in a `public` or `assets` folder and reference them.

**Example:**
```jsx
// If image is in public/images/hero.jpg
function Hero() {
  return <img src="/images/hero.jpg" alt="Hero" />;
}
```

## Best Practices

### 1. Image Optimization
- Use appropriate formats: JPEG for photos, PNG for transparency, WebP for modern browsers
- Compress images before uploading
- Use responsive images with `srcset`

### 2. Accessibility
Always include `alt` text:
```jsx
<img src="image.jpg" alt="Descriptive text about the image" />
```

### 3. Responsive Images
Use CSS for responsive images:
```css
img {
  max-width: 100%;
  height: auto;
  object-fit: cover;
}
```

### 4. Lazy Loading
Load images only when needed:
```jsx
<img src="image.jpg" loading="lazy" alt="Description" />
```

## Using AI to Add Images

### Prompt Examples:
1. **"Add a hero image using Unsplash"**
   - AI will generate code with an Unsplash image URL

2. **"Create an image gallery with placeholder images"**
   - AI will create a gallery component with placeholder images

3. **"Add a logo SVG icon"**
   - AI will generate inline SVG code

4. **"Add a background image to the hero section"**
   - AI will add CSS background-image

## Image Component Examples

### Hero Section with Image
```jsx
function Hero() {
  return (
    <section className="hero">
      <div className="hero-image">
        <img 
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c"
          alt="Team collaboration"
          className="w-full h-screen object-cover"
        />
      </div>
      <div className="hero-content">
        <h1>Welcome to Our Website</h1>
        <p>Amazing content here</p>
      </div>
    </section>
  );
}
```

### Image Gallery
```jsx
function Gallery() {
  const images = [
    "https://images.unsplash.com/photo-1",
    "https://images.unsplash.com/photo-2",
    "https://images.unsplash.com/photo-3",
  ];

  return (
    <div className="gallery grid grid-cols-3 gap-4">
      {images.map((src, idx) => (
        <img 
          key={idx}
          src={src}
          alt={`Gallery image ${idx + 1}`}
          className="w-full h-64 object-cover rounded-lg"
        />
      ))}
    </div>
  );
}
```

### Background Image
```jsx
function HeroWithBackground() {
  return (
    <div 
      className="hero-bg"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-123)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh'
      }}
    >
      <div className="content">
        <h1>Hero Content</h1>
      </div>
    </div>
  );
}
```

## CSS for Images

### Common Image Styles
```css
/* Responsive image */
.responsive-img {
  width: 100%;
  height: auto;
  max-width: 100%;
}

/* Circular image */
.circular-img {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  object-fit: cover;
}

/* Image with overlay */
.image-overlay {
  position: relative;
}

.image-overlay::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

/* Image hover effects */
.image-hover {
  transition: transform 0.3s ease;
}

.image-hover:hover {
  transform: scale(1.05);
}
```

## Next Steps

1. **For Quick Testing**: Use Unsplash or placeholder images
2. **For Production**: Set up image hosting (Cloudinary, AWS S3, or similar)
3. **For Icons**: Use SVG inline or icon libraries (React Icons, Heroicons)
4. **For Graphics**: Use SVG or Canvas for custom graphics

## AI Integration

The AI assistant can help you:
- Generate image components
- Add image galleries
- Create responsive image layouts
- Optimize image code
- Add image effects and animations

Just ask: "Add images to [component]" or "Create an image gallery"

