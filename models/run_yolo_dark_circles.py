# run_single_image.py
# Minimal script: load model/best.pt, run on one image, print detections, save annotated image + JSON.
# Usage:
#   python run_single_image.py "C:/path/to/image.png"
# or edit the IMAGE_PATH below.

import sys, os, json
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt

# --- CONFIG (either pass image path as arg or change IMAGE_PATH) ---
IMAGE_PATH = "models/test_images/test5.png"   
WEIGHTS = "models/dark_circles_best.pt"          # <--- your weights location
OUT_IMG = "runs/predict/annotated.png"
OUT_JSON = "runs/predict/detections.json"
CONF = 0.35
IMGSZ = 640

os.makedirs(os.path.dirname(OUT_IMG), exist_ok=True)

# --- load model (Ultralytics YOLO) ---
try:
    from ultralytics import YOLO
except Exception as e:
    raise SystemExit("Please install ultralytics: pip install ultralytics\nError: " + str(e))

if not os.path.exists(WEIGHTS):
    raise SystemExit(f"Weights not found at {WEIGHTS}. Put your best.pt there or change WEIGHTS variable.")

print("Loading model:", WEIGHTS)
model = YOLO(WEIGHTS)

# --- check image path ---
IMAGE_PATH = os.path.normpath(IMAGE_PATH)
if not os.path.exists(IMAGE_PATH):
    raise SystemExit(f"Image not found: {IMAGE_PATH}")

# --- run prediction ---
device = 0 if __import__('torch').cuda.is_available() else 'cpu'
print(f"Running inference on {IMAGE_PATH} (device={device}) ...")
results = model.predict(source=IMAGE_PATH, imgsz=IMGSZ, conf=CONF, device=device, save=False)

if not results:
    raise SystemExit("No results returned from predict().")

r = results[0]

# --- extract boxes / scores / classes robustly ---
boxes_np, scores_np, cls_np = np.zeros((0,4)), np.zeros((0,)), np.zeros((0,))
try:
    boxes_np = r.boxes.xyxy.cpu().numpy()
    scores_np = r.boxes.conf.cpu().numpy()
    cls_np = r.boxes.cls.cpu().numpy()
except Exception:
    # fallback attributes
    try:
        boxes_np = np.array(r.xyxy)
        scores_np = np.array(r.conf)
        cls_np = np.array(r.cls)
    except Exception:
        pass

# --- print detections ---
print("Detections (box = [xmin,ymin,xmax,ymax], conf, class):")
detections = []
for i, (b, s, c) in enumerate(zip(boxes_np, scores_np, cls_np)):
    box = [float(x) for x in b]
    conf = float(s)
    cls_id = int(c)
    detections.append({"box": box, "conf": conf, "class": cls_id})
    print(f" #{i}: box={box}, conf={conf:.3f}, class={cls_id}")

# --- annotated image (r.plot()) and save ---
try:
    annotated = r.plot()  # usually BGR
    # convert to RGB for saving/display
    if annotated.ndim == 3 and annotated.shape[2] == 3:
        annotated_rgb = annotated[..., ::-1]
    else:
        annotated_rgb = annotated
    Image.fromarray(annotated_rgb).save(OUT_IMG)
    print("Saved annotated image to:", OUT_IMG)
except Exception as e:
    print("Could not create/save annotated image via r.plot():", e)
    # fallback: save original image
    Image.open(IMAGE_PATH).save(OUT_IMG)
    print("Saved original image to:", OUT_IMG)

# --- save detections JSON ---
with open(OUT_JSON, "w") as f:
    json.dump(detections, f, indent=2)
print("Saved detections JSON to:", OUT_JSON)

# --- (optional) display annotated image inline if running in an environment that supports it ---
try:
    plt.figure(figsize=(8,8))
    plt.imshow(annotated_rgb)
    plt.axis("off")
    plt.show()
except Exception:
    pass

print("Done.")
