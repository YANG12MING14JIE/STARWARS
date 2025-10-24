
import React, { useState, useRef } from 'react';
import { editImage } from '../services/geminiService';
import Button from './ui/Button';
import Loader from './ui/Loader';
import { fileToBase64 } from '../utils';

const ImageEditView: React.FC = () => {
  const [prompt, setPrompt] = useState('Add a retro, grainy film filter.');
  const [originalImage, setOriginalImage] = useState<{ file: File; preview: string } | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setOriginalImage({ file, preview: URL.createObjectURL(file) });
      setEditedImage(null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !originalImage) {
      setError("Please upload an image and provide an edit prompt.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const imageBase64 = await fileToBase64(originalImage.file);
      const resultBase64 = await editImage(prompt, imageBase64, originalImage.file.type);
      setEditedImage(`data:image/png;base64,${resultBase64}`);
    } catch (err: any) {
      setError(err.message || 'Failed to edit image.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800">
      <header className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Image Editing (Gemini 2.5 Flash Image)</h2>
        <p className="text-sm text-gray-400">Upload an image and edit it with a text prompt.</p>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-full md:w-auto mb-4">
              {originalImage ? 'Change Image' : 'Upload Image'}
            </Button>

            {originalImage && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">Edit Instruction</label>
                    <textarea
                        id="prompt"
                        rows={2}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Remove the person in the background"
                        disabled={isLoading}
                    />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                    {isLoading ? 'Editing...' : 'Apply Edit'}
                </Button>
              </form>
            )}

            {error && <div className="mt-6 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="font-bold text-center mb-2">Original</h3>
                <div className="bg-gray-900 p-2 rounded-lg aspect-square flex items-center justify-center">
                  {originalImage ? <img src={originalImage.preview} alt="Original" className="rounded-md max-h-full max-w-full" /> : <p className="text-gray-500">Upload an image to start</p>}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-center mb-2">Edited</h3>
                <div className="bg-gray-900 p-2 rounded-lg aspect-square flex items-center justify-center">
                  {isLoading && <Loader text="Applying edit..."/>}
                  {editedImage && <img src={editedImage} alt="Edited" className="rounded-md max-h-full max-w-full" />}
                  {!isLoading && !editedImage && <p className="text-gray-500">Your edited image will appear here</p>}
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditView;
