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
  
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('api');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setOutputUrl(null);
      setError(null);
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
          <h1 className="logo-text">CHIMERA</h1>
          <span className="logo-badge">LOCAL AI</span>
        </div>
        <p className="tagline">
          Stateless, self-hosted image conversion & AI background-removal bot and HTTP API.
          Zero external API dependencies.
        </p>
      </header>

      <div className="main-grid">
        {/* Left Side: Upload and Config */}
        <section className="card">
          <h2 className="card-title">📷 Upload Image</h2>
          <form onSubmit={handleSubmit}>
            {/* Drop Zone */}
            {!previewUrl ? (
              <div 
                className={`dropzone ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="dropzone-icon">📥</div>
                <p className="dropzone-text">Drag and drop your image here, or <strong>browse</strong></p>
                <p className="dropzone-hint">Supports JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF up to 20MB</p>
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
                  <span>{file?.name} ({(file!.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <button type="button" onClick={removeFile} className="remove-preview-btn">Remove</button>
                </div>
              </div>
            )}

            {/* Config Fields */}
            <div style={{ marginTop: '2rem' }}>
              <div className="form-group">
                <label htmlFor="operation">Operation</label>
                <select 
                  id="operation"
                  className="select-control"
                  value={operation}
                  onChange={(e) => setOperation(e.target.value as OperationType)}
                  disabled={processing}
                >
                  <option value="convert-and-remove-background">Convert + Remove Background</option>
                  <option value="remove-background">Remove Background Only</option>
                  <option value="convert">Convert Format Only</option>
                </select>
              </div>

              {/* Background Color selector for background removal */}
              {(operation === 'remove-background' || operation === 'convert-and-remove-background') && (
                <div className="form-group">
                  <label htmlFor="background">Background Fill</label>
                  <select 
                    id="background"
                    className="select-control"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    disabled={processing}
                  >
                    <option value="transparent">Transparent (PNG alpha)</option>
                    <option value="white">Solid White</option>
                    <option value="black">Solid Black</option>
                    <option value="#ff0000">Solid Red</option>
                    <option value="#00ff00">Solid Green</option>
                    <option value="#0000ff">Solid Blue</option>
                  </select>
                </div>
              )}

              {/* Format and Quality for convert operations */}
              {(operation === 'convert' || operation === 'convert-and-remove-background') && (
                <>
                  <div className="form-group">
                    <label htmlFor="format">Target Format</label>
                    <select 
                      id="format"
                      className="select-control"
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      disabled={processing}
                    >
                      <option value="webp">WebP (Recommended)</option>
                      <option value="png">PNG</option>
                      <option value="jpeg">JPEG</option>
                      <option value="avif">AVIF</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="quality">Compression Quality</label>
                    <div className="slider-container">
                      <input 
                        id="quality"
                        type="range" 
                        min="1" 
                        max="100" 
                        value={quality}
                        onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                        className="slider-control"
                        disabled={processing}
                      />
                      <span className="slider-val">{quality}%</span>
                    </div>
                  </div>
                </>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={processing || !file}
                style={{ marginTop: '1rem' }}
              >
                {processing ? (
                  <>
                    <span className="loader"></span>
                    <span>Processing with AI...</span>
                  </>
                ) : (
                  <span>✨ Process Image</span>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Right Side: Result Output (with loading scrim overlay) */}
        <section className="card" style={{ position: 'relative', minHeight: '400px' }}>
          <h2 className="card-title">🎯 Processed Output</h2>
          
          {/* Tactile Material Scrim Overlay */}
          {processing && (
            <div className="scrim-overlay">
              <span className="loader"></span>
              <p style={{ fontWeight: '700', letterSpacing: '-0.02rem', color: '#fff', fontSize: '1.15rem' }}>Executing Segmentation Inference...</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '240px', textAlign: 'center', lineHeight: '1.4' }}>
                Quantized RMBG-1.4 runs in 3-5 seconds on serverless CPU.
              </p>
            </div>
          )}
          
          {error && (
            <div style={{ color: 'var(--error)', backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {outputUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="preview-container checkerboard">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={outputUrl} alt="Output" className="preview-image" />
                <div className="preview-details">
                  <span>Size: {outputSize}</span>
                  <a href={outputUrl} download={`chimera_${Date.now()}.${format}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '700' }}>
                    Download Image 📥
                  </a>
                </div>
              </div>
              <div className="success-banner">
                🚀 Background successfully removed locally using BRIA RMBG-1.4!
              </div>
            </div>
          ) : (
            <div style={{ border: '2px dashed rgba(255, 255, 255, 0.08)', borderRadius: '12px', height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem' }}>
              <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📤</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>Upload your image and click "Process Image" to initiate AI segmentation.</span>
            </div>
          )}
        </section>
      </div>

      {/* Developer API & Architecture Docs */}
      <section className="dev-section">
        <h2 className="dev-title">🛠️ Developer Resources</h2>
        
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            HTTP API
          </button>
          <button 
            className={`tab-btn ${activeTab === 'telegram' ? 'active' : ''}`}
            onClick={() => setActiveTab('telegram')}
          >
            Telegram Bot
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
          <h3 style={{ marginBottom: '1rem', letterSpacing: '-0.02em' }}>REST API Endpoints</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Chimera exposes fully stateless POST endpoints for integration in other services.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontWeight: '600' }}>1. Service Health: <code>GET /api/health</code></h4>
              <pre>
{`curl -X GET https://chimerraa.vercel.app/api/health`}
              </pre>
            </div>

            <div>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontWeight: '600' }}>2. Convert Format: <code>POST /api/convert</code></h4>
              <pre>
{`curl -X POST https://chimerraa.vercel.app/api/convert \\
  -F "image=@photo.jpg" \\
  -F "format=webp" \\
  -F "quality=85"`}
              </pre>
            </div>

            <div>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontWeight: '600' }}>3. Remove Background: <code>POST /api/remove-background</code></h4>
              <pre>
{`curl -X POST https://chimerraa.vercel.app/api/remove-background \\
  -F "image=@photo.jpg" \\
  -F "background=transparent"`}
              </pre>
            </div>

            <div>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontWeight: '600' }}>4. Combined Processing: <code>POST /api/process</code></h4>
              <pre>
{`curl -X POST https://chimerraa.vercel.app/api/process \\
  -F "image=@photo.jpg" \\
  -F "operation=convert-and-remove-background" \\
  -F "format=png" \\
  -F "background=white"`}
              </pre>
            </div>
          </div>
        </div>

        {/* Tab 2: Telegram Bot */}
        <div className={`tab-content ${activeTab === 'telegram' ? 'active' : ''}`}>
          <h3 style={{ marginBottom: '1rem', letterSpacing: '-0.02em' }}>Telegram Webhook Setup</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            The bot processes images via webhook triggers in production.
          </p>
          <ol style={{ marginLeft: '1.5rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <li>
              Create a bot by messaging <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>@BotFather</a> on Telegram to obtain your <code>TELEGRAM_BOT_TOKEN</code>.
            </li>
            <li>
              Deploy this project to Vercel and retrieve your production domain.
            </li>
            <li>
              Set up the webhook by making a POST/GET request to Telegram (replace variables):
              <pre style={{ marginTop: '0.5rem' }}>
{`curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://chimerraa.vercel.app/api/telegram/webhook", "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"}'`}
              </pre>
            </li>
          </ol>

          <h4 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Bot Commands & Interface</h4>
          <ul style={{ marginLeft: '1.5rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><code>/start</code>: Greets the user and lists capability details.</li>
            <li><strong>Send Image/File</strong>: Returns an interactive inline keyboard menu to trigger actions.</li>
          </ul>
        </div>

        {/* Tab 3: Architecture */}
        <div className={`tab-content ${activeTab === 'arch' ? 'active' : ''}`}>
          <h3 style={{ marginBottom: '1rem', letterSpacing: '-0.02em' }}>Stateless AI Infrastructure</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Chimera is built to run fully state-free. AI inference is performed serverless at runtime.
          </p>

          <div className="arch-flow">
            <div className="flow-step">📱 Telegram User / API Client</div>
            <div className="flow-arrow">⬇️ HTTP POST (Image Upload)</div>
            <div className="flow-step">⚡ Vercel Serverless Function</div>
            <div className="flow-arrow">⬇️ Rate limit & Magic Byte check</div>
            <div className="flow-step">🔬 Sharp (Image decode & resize)</div>
            <div className="flow-arrow">⬇️ Load RMBG-1.4 model into ONNX</div>
            <div className="flow-step">🧠 Local AI inference (Generates mask)</div>
            <div className="flow-arrow">⬇️ Alpha Compositing via Sharp</div>
            <div className="flow-step">📦 Output PNG/WebP Buffer return</div>
          </div>

          <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: '600' }}>Core Attributes</h4>
          <ul style={{ marginLeft: '1.5rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>EPHEMERAL RUNTIME</strong>: Uses local server memory and the <code>/tmp</code> scratch folder. Warm instances cache the loaded ONNX model, leading to fast subsequent inference.</li>
            <li><strong>ISOLATED INTERFACES</strong>: Image processing is decoupled from the controller layer in <code>src/services/imageProcessor.ts</code>. You can easily migrate the AI engine to a dedicated VM/Worker without changing your API or Telegram handlers.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
