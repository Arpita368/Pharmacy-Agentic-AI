from app.observability import tracer
import time

with tracer.start_as_current_span("Test Connection") as span:
    span.set_attribute("status", "success")

time.sleep(10)

print("Trace sent!")
