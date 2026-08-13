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
      setCropWidth(img.naturalWidth);
      setCropHeight(img.naturalHeight);
      setCropX(0);
      setCropY(0);
    };
    img.src = URL.createObjectURL(selectedFile);
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
    e.preventDefault();
    if (!file) return;

    setProcessing(true);
    setError(null);
    setOutputUrl(null);

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
      <header>
        <div className="logo-container">
          <h1 className="logo-text">chimera.</h1>
        </div>
        <p className="tagline">
          An industrial, stateless background-removal & format-conversion system.
          Driven entirely by local ONNX model segmentation and Sharp buffers.
        </p>
      </header>

      <div className="step-container">
        {/* Step 1: Upload */}
        <section className="step-block">
          <div className="step-number">01</div>
          <div className="step-header">
            <h2 className="step-title">Source Image</h2>
            <p className="step-description">Provide the input image you wish to segment or convert.</p>
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
              <p className="dropzone-text">Drag files here or click to browse raw directories</p>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Preview" className="preview-image" />
              <div className="preview-details">
                <span>FILE: {file?.name}</span>
                <span>SIZE: {(file!.size / 1024 / 1024).toFixed(2)} MB</span>
                <button type="button" onClick={removeFile} className="remove-preview-btn">REMOVE FILE</button>
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Configuration */}
        <section className="step-block" style={{ opacity: file ? 1 : 0.45, transition: 'opacity 0.2s ease' }}>
          <div className="step-number">02</div>
          <div className="step-header">
            <h2 className="step-title">Configuration Parameters</h2>
            <p className="step-description">Select output specifications and run execution.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="options-grid" style={{ pointerEvents: file ? 'auto' : 'none' }}>
              <div className="form-group">
                <label htmlFor="operation">Image Operation</label>
                <select 
                  id="operation"
                  className="select-control"
                  value={operation}
                  onChange={(e) => setOperation(e.target.value as OperationType)}
                  disabled={processing || !file}
                >
                  <option value="convert-and-remove-background">Convert + Remove Background</option>
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
                    <option value="transparent">Transparent alpha channel (PNG/WebP/AVIF)</option>
                    <option value="white">Solid White (#FFFFFF)</option>
                    <option value="black">Solid Black (#000000)</option>
                    <option value="#ff0000">Chroma Red (#FF0000)</option>
                    <option value="#00ff00">Chroma Green (#00FF00)</option>
                    <option value="#0000ff">Chroma Blue (#0000FF)</option>
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
                      <option value="webp">WebP (Optimized Lossy/Lossless)</option>
                      <option value="png">PNG (Lossless Alpha)</option>
                      <option value="jpeg">JPEG (Compressed Solid)</option>
                      <option value="avif">AVIF (Ultra High Compression)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="quality">Target Quality Factor</label>
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
            </div>

            {/* Cropping Options Panel */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', pointerEvents: file ? 'auto' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <input 
                  type="checkbox" 
                  id="enableCrop" 
                  checked={enableCrop} 
                  onChange={(e) => setEnableCrop(e.target.checked)} 
                  disabled={processing || !file}
                  style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: 'var(--text-primary)' }}
                />
                <label htmlFor="enableCrop" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                  Enable Image Extraction (Crop)
                </label>
              </div>

              {enableCrop && (
                <div className="options-grid" style={{ gap: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="cropX">Crop Left Offset (X - px)</label>
                    <input 
                      type="number" 
                      id="cropX" 
                      className="input-control" 
                      value={cropX} 
                      onChange={(e) => setCropX(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      disabled={processing}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cropY">Crop Top Offset (Y - px)</label>
                    <input 
                      type="number" 
                      id="cropY" 
                      className="input-control" 
                      value={cropY} 
                      onChange={(e) => setCropY(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      disabled={processing}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cropWidth">Crop Width (px)</label>
                    <input 
                      type="number" 
                      id="cropWidth" 
                      className="input-control" 
                      value={cropWidth} 
                      onChange={(e) => setCropWidth(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      disabled={processing}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cropHeight">Crop Height (px)</label>
                    <input 
                      type="number" 
                      id="cropHeight" 
                      className="input-control" 
                      value={cropHeight} 
                      onChange={(e) => setCropHeight(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      disabled={processing}
                      min="1"
                    />
                  </div>
                </div>
              )}
            </div>

            <button               type="submit" 
              className="btn btn-primary" 
              disabled={processing || !file}
              style={{ marginTop: '2rem' }}
            >
              {processing ? (
                <>
                  <span className="loader"></span>
                  <span>EXECUTING SEGMENTATION RUN...</span>
                </>
              ) : (
                <span>RUN PIPELINE</span>
              )}
            </button>
          </form>
        </section>

        {/* Step 3: Result Output */}
        <section className="step-block" style={{ opacity: outputUrl || processing ? 1 : 0.45, transition: 'opacity 0.2s ease', minHeight: '300px' }}>
          <div className="step-number">03</div>
          <div className="step-header">
            <h2 className="step-title">Processing Output</h2>
            <p className="step-description">Examine segmented results and download output buffers.</p>
          </div>

          {processing && (
            <div className="scrim-overlay">
              <span className="loader"></span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                [inference] loading RMBG-1.4 weights onto CPU runtime...
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
                <img src={outputUrl} alt="Output" className="preview-image" />
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
              <div style={{ border: '1px dashed var(--border-color)', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>
                <span>[AWAITING STEP 02 PIPELINE RUN]</span>
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
