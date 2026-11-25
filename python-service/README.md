# DocuFlow AI — OpenCV 图像预处理微服务

独立 Python FastAPI 微服务，用于在调用 Gemini Multimodal OCR 前，对财务收据（レシート）和商务名片照片进行 **灰度化 → 双边滤波去噪 → CLAHE 对比度增强 → 自适应阈值二值化** 预处理，并返回图像分辨率与清晰度评分等质量指标。

> **容错说明**：Next.js 后端默认在 `http://127.0.0.1:8000/preprocess-receipt` 调用本服务；当本服务未启动（例如纯 Vercel 无状态部署环境）或连接超时时，Next.js 会自动优雅降级为「原图直连 Gemini Vision」模式，不影响 OCR 正常识别。

---

## 本地启动步骤

### 1. 创建并激活虚拟环境（推荐）

**Windows (PowerShell):**
```powershell
cd python-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
cd python-service
python3 -m venv .venv
source .venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动 FastAPI 服务

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. 验证服务是否就绪

- 健康检查：`GET http://127.0.0.1:8000/health`
- 图像预处理：`POST http://127.0.0.1:8000/preprocess-receipt`（`multipart/form-data`，字段名 `file`）
- 交互式 API 文档：http://127.0.0.1:8000/docs

---

## 环境变量（可选）

如果需要将本服务部署到独立容器或更换端口，可在 Next.js 根目录 `.env.local` 中配置：

```env
PYTHON_PREPROCESS_URL=http://127.0.0.1:8000/preprocess-receipt
```
