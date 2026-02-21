# Penguin Model Setup

## Files Needed
Place these files in this folder:
- `scene.gltf` - The penguin GLTF model file
- `scene.bin` - The binary data file
- `Material_baseColor.png` - Already added ✅

## After Adding Files
1. Open `scene.gltf` in a text editor
2. Find the "images" section
3. Make sure the texture path is just the filename:
   ```json
   "images": [
     {
       "uri": "Material_baseColor.png"
     }
   ],
   ```
4. Make sure the "buffers" section references:
   ```json
   "buffers": [
     {
       "byteLength": XXXXX,
       "uri": "scene.bin"
     }
   ],
   ```

## Current Status
- ✅ Texture file added
- ❌ scene.gltf needed
- ❌ scene.bin needed

Once you add the penguin files, we can randomly assign models to players!
