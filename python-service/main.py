import base64
import math
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="DocuFlow AI - OpenCV Image Preprocessing Service",
    version="1.0.0",
    description="Receipt & business card image preprocessing (grayscale, denoising, CLAHE contrast enhancement, adaptive thresholding).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def compute_sharpness_score(gray_image: np.ndarray) -> tuple[float, float]:
    """Computes raw Laplacian variance and a normalized 0-100 sharpness score."""
    variance = float(cv2.Laplacian(gray_image, cv2.CV_64F).var())
    normalized = min(100.0, (math.log1p(max(0.0, variance)) / math.log1p(2500.0)) * 100.0)
    return round(variance, 2), round(normalized, 1)


def preprocess_document_image(image_bgr: np.ndarray) -> tuple[np.ndarray, dict[str, Any]]:
    """Applies grayscale, bilateral denoising, CLAHE contrast boost, and adaptive thresholding."""
    height, width = image_bgr.shape[:2]

    # 1. Grayscale conversion
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    orig_var, orig_score = compute_sharpness_score(gray)

    # 2. Edge-preserving denoising
    denoised = cv2.bilateralFilter(gray, d=5, sigmaColor=50, sigmaSpace=50)

    # 3. Local contrast enhancement via CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    contrasted = clahe.apply(denoised)

    # 4. Adaptive Gaussian threshold binarization
    binary = cv2.adaptiveThreshold(
        contrasted,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        25,
        11,
    )

    _, proc_score = compute_sharpness_score(binary)

    metrics = {
        "width": int(width),
        "height": int(height),
        "resolution": f"{int(width)}x{int(height)}",
        "original_sharpness": orig_score,
        "processed_sharpness": proc_score,
        "laplacian_variance": orig_var,
        "pipeline": [
            "grayscale",
            "bilateral_denoise",
            "clahe_contrast",
            "adaptive_threshold",
        ],
    }
    return binary, metrics


@app.get("/health")
def health_check() -> dict[str, Any]:
    return {"ok": True, "service": "docuflow-opencv-preprocessor"}


@app.post("/preprocess-receipt")
async def preprocess_receipt(
    file: UploadFile = File(...),
    doc_type: str = Form("auto"),
) -> dict[str, Any]:
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    np_buffer = np.frombuffer(raw_bytes, dtype=np.uint8)
    image_bgr = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise HTTPException(
            status_code=400,
            detail="Unable to decode image. Please upload a valid JPG, PNG, or WEBP file.",
        )

    processed_img, metrics = preprocess_document_image(image_bgr)
    success, encoded_png = cv2.imencode(".png", processed_img)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode processed image.")

    b64_str = base64.b64encode(encoded_png.tobytes()).decode("ascii")
    return {
        "ok": True,
        "doc_type": doc_type,
        "mime_type": "image/png",
        "processed_image_base64": b64_str,
        "processed_image_data_url": f"data:image/png;base64,{b64_str}",
        "metrics": metrics,
    }
