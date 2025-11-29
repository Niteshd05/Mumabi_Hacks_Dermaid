# runner_dark_circles.py
import requests
import base64
import os
import json

API_URL = "https://models-detection.onrender.com/predict/acne/json"
IMAGE_PATH = r"C:\Users\Nitesh\OneDrive\Desktop\Hackathons\DermAid\models\test_images\test2.png"

def file_to_base64(path):
    """Read image file and convert to base64 data URI."""
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    ext = os.path.splitext(path)[1].lower()
    if ext in [".jpg", ".jpeg"]:
        mime = "image/jpeg"
    elif ext == ".webp":
        mime = "image/webp"
    else:
        mime = "image/png"

    return f"data:{mime};base64,{b64}"

def save_base64_image(b64_string, output_path):
    """Convert base64 data URI back into a normal image file."""
    if ";base64," in b64_string:
        _, b64data = b64_string.split(";base64,", 1)
    else:
        b64data = b64_string

    img_bytes = base64.b64decode(b64data)
    
    with open(output_path, "wb") as f:
        f.write(img_bytes)
    return output_path

def run_dark_circles():
    print("Encoding image to base64...")
    b64_image = file_to_base64(IMAGE_PATH)

    payload = {
        "filename": os.path.basename(IMAGE_PATH),
        "b64": b64_image
    }

    print("Sending request to server...")
    
    try:
        response = requests.post(API_URL, json=payload, timeout=60)
        
        if response.status_code != 200:
            print(f"❌ Error {response.status_code}: {response.text}")
            return

        data = response.json()
        
        print(f"\n✅ Success! Found {len(data['detections'])} detections")
        
        # Save returned annotated image
        annotated_b64 = data["annotated_image_b64"]
        output_path = "annotated_result_dark_circles.png"
        save_base64_image(annotated_b64, output_path)
        
        print(f"🎉 Annotated image saved at: {output_path}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    run_dark_circles()