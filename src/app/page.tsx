'use client';

import React, { useState, useRef } from 'react';
import SpecularButton from './SpecularButton';
import MoltenMetal from './MoltenMetal';
import WarpText from './WarpText';

type OperationType = 'convert' | 'remove-background' | 'convert-and-remove-background';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [operation, setOperation] = useState<OperationType>('convert');
  const [format, setFormat] = useState<string>('webp');
  const [quality, setQuality] = useState<number>(85);
  const [background, setBackground] = useState<string>('transparent');
  
  // Cropping variables
  const [enableCrop, setEnableCrop] = useState<boolean>(false);
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropWidth, setCropWidth] = useState<number>(100);
  const [cropHeight, setCropHeight] = useState<number>(100);
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [boxStart, setBoxStart] = useState<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 100, h: 100 });

  // Sidebar visibility
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('api');
  const [activeEndpoint, setActiveEndpoint] = useState<string>('process');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const initializeCropDimensions = (selectedFile: File) => {
    const img = new Image();
    img.onload = () => {
      setNaturalWidth(img.naturalWidth);
      setNaturalHeight(img.naturalHeight);
      setCropWidth(img.naturalWidth);
      setCropHeight(img.naturalHeight);
      setCropX(0);
      setCropY(0);
    };
    img.src = URL.createObjectURL(selectedFile);
  };

  const handlePointerDown = (e: React.PointerEvent, action: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    
    const wrapper = e.currentTarget.closest('.image-crop-wrapper');
    if (wrapper) {
      wrapper.setPointerCapture(e.pointerId);
    }
    
    if (action === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
    setBoxStart({ x: cropX, y: cropY, w: cropWidth, h: cropHeight });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging && !isResizing) return;
    
    const wrapper = e.currentTarget.closest('.image-crop-wrapper') as HTMLDivElement | null;
    if (!wrapper) return;
    
    const rect = wrapper.getBoundingClientRect();
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    
    const deltaX = (e.clientX - dragStart.x) * scaleX;
    const deltaY = (e.clientY - dragStart.y) * scaleY;
    
    if (isDragging) {
      const targetX = Math.round(boxStart.x + deltaX);
      const targetY = Math.round(boxStart.y + deltaY);
      setCropX(Math.max(0, Math.min(naturalWidth - boxStart.w, targetX)));
      setCropY(Math.max(0, Math.min(naturalHeight - boxStart.h, targetY)));
    } else if (isResizing) {
      const targetW = Math.round(boxStart.w + deltaX);
      const targetH = Math.round(boxStart.h + deltaY);
      setCropWidth(Math.max(10, Math.min(naturalWidth - boxStart.x, targetW)));
      setCropHeight(Math.max(10, Math.min(naturalHeight - boxStart.y, targetH)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsResizing(false);
    
    const wrapper = e.currentTarget.closest('.image-crop-wrapper');
    if (wrapper) {
      try {
        wrapper.releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
  };

  const validateUploadedFile = (selectedFile: File): boolean => {
    const maxSize = 20 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size exceeds the 20MB limit.');
      return false;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'];
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.avif'];
    const fileNameLower = selectedFile.name.toLowerCase();
    const hasAllowedExtension = allowedExtensions.some(ext => fileNameLower.endsWith(ext));

    if (!allowedTypes.includes(selectedFile.type) && !hasAllowedExtension) {
      setError('Unsupported file type. Only PNG, JPG, WebP, and AVIF are supported.');
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setError(null);
      if (!validateUploadedFile(selectedFile)) {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setOutputUrl(null);
      initializeCropDimensions(selectedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setError(null);
      if (!validateUploadedFile(droppedFile)) {
        return;
      }
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
      setOutputUrl(null);
      initializeCropDimensions(droppedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setOutputUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!file) return;

    setProcessing(true);
    setError(null);
    setOutputUrl(null);
    setShowSettings(false); // Close settings panel on run to expose output

    const formData = new FormData();
    formData.append('image', file);
    formData.append('operation', operation);
    
    if (operation === 'convert' || operation === 'convert-and-remove-background') {
      formData.append('format', format);
      formData.append('quality', quality.toString());
    }
    
    if (operation === 'remove-background' || operation === 'convert-and-remove-background') {
      formData.append('background', background);
    }

    if (enableCrop) {
      formData.append('cropX', cropX.toString());
      formData.append('cropY', cropY.toString());
      formData.append('cropWidth', cropWidth.toString());
      formData.append('cropHeight', cropHeight.toString());
    }

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errMsg = 'Failed to process image';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } catch (e) {
            // ignore
          }
        } else {
          try {
            const text = await response.text();
            if (text && text.length < 200) {
              errMsg = text;
            } else {
              errMsg = `Server error (${response.status}): ${response.statusText || 'Internal Server Error'}`;
            }
          } catch (e) {
            errMsg = `Server error (${response.status})`;
          }
        }
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      
      const sizeKb = (blob.size / 1024).toFixed(1);
      setOutputSize(`${sizeKb} KB`);

      const contentDisposition = response.headers.get('content-disposition');
      let filename = '';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      if (!filename) {
        let ext = 'png';
        if (operation === 'convert' || operation === 'convert-and-remove-background') {
          ext = format === 'jpeg' ? 'jpg' : format;
        }
        const suffix = operation === 'convert' ? '-converted' : '-processed';
        const originalName = file.name || 'image';
        const lastDotIndex = originalName.lastIndexOf('.');
        const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
        filename = `${baseName}${suffix}.${ext}`;
      }
      setOutputFilename(filename);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during image processing.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container">
      {/* Ambient WebGL Liquid Metal Flow */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none', opacity: 0.38 }}>
        <MoltenMetal
          color1="#09090b"
          color2="#4f46e5"
          color3="#c084fc"
          speed={0.18}
          scale={3.2}
          detail={4}
          glow={2.2}
          coreSize={0.09}
          swirl={1.0}
          fold={-0.15}
          blackPoint={0.05}
          brightness={1.4}
          colorMode="molten"
          grain={true}
          grainIntensity={0.04}
          mouseInteraction={true}
          mouseStrength={0.25}
          opacity={1.0}
        />
      </div>

      {/* Settings Sidebar Backdrop */}
      <div 
        className={`sidebar-backdrop ${showSettings ? 'active' : ''}`}
        onClick={() => setShowSettings(false)}
      />

      {/* Settings Sidebar Panel */}
      <aside className={`sidebar ${showSettings ? 'active' : ''}`}>
        <div className="sidebar-header">
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚙️ Settings
          </h3>
          <button 
            type="button" 
            className="sidebar-close-btn"
            onClick={() => setShowSettings(false)}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flexGrow: 1 }}>
          <div className="form-group">
            <label htmlFor="operation">Operation</label>
            <select 
              id="operation"
              className="select-control"
              value={operation}
              onChange={(e) => setOperation(e.target.value as OperationType)}
              disabled={processing || !file}
            >
              <option value="convert">Convert Format</option>
              <option value="remove-background">Remove Background</option>
              <option value="convert-and-remove-background">Convert + Remove BG</option>
            </select>
          </div>

          {(operation === 'remove-background' || operation === 'convert-and-remove-background') && (
            <div className="form-group">
              <label htmlFor="background">Background</label>
              <select 
                id="background"
                className="select-control"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                disabled={processing || !file}
              >
                <option value="transparent">Transparent alpha</option>
                <option value="white">Solid White</option>
                <option value="black">Solid Black</option>
                <option value="#ff0000">Chroma Red</option>
                <option value="#00ff00">Chroma Green</option>
                <option value="#0000ff">Chroma Blue</option>
              </select>
            </div>
          )}

          {(operation === 'convert' || operation === 'convert-and-remove-background') && (
            <>
              <div className="form-group">
                <label htmlFor="format">Format</label>
                <select 
                  id="format"
                  className="select-control"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  disabled={processing || !file}
                >
                  <option value="webp">WebP (Compressed)</option>
                  <option value="png">PNG (Lossless)</option>
                  <option value="jpeg">JPEG (Solid)</option>
                  <option value="avif">AVIF (Ultra)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quality">Quality</label>
                <div className="slider-container">
                  <input 
                    id="quality"
                    type="range" 
                    min="1" 
                    max="100" 
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                    className="slider-control"
                    disabled={processing || !file}
                  />
                  <span className="slider-val">{quality}%</span>
                </div>
              </div>
            </>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <input 
                type="checkbox" 
                id="enableCrop" 
                checked={enableCrop} 
                onChange={(e) => setEnableCrop(e.target.checked)} 
                disabled={processing || !file}
                style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: 'var(--text-primary)' }}
              />
              <label htmlFor="enableCrop" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                Crop Image
              </label>
            </div>

            {enableCrop && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="cropX">X Offset</label>
                    <input 
                      type="number" 
                      id="cropX" 
                      className="input-control" 
                      value={cropX} 
                      onChange={(e) => {
                        const val = Math.min(Math.max(0, naturalWidth - 1), Math.max(0, parseInt(e.target.value, 10) || 0));
                        setCropX(val);
                        if (val + cropWidth > naturalWidth) {
                          setCropWidth(naturalWidth - val);
                        }
                      }}
                      disabled={processing}
                      min="0"
                      max={Math.max(0, naturalWidth - 1)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cropY">Y Offset</label>
                    <input 
                      type="number" 
                      id="cropY" 
                      className="input-control" 
                      value={cropY} 
                      onChange={(e) => {
                        const val = Math.min(Math.max(0, naturalHeight - 1), Math.max(0, parseInt(e.target.value, 10) || 0));
                        setCropY(val);
                        if (val + cropHeight > naturalHeight) {
                          setCropHeight(naturalHeight - val);
                        }
                      }}
                      disabled={processing}
                      min="0"
                      max={Math.max(0, naturalHeight - 1)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="cropWidth">Width</label>
                    <input 
                      type="number" 
                      id="cropWidth" 
                      className="input-control" 
                      value={cropWidth} 
                      onChange={(e) => {
                        const maxW = Math.max(1, naturalWidth - cropX);
                        const val = Math.min(maxW, Math.max(1, parseInt(e.target.value, 10) || 1));
                        setCropWidth(val);
                      }}
                      disabled={processing}
                      min="1"
                      max={Math.max(1, naturalWidth - cropX)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cropHeight">Height</label>
                    <input 
                      type="number" 
                      id="cropHeight" 
                      className="input-control" 
                      value={cropHeight} 
                      onChange={(e) => {
                        const maxH = Math.max(1, naturalHeight - cropY);
                        const val = Math.min(maxH, Math.max(1, parseInt(e.target.value, 10) || 1));
                        setCropHeight(val);
                      }}
                      disabled={processing}
                      min="1"
                      max={Math.max(1, naturalHeight - cropY)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <SpecularButton 
            type="button" 
            size="lg"
            radius={4}
            tint="#ffffff"
            tintOpacity={1}
            textColor="#09090b"
            lineColor="#ffffff"
            baseColor="#fafafa"
            intensity={1.0}
            onClick={handleSubmit}
            disabled={processing || !file}
            style={{ marginTop: 'auto', width: '100%', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}
          >
            RUN
          </SpecularButton>
        </div>
      </aside>

      <header>
        <div className="logo-container">
          <h1 className="logo-text">chimera.</h1>
        </div>
        <p className="tagline">
          Easily remove image backgrounds and convert formats. Fast, private, and runs entirely in your browser.
        </p>
      </header>

      {/* Main Action Bar */}
      <div className="toolbar-container">
        <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.35rem', fontWeight: '700' }}>
         Workbench
        </h2>
        {file && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <SpecularButton 
              type="button" 
              size="sm"
              radius={4}
              tint="#ffffff"
              tintOpacity={0.05}
              textColor="#fafafa"
              lineColor="#ffffff"
              baseColor="#18181b"
              intensity={0.8}
              onClick={() => setShowSettings(true)}
              style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}
            >
              SETTINGS
            </SpecularButton>
            <SpecularButton 
              type="button" 
              size="sm"
              radius={4}
              tint="#ffffff"
              tintOpacity={1}
              textColor="#09090b"
              lineColor="#ffffff"
              baseColor="#fafafa"
              intensity={1.0}
              onClick={handleSubmit}
              disabled={processing}
              style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}
            >
              RUN
            </SpecularButton>
          </div>
        )}
      </div>

      {/* 2-Column Desktop Grid Layout */}
      <div className="step-container">
        {/* Left Column: Source Preview with Draggable Cropper */}
        <section className="step-block">
          <div className="step-number">01</div>
          <div className="step-header">
            <h2 className="step-title">Upload Image</h2>
            <p className="step-description">Select an image to process.</p>
          </div>

          {!previewUrl ? (
            <div 
              className={`dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-icon">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="40" 
                  height="40" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
              </div>
              <p className="dropzone-text">Drag an image here or click to upload</p>
              <p className="dropzone-hint">Max size: 20MB. Supports: PNG, JPG, WebP, AVIF</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </div>
          ) : (
            <div className="preview-container">
              <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                <div 
                  className="image-crop-wrapper" 
                  style={{ 
                    position: 'relative', 
                    maxWidth: '100%', 
                    maxHeight: '100%', 
                    aspectRatio: `${naturalWidth} / ${naturalHeight}`,
                    touchAction: 'none' 
                  }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none', WebkitUserSelect: 'none' }}
                  />
                  {enableCrop && naturalWidth > 0 && naturalHeight > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      overflow: 'hidden'
                    }}>
                      {/* Draggable/Resizable Crop Highlight overlay */}
                      <div 
                        onPointerDown={(e) => handlePointerDown(e, 'drag')}
                        style={{
                          position: 'absolute',
                          border: '1.5px dashed #fafafa',
                          boxShadow: '0 0 0 9999px rgba(9, 9, 11, 0.75)',
                          left: `${(cropX / naturalWidth) * 100}%`,
                          top: `${(cropY / naturalHeight) * 100}%`,
                          width: `${(cropWidth / naturalWidth) * 100}%`,
                          height: `${(cropHeight / naturalHeight) * 100}%`,
                          boxSizing: 'border-box',
                          cursor: isDragging ? 'grabbing' : 'grab',
                          pointerEvents: 'auto',
                          touchAction: 'none'
                        }}
                      >
                        {/* Corner Resize Handle */}
                        <div 
                          onPointerDown={(e) => handlePointerDown(e, 'resize')}
                          style={{
                            position: 'absolute',
                            right: '-6px',
                            bottom: '-6px',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#fafafa',
                            border: '1.5px solid #09090b',
                            cursor: 'se-resize',
                            pointerEvents: 'auto',
                            zIndex: 20
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="preview-details">
                <span>FILE: {file?.name}</span>
                <span>SIZE: {(file!.size / 1024 / 1024).toFixed(2)} MB</span>
                <button type="button" onClick={removeFile} className="remove-preview-btn">REMOVE FILE</button>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Processing Output */}
        <section className="step-block" style={{ opacity: outputUrl || processing ? 1 : 0.45, transition: 'opacity 0.2s ease', minHeight: '300px' }}>
          <div className="step-number">02</div>
          <div className="step-header">
            <h2 className="step-title">Result</h2>
            <p className="step-description">Download your processed image below.</p>
          </div>

          {processing && (
            <div className="scrim-overlay">
              <span className="loader"></span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Processing image...
              </p>
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--error)', backgroundColor: 'rgba(239, 68, 68, 0.04)', padding: '1rem', border: '1px solid var(--error)', marginBottom: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              ERR: {error}
            </div>
          )}

          {outputUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="preview-container checkerboard">
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={outputUrl} alt="Output" className="preview-image" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
                </div>
                <div className="preview-details">
                  <span>OUT SIZE: {outputSize}</span>
                  <a href={outputUrl} download={outputFilename} style={{ color: 'var(--text-primary)', textDecoration: 'underline', fontWeight: '700' }}>
                    DOWNLOAD ATTACHMENT
                  </a>
                </div>
              </div>
            </div>
          ) : (
            !processing && (
              <div style={{ border: '1px dashed var(--border-color)', height: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.88rem', fontFamily: 'var(--font-mono)', borderRadius: '2px', backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                <span>[AWAITING PIPELINE RUN]</span>
              </div>
            )
          )}
        </section>
      </div>

      {/* Ephemeral Platform Policy & Dev Resources */}
      <section className="info-sections-container">
        <details className="info-details-item" id="stateless">
          <summary className="info-summary-title">Stateless Guarantee</summary>
          <div className="info-content-body">
            <p>
              Chimera is engineered to be fully stateless. When you upload an image for format conversion, cropping, or background removal, it is processed ephemerally in server memory and returned directly to your browser.
            </p>
            <p>
              We do not persist files, retain logs of image metadata, or maintain database storage. Your data remains yours alone.
            </p>
          </div>
        </details>

        <details className="info-details-item" id="privacy">
          <summary className="info-summary-title">Privacy Policy</summary>
          <div className="info-content-body">
            <p>
              <strong>Secure Transit:</strong> All communications and files sent to our API endpoints are encrypted in transit using standard HTTPS protocol.
            </p>
            <p>
              <strong>No Telemetry:</strong> We do not deploy tracking scripts, third-party analytics cookies, or behavioral advertising tracking tools on this platform.
            </p>
            <p>
              <strong>Zero Log Retention:</strong> Server logs are configured strictly for performance tuning and monitoring, logging response status codes rather than request parameters or image payloads.
            </p>
          </div>
        </details>

        <details className="info-details-item" id="developer">
          <summary className="info-summary-title">Developer REST API</summary>
          <div className="info-content-body">
            <p>
              Integrate Chimera into your own automated workflows, scripts, or apps using our clean, authenticated JSON API endpoints.
            </p>
            <div className="api-code-block">
              <strong>Format Conversion & Processing:</strong>
              <pre>
{`curl -X POST https://chimera.sh/api/process \\
  -F "file=@image.png" \\
  -F "format=webp" \\
  -F "operation=convert"`}
              </pre>
            </div>
            <div className="api-code-block" style={{ marginTop: '1rem' }}>
              <strong>Background Removal:</strong>
              <pre>
{`curl -X POST https://chimera.sh/api/process \\
  -F "file=@image.jpg" \\
  -F "operation=remove-background"`}
              </pre>
            </div>
          </div>
        </details>
      </section>

      <div className="footer-separator" />
      <footer className="cosmos-footer">
        <div className="footer-top">
          <div className="footer-tagline-section">
            <div className="rotating-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
            <p className="footer-tagline">
              Chimera is the stateless image editor<br />
              you&apos;ve been searching for.
            </p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-link-col">
              <h4>USEFUL</h4>
              <ul>
                <li><a href="#workbench">Workbench</a></li>
                <li><a href="https://t.me/ChimeraImageBot" target="_blank" rel="noreferrer">Telegram Bot</a></li>
              </ul>
            </div>
            <div className="footer-link-col">
              <h4>LEGAL</h4>
              <ul>
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#stateless">Stateless Guarantee</a></li>
              </ul>
            </div>
            <div className="footer-link-col">
              <h4>DEVELOPER</h4>
              <ul>
                <li><a href="https://github.com/krreeshhh/Chimera" target="_blank" rel="noreferrer">GitHub</a></li>
                <li><a href="#developer">REST API</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="oversized-wordmark-container">
            <h1 className="oversized-wordmark">
              <div className="wordmark-text-warp">
                <WarpText
                  text="CHIMERA"
                  color="rgba(255, 255, 255, 0.05)"
                  warpStrength={0.06}
                  warpScale={1.5}
                  speed={0.4}
                  pointerInfluence={0.35}
                  pointerStrength={0.35}
                  refraction={0.015}
                  ripple
                  fontSize="clamp(3rem, 14.5vw, 11rem)"
                  fontWeight={800}
                  letterSpacing="-0.04em"
                  fontFamily="inherit"
                  style={{ height: 'clamp(3rem, 14.5vw, 11rem)', width: '100%' }}
                />
              </div>
              <span className="footer-copyright-badge">©</span>
            </h1>
          </div>
        </div>
      </footer>
    </div>
  );
}
