import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './App.css'

// Professional color presets with icons and categories
const colorPresets = [
  {
    category: 'Professional',
    colors: [
      { name: 'Corporate Blue', color: '#0A66C2', icon: '🏢' },
      { name: 'Success Green', color: '#0A855C', icon: '💼' },
      { name: 'Executive Gray', color: '#383838', icon: '👔' },
      { name: 'Brand Red', color: '#E51A2B', icon: '🎯' },
    ]
  },
  {
    category: 'Studio',
    colors: [
      { name: 'Transparent', color: 'transparent', icon: '⬜' },
      { name: 'Pure White', color: '#FFFFFF', icon: '⚪' },
      { name: 'Studio Gray', color: '#F5F5F5', icon: '🎨' },
      { name: 'Soft Black', color: '#2C2C2C', icon: '⚫' },
    ]
  },
  {
    category: 'Creative',
    colors: [
      { name: 'Rainbow', color: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)', icon: '🌈' },
      { name: 'Sunset', color: 'linear-gradient(45deg, #FF512F, #DD2476)', icon: '🌅' },
      { name: 'Nature', color: 'linear-gradient(45deg, #134E5E, #71B280)', icon: '🌿' },
      { name: 'Royal', color: 'linear-gradient(45deg, #141E30, #243B55)', icon: '👑' },
    ]
  }
] as const

// Custom color suggestions
const recentColors = [
  '#FF5733', '#33FF57', '#3357FF', '#FF33F5',
  '#33FFF5', '#F5FF33', '#FF3333', '#33FF33'
] as const

function App() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBackground, setSelectedBackground] = useState('#FFFFFF')
  const [customColor, setCustomColor] = useState('#FFFFFF')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedCategory, setSelectedCategory] = useState('Professional')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [recentCustomColors, setRecentCustomColors] = useState<string[]>([])

  // Cleanup object URLs when component unmounts or when processedImage changes
  useEffect(() => {
    return () => {
      if (processedImage) {
        URL.revokeObjectURL(processedImage)
      }
    }
  }, [processedImage])

  const validateImage = (file: File) => {
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Please upload a valid image file (JPEG, PNG, or WebP)')
    }

    if (file.size > MAX_SIZE) {
      throw new Error('Image size should be less than 10MB')
    }

    return true
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)
    
    if (file) {
      try {
        validateImage(file)
        setSelectedImage(file)
        setProcessedImage(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error uploading image')
        setSelectedImage(null)
      }
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setError(null)
    
    const file = event.dataTransfer.files[0]
    if (file) {
      try {
        validateImage(file)
        setSelectedImage(file)
        setProcessedImage(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error uploading image')
        setSelectedImage(null)
      }
    }
  }

  const applyBackground = (imageUrl: string, backgroundColor: string) => {
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Draw background
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw image
      ctx.drawImage(img, 0, 0)

      // Convert to URL and update state
      canvas.toBlob((blob) => {
        if (blob) {
          if (processedImage) {
            URL.revokeObjectURL(processedImage)
          }
          const newUrl = URL.createObjectURL(blob)
          setProcessedImage(newUrl)
        }
      }, 'image/png')
    }
    img.src = imageUrl
  }

  const handleBackgroundChange = (color: string) => {
    setSelectedBackground(color)
    if (processedImage) {
      applyBackground(processedImage, color)
    }
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    handleBackgroundChange(color)
    
    // Add to recent colors
    setRecentCustomColors(prev => {
      const newColors = [color, ...prev.filter(c => c !== color)]
      return newColors.slice(0, 8) // Keep only last 8 colors
    })
  }

  const removeBackground = async () => {
    if (!selectedImage) return

    setLoading(true)
    setError(null)
    
    const formData = new FormData()
    formData.append('image_file', selectedImage)

    try {
      const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
        headers: {
          'X-Api-Key': import.meta.env.VITE_REMOVE_BG_API_KEY,
        },
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      })

      // Cleanup previous object URL if it exists
      if (processedImage) {
        URL.revokeObjectURL(processedImage)
      }

      const blob = new Blob([response.data], { type: 'image/png' })
      const imageUrl = URL.createObjectURL(blob)
      applyBackground(imageUrl, selectedBackground)
    } catch (error) {
      console.error('Error removing background:', error)
      setError(error instanceof Error ? error.message : 'Error processing image. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!processedImage) return;

    try {
      // Fetch the image data
      const response = await fetch(processedImage);
      const blob = await response.blob();

      // Create a temporary link
      const link = document.createElement('a');
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Set up link properties
      link.href = blobUrl;
      link.download = 'removed-background.png';
      
      // Programmatically click the link
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback for mobile devices
      window.open(processedImage, '_blank');
    }
  };

  const ColorIcon = ({ color, selected, onClick, icon, name }: { 
    color: string, 
    selected: boolean, 
    onClick: () => void,
    icon: string,
    name: string
  }) => (
    <button
      onClick={onClick}
      className={`relative group flex flex-col items-center p-4 rounded-lg transition-all ${
        selected 
          ? 'ring-2 ring-purple-500 shadow-lg' 
          : 'hover:ring-2 hover:ring-purple-300'
      }`}
      style={{
        background: color.startsWith('linear-gradient') || color.startsWith('conic-gradient') ? color : undefined,
        backgroundColor: color.startsWith('#') ? color : undefined,
        backgroundImage: color === 'transparent' ? 
          'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 
          undefined,
        backgroundSize: color === 'transparent' ? '20px 20px' : undefined,
        backgroundPosition: color === 'transparent' ? '0 0, 0 10px, 10px -10px, -10px 0px' : undefined
      }}
    >
      <span className="text-xl mb-1">{icon}</span>
      <span className={`text-xs font-medium ${
        color === '#FFFFFF' || color.startsWith('linear-gradient') || color === 'transparent'
          ? 'text-gray-800' 
          : ['#2C2C2C', '#1B365D', '#383838'].includes(color)
            ? 'text-white'
            : 'text-gray-800'
      }`}>
        {name}
      </span>
      {selected && (
        <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-1">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2">Background Remover</h1>
        <p className="text-gray-600 text-center mb-8">
          Remove backgrounds from your images instantly with AI
        </p>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <div className="flex flex-col items-center">
              <svg
                className="w-12 h-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <h3 className="text-lg font-semibold mb-2">Upload your image</h3>
              <p className="text-gray-500">Click or drag and drop your image here</p>
              <p className="text-gray-400 text-sm mt-2">Supported formats: JPEG, PNG, WebP (max 10MB)</p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          {selectedImage && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Selected Image:</h3>
              <div className="border rounded-lg p-4 mb-6">
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Selected"
                  className="max-w-full h-auto mx-auto max-h-[400px] object-contain"
                />
              </div>

              <div className="mb-6">
                <h4 className="text-md font-semibold mb-3">Choose Background:</h4>
                
                {/* Category Tabs */}
                <div className="flex space-x-4 mb-4 border-b">
                  {colorPresets.map(preset => (
                    <button
                      key={preset.category}
                      onClick={() => setSelectedCategory(preset.category)}
                      className={`pb-2 px-4 text-sm font-medium transition-all ${
                        selectedCategory === preset.category
                          ? 'border-b-2 border-purple-500 text-purple-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {preset.category}
                    </button>
                  ))}
                </div>

                {/* Color Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {colorPresets
                    .find(p => p.category === selectedCategory)
                    ?.colors.map(preset => (
                      <ColorIcon
                        key={preset.color}
                        color={preset.color}
                        selected={selectedBackground === preset.color}
                        onClick={() => handleBackgroundChange(preset.color)}
                        icon={preset.icon}
                        name={preset.name}
                      />
                    ))}
                </div>

                {/* Custom Color Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Custom Color</h5>
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="text-sm text-purple-600 hover:text-purple-700"
                    >
                      {showColorPicker ? 'Hide Picker' : 'Show Picker'}
                    </button>
                  </div>

                  {showColorPicker && (
                    <div className="mb-4">
                      <div className="flex items-center gap-6 mb-3">
                        <div className="relative group">
                          <input
                            type="color"
                            value={customColor}
                            onChange={handleCustomColorChange}
                            className="w-16 h-16 rounded-full cursor-pointer overflow-hidden appearance-none"
                            style={{
                              background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)'
                            }}
                          />
                          <div className="absolute inset-0 rounded-full shadow-inner pointer-events-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded border border-gray-200"
                              style={{ backgroundColor: customColor }}
                            />
                            <span className="text-sm font-medium text-gray-600">
                              {customColor.toUpperCase()}
                            </span>
                          </div>
                          <button
                            onClick={() => handleBackgroundChange('transparent')}
                            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Set Transparent
                          </button>
                        </div>
                      </div>
                      
                      {/* Recent Colors */}
                      {recentCustomColors.length > 0 && (
                        <div>
                          <h6 className="text-xs text-gray-500 mb-2">Recent Colors:</h6>
                          <div className="flex flex-wrap gap-2">
                            {recentCustomColors.map((color, index) => (
                              <button
                                key={index}
                                onClick={() => handleBackgroundChange(color)}
                                className={`w-8 h-8 rounded-full transition-all ${
                                  selectedBackground === color
                                    ? 'ring-2 ring-purple-500'
                                    : 'hover:ring-2 hover:ring-purple-300'
                                }`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Colors */}
                      <div className="mt-3">
                        <h6 className="text-xs text-gray-500 mb-2">Suggested Colors:</h6>
                        <div className="flex flex-wrap gap-2">
                          {recentColors.map((color, index) => (
                            <button
                              key={index}
                              onClick={() => handleBackgroundChange(color)}
                              className={`w-8 h-8 rounded-full transition-all ${
                                selectedBackground === color
                                  ? 'ring-2 ring-purple-500'
                                  : 'hover:ring-2 hover:ring-purple-300'
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={removeBackground}
                  disabled={loading}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300"
                >
                  {loading ? 'Processing...' : 'Remove Background'}
                </button>
              </div>
            </div>
          )}

          {processedImage && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Result:</h3>
              <div className="border rounded-lg p-4">
                <img
                  src={processedImage}
                  alt="Processed"
                  className="max-w-full h-auto mx-auto max-h-[400px] object-contain"
                />
                <div className="text-center mt-4">
                  <button
                    onClick={handleDownload}
                    className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Download Image
                  </button>
                </div>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  )
}

export default App
