'use client';

import React, { useState, useRef } from 'react';

type OperationType = 'convert' | 'remove-background' | 'convert-and-remove-background';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [operation, setOperation] = useState<OperationType>('convert-and-remove-background');
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
    
    const container = e.currentTarget.closest('.preview-container');
    if (container) {
      container.setPointerCapture(e.pointerId);
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
    
    const container = e.currentTarget.closest('.preview-container') as HTMLDivElement | null;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
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
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to process image');
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
              <option value="convert-and-remove-background">Convert + Remove BG</option>
              <option value="remove-background">Remove Background Only</option>
              <option value="convert">Convert Format Only</option>
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

          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={processing || !file}
            style={{ marginTop: 'auto' }}
          >
            RUN PIPELINE
          </button>
        </div>
      </aside>

      <header>
        <div className="logo-container">
          <h1 className="logo-text">chimera.</h1>
          <span className="logo-badge">Local Engine</span>
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
            <button 
              type="button" 
              onClick={() => setShowSettings(true)} 
              className="settings-toggle-btn"
            >
              ⚙️ CONFIG PARAMETERS
            </button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              className="settings-toggle-btn" 
              style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)', fontWeight: '700' }}
              disabled={processing}
            >
              🚀 RUN PIPELINE
            </button>
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
            <div 
              className="preview-container" 
              style={{ position: 'relative', width: '100%', touchAction: 'none' }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="preview-image" 
                style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none', WebkitUserSelect: 'none' }}
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={outputUrl} alt="Output" className="preview-image" style={{ width: '100%', height: 'auto', display: 'block' }} />
                <div className="preview-details">
                  <span>OUT SIZE: {outputSize}</span>
                  <a href={outputUrl} download={`chimera_${Date.now()}.${format}`} style={{ color: 'var(--text-primary)', textDecoration: 'underline', fontWeight: '700' }}>
                    DOWNLOAD ATTACHMENT
                  </a>
                </div>
              </div>
              <div className="success-banner">
                SUCCESS: Image operations finalized state-free. Mask compiled locally using BRIA RMBG-1.4.
              </div>
            </div>
          ) : (
            !processing && (
              <div style={{ border: '1px dashed var(--border-color)', height: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>
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
          <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '1rem', textTransform: 'uppercase' }}>REST Endpoints</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Fully stateless microservice entrypoints. Supports standard multi-part payload uploads.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>GET /api/health</h4>
              <pre>
{`curl -X GET https://chimerraa.vercel.app/api/health`}
              </pre>
            </div>

            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>POST /api/convert</h4>
              <pre>
{`curl -X POST https://chimerraa.vercel.app/api/convert \\
  -F "image=@photo.jpg" \\
  -F "format=webp" \\
  -F "quality=85"`}
              </pre>
            </div>

            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>POST /api/remove-background</h4>
              <pre>
{`curl -X POST https://chimerraa.vercel.app/api/remove-background \\
  -F "image=@photo.jpg" \\
  -F "background=transparent"`}
              </pre>
            </div>

            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>POST /api/process</h4>
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
            </div>
          </div>
        </div>

        {/* Tab 2: Telegram Bot */}
        <div className={`tab-content ${activeTab === 'telegram' ? 'active' : ''}`}>
          <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '1rem', textTransform: 'uppercase' }}>Webhook Setup</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Telegram message streams bind dynamically. Run the following to configure standard webhook routing:
          </p>
          <pre>
{`curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://chimerraa.vercel.app/api/telegram/webhook", "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"}'`}
          </pre>
        </div>

        {/* Tab 3: Architecture */}
        <div className={`tab-content ${activeTab === 'arch' ? 'active' : ''}`}>
          <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '1rem', textTransform: 'uppercase' }}>State-free Infrastructure</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Inference engine pipeline and network nodes:
          </p>

          <div className="arch-flow">
            <div className="flow-step">[client] sends multi-part image payload</div>
            <div className="flow-arrow">↓</div>
            <div className="flow-step">[gateway] validates file boundaries & limits</div>
            <div className="flow-arrow">↓</div>
            <div className="flow-step">[decoder] Sharp parses headers & unpacks pixel channels</div>
            <div className="flow-arrow">↓</div>
            <div className="flow-step">[onnx runtime] performs local BRIA RMBG-1.4 segmentation</div>
            <div className="flow-arrow">↓</div>
            <div className="flow-step">[compositor] composites background and encodes target format</div>
            <div className="flow-arrow">↓</div>
            <div className="flow-step">[client] receives binary output buffer</div>
          </div>
        </div>
      </section>
    </div>
  );
}
