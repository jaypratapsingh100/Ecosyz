'use client';

import { useState, useEffect } from 'react';

interface ImageAsset {
  id: string;
  url: string;
  name: string;
  type: 'url' | 'base64' | 'svg';
  createdAt: string;
}

interface ImageManagerProps {
  projectId: string;
  onSelectImage?: (url: string) => void;
}

export default function ImageManager({ projectId, onSelectImage }: ImageManagerProps) {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageName, setNewImageName] = useState('');
  const [imageType, setImageType] = useState<'url' | 'base64' | 'svg'>('url');

  useEffect(() => {
    fetchImages();
  }, [projectId]);

  const fetchImages = async () => {
    try {
      const res = await fetch(`/api/app-projects/${projectId}/images`);
      if (res.ok) {
        const data = await res.json();
        setImages(data);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  };

  const handleAddImage = async () => {
    if (!newImageUrl.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/app-projects/${projectId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newImageUrl,
          name: newImageName || 'Untitled Image',
          type: imageType,
        }),
      });

      if (res.ok) {
        await fetchImages();
        setNewImageUrl('');
        setNewImageName('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Failed to add image:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      const res = await fetch(`/api/app-projects/${projectId}/images/${imageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchImages();
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleImageClick = (url: string) => {
    if (onSelectImage) {
      onSelectImage(url);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Image Assets</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm font-medium transition-colors"
        >
          + Add Image
        </button>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>No images added yet</p>
          <p className="text-xs mt-2">Click "Add Image" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group border border-white/10 rounded-lg overflow-hidden bg-[#1a1a1a] hover:border-emerald-500/50 transition-colors cursor-pointer"
              onClick={() => handleImageClick(image.url)}
            >
              {image.type === 'svg' ? (
                <div className="p-4 flex items-center justify-center h-32">
                  <div className="text-gray-400 text-xs">SVG</div>
                </div>
              ) : (
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(image.id);
                  }}
                  className="px-3 py-1 bg-red-500/80 hover:bg-red-500 rounded text-white text-xs"
                >
                  Delete
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                <p className="text-white text-xs truncate">{image.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-gray-400 text-xs mb-2">Quick Image Sources:</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://unsplash.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Unsplash
          </a>
          <span className="text-gray-600">•</span>
          <a
            href="https://pexels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Pexels
          </a>
          <span className="text-gray-600">•</span>
          <a
            href="https://pixabay.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Pixabay
          </a>
          <span className="text-gray-600">•</span>
          <a
            href="https://placeholder.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Placeholder
          </a>
        </div>
      </div>

      {/* Add Image Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-semibold mb-4">Add Image</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm mb-2">Image Type</label>
                <select
                  value={imageType}
                  onChange={(e) => setImageType(e.target.value as 'url' | 'base64' | 'svg')}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm"
                >
                  <option value="url">Image URL</option>
                  <option value="base64">Base64 Data</option>
                  <option value="svg">SVG Code</option>
                </select>
              </div>

              <div>
                <label className="block text-white text-sm mb-2">Image Name</label>
                <input
                  type="text"
                  value={newImageName}
                  onChange={(e) => setNewImageName(e.target.value)}
                  placeholder="e.g., Hero Image"
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-white text-sm mb-2">
                  {imageType === 'url' ? 'Image URL' : imageType === 'base64' ? 'Base64 Data' : 'SVG Code'}
                </label>
                {imageType === 'svg' ? (
                  <textarea
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="<svg>...</svg>"
                    rows={6}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm font-mono resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder={
                      imageType === 'url'
                        ? 'https://images.unsplash.com/photo-...'
                        : 'data:image/png;base64,...'
                    }
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm"
                  />
                )}
              </div>

              {imageType === 'url' && (
                <div className="text-xs text-gray-400 space-y-3">
                  <p>💡 Quick Dummy Image Presets:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('https://picsum.photos/1200/600')}
                      className="px-2 py-1 bg-[#0a0a0a] border border-white/10 rounded text-emerald-400 hover:border-emerald-500/50 text-xs"
                    >
                      Hero (1200x600)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('https://picsum.photos/800/600')}
                      className="px-2 py-1 bg-[#0a0a0a] border border-white/10 rounded text-emerald-400 hover:border-emerald-500/50 text-xs"
                    >
                      Large (800x600)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('https://picsum.photos/400/300')}
                      className="px-2 py-1 bg-[#0a0a0a] border border-white/10 rounded text-emerald-400 hover:border-emerald-500/50 text-xs"
                    >
                      Card (400x300)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('https://i.pravatar.cc/150')}
                      className="px-2 py-1 bg-[#0a0a0a] border border-white/10 rounded text-emerald-400 hover:border-emerald-500/50 text-xs"
                    >
                      Avatar (150x150)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=Placeholder')}
                      className="px-2 py-1 bg-[#0a0a0a] border border-white/10 rounded text-emerald-400 hover:border-emerald-500/50 text-xs"
                    >
                      Placeholder
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200')}
                      className="px-2 py-1 bg-[#0a0a0a] border border-white/10 rounded text-emerald-400 hover:border-emerald-500/50 text-xs"
                    >
                      Unsplash Tech
                    </button>
                  </div>
                  <p className="mt-2">Or use free image sources:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Picsum: https://picsum.photos/WIDTH/HEIGHT</li>
                    <li>Unsplash: https://images.unsplash.com/photo-...</li>
                    <li>Pexels: https://images.pexels.com/photos/...</li>
                    <li>Placeholder: https://via.placeholder.com/WIDTHxHEIGHT</li>
                    <li>Avatars: https://i.pravatar.cc/SIZE?img=NUMBER</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50 rounded-lg text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddImage}
                disabled={loading || !newImageUrl.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





