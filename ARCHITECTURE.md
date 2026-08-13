# Chimera Architecture Documentation

This document explains the technical design, processing flow, and operational details of Chimera.

---

## System Architecture Flow

The system processes images in a unidirectional, stateless pipeline:

```
[Telegram User / API Client]
             │
             ▼
    [Vercel API Route] (Node.js Serverless Function)
             │
             ├──► 1. Rate Limiter (Stateless memory check)
             ├──► 2. File Size & Magic Bytes Validation (Sharp)
             │
             ▼
    [Processing Engine] (services/imageProcessor.ts)
             │
             ├──► 3. Decode image to raw RGB bytes (Sharp)
             ├──► 4. Load & Cache RMBG-1.4 model (ONNX via Transformers.js)
             ├──► 5. AI Segmentation Inference (Generates grayscale mask)
             ├──► 6. Apply mask as Alpha channel (Sharp compositing)
             │
             ▼
    [Output Encoder] (Sharp)
             │
             ▼
[HTTP Response / Telegram Upload]
```

---

## 1. Stateless Design

Chimera is designed to be **100% stateless**. It does not maintain an in-memory session database, process-level conversations, or disk storage. 

### Why Stateless?
* **Serverless Compatibility**: On Vercel, serverless function instances are ephemeral. They start up on-demand and scale down to zero. Any local files, in-memory states, or background processes are discarded when the instance spins down.
* **Horizontal Scalability**: Stateless systems can handle millions of requests by scaling out functions horizontally.
* **Stateless Telegram Menu**: Instead of storing the user's selected file or state in a database, the Telegram bot replies directly to the user's photo/document. When a button is clicked, the bot traces the original file ID dynamically using the `reply_to_message` relationship, bypassing the need for a database.

---

## 2. AI Model Loading Strategy

### Model Source & License
Chimera uses **RMBG-1.4**, a state-of-the-art background removal model developed by BRIA AI.
* **Weights**: Loaded dynamically from [Hugging Face (`briaai/RMBG-1.4`)](https://huggingface.co/briaai/RMBG-1.4).
* **Format**: ONNX Runtime WebAssembly/Node compatible format.
* **License**: Gated model for commercial use, but open-source and free for non-commercial/academic use under the [BRIA RMBG-1.4 Creative Commons BY-NC-SA 4.0 license](https://huggingface.co/briaai/RMBG-1.4).

### Caching on Serverless
On Vercel, the model is downloaded at runtime and stored in the `/tmp/transformers-cache` folder. 
* **Cold Starts**: The first request hitting a cold serverless instance will download the ~44MB quantized ONNX model file. Because Vercel functions execute in high-speed AWS data centers, this download completes in under 2 seconds.
* **Warm Cache**: Subsequent requests hitting the same serverless instance will reuse the cached model files inside `/tmp` and avoid redownloading, leading to sub-second processing.

---

## 3. Decoupling the Processing Engine

In the MVP, the image processing pipeline runs directly inside the Vercel API function. While efficient for moderate traffic, serverless runtimes have constraints:
* **Max Execution Time**: Hobby tier has a 10s limit; Pro tier supports up to 300s.
* **Memory Limits**: Max memory is 1024MB (standard) or 3008MB (Pro). Heavy images can cause out-of-memory errors on smaller functions.
* **No GPU**: CPUs are used, which are slower for AI inference.

### How to Scale to a Dedicated Worker
The code is explicitly structured to separate the controller logic (`src/app/api/...`) from the processing engine (`src/services/imageProcessor.ts`).

If traffic scales up, you can move the image processing engine to a dedicated GPU-accelerated server (e.g. AWS EC2, Fly.io, or RunPod) with a simple architecture change:

```
[Vercel Serverless Bot]
         │
         ▼ (Send image URL / buffer)
[Dedicated GPU Worker] (Running Node.js/Python with ONNX Runtime GPU)
         │
         ▼ (Returns processed PNG buffer)
[Vercel Webhook / Client]
```

To implement this, you would only need to replace the local function calls in `src/services/imageProcessor.ts` with an HTTP fetch to your GPU worker endpoint, leaving the rest of the Next.js API routing and Telegram bot code completely untouched.
