# ─────────────────────────────────────────────
# SuperCanvas — Python ML Service
# FastAPI service with OpenTelemetry instrumentation
# ─────────────────────────────────────────────

import os
import time
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── OpenTelemetry ──
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

logger = logging.getLogger("ml-service")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

SERVICE = "ml-service"
VERSION = "0.1.0"
_tracer: trace.Tracer | None = None


def init_otel() -> trace.Tracer:
    """Initialize OpenTelemetry tracing. No-op if endpoint not configured."""
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")

    resource = Resource(attributes={
        SERVICE_NAME: SERVICE,
        SERVICE_VERSION: VERSION,
        "environment": os.getenv("ENVIRONMENT", "development"),
    })

    provider = TracerProvider(resource=resource)

    if endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
            exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
            provider.add_span_processor(BatchSpanProcessor(exporter))
            logger.info(f"OTel tracing → {endpoint}")
        except Exception as e:
            logger.warning(f"OTel exporter setup failed: {e} — traces disabled")
    else:
        logger.warning("OTEL_EXPORTER_OTLP_ENDPOINT not set — traces disabled")

    trace.set_tracer_provider(provider)
    RequestsInstrumentor().instrument()
    return trace.get_tracer(SERVICE)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _tracer
    _tracer = init_otel()
    logger.info(f"✅ {SERVICE} v{VERSION} started")
    yield
    logger.info("🛑 ML service shutting down")


app = FastAPI(
    title="SuperCanvas ML Service",
    description="Machine learning training and inference service for SuperCanvas",
    version=VERSION,
    lifespan=lifespan,
)

# Instrument FastAPI with OTel AFTER app creation
FastAPIInstrumentor.instrument_app(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


# ── Request timing middleware ──────────────────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
    return response


# ── Models ────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str


class ReadyResponse(BaseModel):
    ready: bool
    checks: dict[str, bool]


class TrainRequest(BaseModel):
    strategy_id: str
    node_id: str
    model_type: str  # classifier | regressor | lstm | automl
    features: list[str]
    target: str
    train_test_split: float = 0.8
    hyperparameters: dict = {}


class TrainResponse(BaseModel):
    job_id: str
    status: str
    message: str


class InferenceRequest(BaseModel):
    model_id: str
    features: dict[str, float]


class InferenceResponse(BaseModel):
    prediction: float
    confidence: float
    latency_ms: float


# ── Health endpoints ───────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["ops"])
async def health_check():
    return HealthResponse(
        status="ok",
        service=SERVICE,
        version=VERSION,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/ready", response_model=ReadyResponse, tags=["ops"])
async def readiness_check():
    """
    Readiness probe — K8s will stop sending traffic if this fails.
    Phase 4 will add real model registry + DB checks here.
    """
    checks: dict[str, bool] = {
        "app": True,
        # "model_registry": await _check_model_registry(),  # Phase 4
        # "database": await _check_db(),                     # Phase 4
    }
    all_ready = all(checks.values())

    if not all_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"ready": False, "checks": checks},
        )

    return ReadyResponse(ready=True, checks=checks)


@app.get("/metrics", tags=["ops"])
async def metrics():
    """Prometheus metrics endpoint (stub — Phase 4 adds real metrics)."""
    return JSONResponse(
        content="# HELP ml_service_up Service up\n# TYPE ml_service_up gauge\nml_service_up 1\n",
        media_type="text/plain",
    )


# ── ML endpoints ───────────────────────────────────────────────────────────

@app.post("/api/v1/train", response_model=TrainResponse, tags=["ml"])
async def start_training(request: TrainRequest):
    """
    Submit a model training job.
    Phase 4 will implement the full Inngest-orchestrated training pipeline.
    """
    tracer = trace.get_tracer(SERVICE)
    with tracer.start_as_current_span("ml.train.submit") as span:
        span.set_attribute("strategy_id", request.strategy_id)
        span.set_attribute("model_type", request.model_type)
        span.set_attribute("feature_count", len(request.features))

        logger.info(
            f"Training job submitted: strategy={request.strategy_id} "
            f"model={request.model_type} features={len(request.features)}"
        )

        # TODO Phase 4: Trigger Inngest training pipeline
        return TrainResponse(
            job_id=f"job-{request.strategy_id}-{int(time.time())}",
            status="queued",
            message=f"Training {request.model_type} model for strategy {request.strategy_id}",
        )


@app.post("/api/v1/inference", response_model=InferenceResponse, tags=["ml"])
async def run_inference(request: InferenceRequest):
    """
    Run model inference via ONNX Runtime.
    Phase 4 will implement full ONNX model loading and caching.
    """
    tracer = trace.get_tracer(SERVICE)
    with tracer.start_as_current_span("ml.inference") as span:
        span.set_attribute("model_id", request.model_id)

        start = time.perf_counter()

        # TODO Phase 4: Load ONNX model from R2, run inference
        logger.info(f"Inference requested for model: {request.model_id}")

        latency_ms = (time.perf_counter() - start) * 1000
        span.set_attribute("latency_ms", latency_ms)

        return InferenceResponse(
            prediction=0.0,
            confidence=0.0,
            latency_ms=latency_ms,
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        log_level="info",
        reload=os.getenv("ENVIRONMENT", "development") == "development",
    )
