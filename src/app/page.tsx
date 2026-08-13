'use client';

import React, { useState, useRef } from 'react';
import SpecularButton from './SpecularButton';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setOutputUrl(null);
      setError(null);
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
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setPreviewUrl(URL.createObjectURL(droppedFile));
        setOutputUrl(null);
        setError(null);
        initializeCropDimensions(droppedFile);
      } else {
        setError('Only image files are supported.');
      }
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
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during image processing.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container">
      {/* Settings Sidebar Backdrop */}
      <div 
        className={`sidebar-backdrop ${showSettings ? 'active' : ''}`}
        onClick={() => setShowSettings(false)}
      />

      {/* Settings Sidebar Panel */}
      <aside className={`sidebar ${showSettings ? 'active' : ''}`}>
        <div className="sidebar-header">
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚙️ System parameters
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
            <label htmlFor="operation">Image Operation</label>
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
              <label htmlFor="background">Background Fill</label>
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
                <label htmlFor="format">Output Format</label>
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
                <label htmlFor="quality">Quality Factor</label>
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
                Enable Extraction (Crop)
              </label>
            </div>

            {enableCrop && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="cropX">Left Offset (X)</label>
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
                    <label htmlFor="cropY">Top Offset (Y)</label>
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
                    <label htmlFor="cropWidth">Width (px)</label>
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
                    <label htmlFor="cropHeight">Height (px)</label>
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
          An industrial, stateless background-removal & format-conversion system.
          Driven entirely by local ONNX model segmentation and Sharp buffers.
        </p>
      </header>

      {/* Main Action Bar */}
      <div className="toolbar-container">
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          Interactive Workbench
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
            <h2 className="step-title">Source Preview</h2>
            <p className="step-description">Upload image and drag overlays to extract regions of interest.</p>
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
              <div className="dropzone-icon">🗂️</div>
              <p className="dropzone-text">Drag files here or click to browse directories</p>
              <p className="dropzone-hint">Limits: Max 20MB. Formats: JPEG, PNG, WebP, AVIF, BMP, TIFF</p>
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
            <h2 className="step-title">Processing Output</h2>
            <p className="step-description">Examine segmented results and download output buffers.</p>
          </div>

          {processing && (
            <div className="scrim-overlay">
              <span className="loader"></span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                [inference] running local segmenter model on CPU ...
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
                  <a href={outputUrl} download={`chimera_${Date.now()}.${format}`} style={{ color: 'var(--text-primary)', textDecoration: 'underline', fontWeight: '700' }}>
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

      {/* Developer API & Architecture Docs */}
      <section className="dev-section">
        <h2 className="dev-title">developer resources.</h2>
        
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            REST API
          </button>
          <button 
            className={`tab-btn ${activeTab === 'telegram' ? 'active' : ''}`}
            onClick={() => setActiveTab('telegram')}
          >
            Telegram Integration
          </button>
          <button 
            className={`tab-btn ${activeTab === 'arch' ? 'active' : ''}`}
            onClick={() => setActiveTab('arch')}
          >
            Architecture
          </button>
        </div>

        {/* Tab 1: HTTP API */}
        <div className={`tab-content ${activeTab === 'api' ? 'active' : ''}`}>
          <div className="dev-grid">
            <div className="endpoint-list">
              <button 
                type="button" 
                className={`endpoint-item ${activeEndpoint === 'process' ? 'active' : ''}`}
                onClick={() => setActiveEndpoint('process')}
              >
                <span className="method-badge post">POST</span> /api/process
              </button>
              <button 
                type="button" 
                className={`endpoint-item ${activeEndpoint === 'convert' ? 'active' : ''}`}
                onClick={() => setActiveEndpoint('convert')}
              >
                <span className="method-badge post">POST</span> /api/convert
              </button>
              <button 
                type="button" 
                className={`endpoint-item ${activeEndpoint === 'remove-bg' ? 'active' : ''}`}
                onClick={() => setActiveEndpoint('remove-bg')}
              >
                <span className="method-badge post">POST</span> /api/remove-bg
              </button>
              <button 
                type="button" 
                className={`endpoint-item ${activeEndpoint === 'health' ? 'active' : ''}`}
                onClick={() => setActiveEndpoint('health')}
              >
                <span className="method-badge get">GET</span> /api/health
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeEndpoint === 'process' && (
                <>
                  <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', textTransform: 'uppercase' }}>Unified Processing Pipeline</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Stateless multi-operation gateway. Combines visual cropping, local AI segmentation, background overlay fill, and format conversion in a single network pass.
                  </p>
                  
                  <div className="params-table-container">
                    <table className="params-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Type</th>
                          <th>Requirement</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="param-name">image</td>
                          <td className="param-type">File (binary)</td>
                          <td><span className="param-req">required</span></td>
                          <td>Target image to process. Maximum file size: 20MB.</td>
                        </tr>
                        <tr>
                          <td className="param-name">operation</td>
                          <td className="param-type">String</td>
                          <td><span className="param-req">required</span></td>
                          <td><code>convert</code> | <code>remove-background</code> | <code>convert-and-remove-background</code></td>
                        </tr>
                        <tr>
                          <td className="param-name">format</td>
                          <td className="param-type">String</td>
                          <td><span className="param-opt">optional</span></td>
                          <td>Output format: <code>webp</code> | <code>png</code> | <code>jpeg</code> | <code>avif</code>. Required if converting.</td>
                        </tr>
                        <tr>
                          <td className="param-name">background</td>
                          <td className="param-type">String</td>
                          <td><span className="param-opt">optional</span></td>
                          <td>Background fill options: <code>transparent</code> | <code>white</code> | <code>black</code> | Hex code color.</td>
                        </tr>
                        <tr>
                          <td className="param-name">cropX / cropY</td>
                          <td className="param-type">Number</td>
                          <td><span className="param-opt">optional</span></td>
                          <td>Pixel coordinates for top-left crop offset start.</td>
                        </tr>
                        <tr>
                          <td className="param-name">cropWidth / cropHeight</td>
                          <td className="param-type">Number</td>
                          <td><span className="param-opt">optional</span></td>
                          <td>Dimensions in pixels for region extraction bounds.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Example Curl Request</h4>
                  <pre>
{`curl -X POST https://chimerraa.vercel.app/api/process \\
  -F "image=@photo.jpg" \\
  -F "operation=convert-and-remove-background" \\
  -F "format=png" \\
  -F "background=white" \\
  -F "cropX=0" \\
  -F "cropY=0" \\
  -F "cropWidth=800" \\
  -F "cropHeight=600"`}
                  </pre>
                </>
              )}

              {activeEndpoint === 'convert' && (
                <>
                  <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', textTransform: 'uppercase' }}>Convert Image Format</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Re-encodes image buffer to target compressed formats without performing pixel layer segmentation.
                  </p>

                  <div className="params-table-container">
                    <table className="params-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Type</th>
                          <th>Requirement</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="param-name">image</td>
                          <td className="param-type">File (binary)</td>
                          <td><span className="param-req">required</span></td>
                          <td>Target image to convert. Maximum file size: 20MB.</td>
                        </tr>
                        <tr>
                          <td className="param-name">format</td>
                          <td className="param-type">String</td>
                          <td><span className="param-req">required</span></td>
                          <td>Target output format: <code>webp</code> | <code>png</code> | <code>jpeg</code> | <code>avif</code>.</td>
                        </tr>
                        <tr>
                          <td className="param-name">quality</td>
                          <td className="param-type">Number</td>
                          <td><span className="param-opt">optional</span></td>
                          <td>Quality parameter factor: value from 1 to 100 (defaults to 85).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Example Curl Request</h4>
                  <pre>
{`curl -X POST https://chimerraa.vercel.app/api/convert \\
  -F "image=@photo.jpg" \\
  -F "format=webp" \\
  -F "quality=85"`}
                  </pre>
                </>
              )}

              {activeEndpoint === 'remove-bg' && (
                <>
                  <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', textTransform: 'uppercase' }}>Remove Background Only</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Executes BRIA RMBG-1.4 image segmentation mask on the source buffer. Retains original format while altering the background transparency.
                  </p>

                  <div className="params-table-container">
                    <table className="params-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Type</th>
                          <th>Requirement</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="param-name">image</td>
                          <td className="param-type">File (binary)</td>
                          <td><span className="param-req">required</span></td>
                          <td>Target image to process. Maximum file size: 20MB.</td>
                        </tr>
                        <tr>
                          <td className="param-name">background</td>
                          <td className="param-type">String</td>
                          <td><span className="param-opt">optional</span></td>
                          <td>Solid fill background: <code>transparent</code> | <code>white</code> | <code>black</code> | hex values (defaults to <code>transparent</code>).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Example Curl Request</h4>
                  <pre>
{`curl -X POST https://chimerraa.vercel.app/api/remove-background \\
  -F "image=@photo.jpg" \\
  -F "background=transparent"`}
                  </pre>
                </>
              )}

              {activeEndpoint === 'health' && (
                <>
                  <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', textTransform: 'uppercase' }}>Health Probe</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Stateless endpoint to verify service availability and infrastructure nodes routing state.
                  </p>

                  <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Example Curl Request</h4>
                  <pre>
{`curl -X GET https://chimerraa.vercel.app/api/health`}
                  </pre>

                  <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Response Payload (200 OK)</h4>
                  <pre>
{`{
  "ok": true,
  "service": "chimera"
}`}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab 2: Telegram Bot */}
        <div className={`tab-content ${activeTab === 'telegram' ? 'active' : ''}`}>
          <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '1rem', textTransform: 'uppercase' }}>Webhook Configuration</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.88rem', lineHeight: '1.6' }}>
            Bind Telegram message updates to the Chimera webhook handler. Send a POST request to register your Bot Token:
          </p>
          <pre>
{`curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://chimerraa.vercel.app/api/telegram/webhook", "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"}'`}
          </pre>

          <h3 style={{ marginTop: '2.5rem', marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '1rem', textTransform: 'uppercase' }}>Bot Commands</h3>
          <div className="params-table-container">
            <table className="params-table">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Arguments</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="param-name">/start</td>
                  <td className="param-opt">none</td>
                  <td>Initializes connection and prints system parameter guidelines.</td>
                </tr>
                <tr>
                  <td className="param-name">/convert</td>
                  <td className="param-type">format [webp | png | jpg | avif]</td>
                  <td>Converts subsequent images to the specified format.</td>
                </tr>
                <tr>
                  <td className="param-name">/removebg</td>
                  <td className="param-type">bg [transparent | white | black]</td>
                  <td>Segments the background on images sent afterwards.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tab 3: Architecture */}
        <div className={`tab-content ${activeTab === 'arch' ? 'active' : ''}`}>
          <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '1rem', textTransform: 'uppercase' }}>Stateless Data Flow</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
            Chimera is an ephemeral processing node. No data is stored persistently.
          </p>

          <div className="arch-pipeline">
            <div className="arch-node">
              <span className="arch-node-num">STAGE 01</span>
              <h4 className="arch-node-title">Payload Ingestion</h4>
              <p className="arch-node-desc">Client POSTs form-data. Gateway extracts files, target operations, quality modifiers, and crop coordinates.</p>
            </div>
            <div className="arch-node">
              <span className="arch-node-num">STAGE 02</span>
              <h4 className="arch-node-title">Sanity Guarding</h4>
              <p className="arch-node-desc">System validates magic bytes, bounds limits, rate checks, and enforces maximum pixel counts constraints.</p>
            </div>
            <div className="arch-node">
              <span className="arch-node-num">STAGE 03</span>
              <h4 className="arch-node-title">Sharp Decoding</h4>
              <p className="arch-node-desc">The image header is parsed, decompression starts, and raw pixel color channels are loaded into server memory buffer.</p>
            </div>
            <div className="arch-node">
              <span className="arch-node-num">STAGE 04</span>
              <h4 className="arch-node-title">AI Segmentation</h4>
              <p className="arch-node-desc">Local ONNX Runtime executes the BRIA RMBG-1.4 model on CPU, producing a high-resolution alpha mask.</p>
            </div>
            <div className="arch-node">
              <span className="arch-node-num">STAGE 05</span>
              <h4 className="arch-node-title">Compositing Layer</h4>
              <p className="arch-node-desc">Sharp merges the alpha mask back, applies flat background fills, and crops extraction coordinates.</p>
            </div>
            <div className="arch-node">
              <span className="arch-node-num">STAGE 06</span>
              <h4 className="arch-node-title">Format Encoding</h4>
              <p className="arch-node-desc">Composited pixels are compressed (WebP, PNG, JPEG, AVIF) and returned as a direct download stream.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
