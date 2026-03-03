import base64
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# 🔐 Langfuse Project Keys (from Project Settings → API Keys)
PUBLIC_KEY = "pk-lf-4fb531da-dbc2-464c-9994-a40f56bba62b"
SECRET_KEY = "sk-lf-610c00f8-f2bb-469f-9318-05259d9831ad"

# 🔐 Create Basic Auth header (required)
auth_string = f"{PUBLIC_KEY}:{SECRET_KEY}"
encoded_auth = base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")

# 🔹 Configure tracer provider
provider = TracerProvider()
trace.set_tracer_provider(provider)

# 🔹 OTLP exporter → sends traces to Langfuse
otlp_exporter = OTLPSpanExporter(
    endpoint="https://cloud.langfuse.com/api/public/otel/v1/traces",
    headers={
        "Authorization": "Basic " + encoded_auth,
    },
)

# 🔹 Add span processor
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# 🔹 tracer to use in your project
tracer = trace.get_tracer("agentic-pharmacy")
