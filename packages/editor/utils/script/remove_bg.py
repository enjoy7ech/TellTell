import cv2
import numpy as np
import os
import sys
import requests
import base64
from io import BytesIO
from PIL import Image

# Use rembg for AI characters with non-green backgrounds
# pip install rembg
try:
    from rembg import remove as rembg_remove
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False

def remove_green_screen_precise(img):
    """
    OpenCV based precise green-screen keying (#00FF00)
    """
    # 转换到 HSV 色彩空间进行精准色号提取
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # --- 核心锁定：纯正绿幕色号 (#00FF00) ---
    # 在 HSV 空间中，绿色 Hue 约为 60
    lower_green = np.array([35, 100, 100]) 
    upper_green = np.array([85, 255, 255])
    
    # 获取遮罩
    mask = cv2.inRange(hsv, lower_green, upper_green)
    
    # 边缘锐利度处理
    kernel = np.ones((3,3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.GaussianBlur(mask, (3, 3), 0)
    
    # 反转遮罩作为 Alpha 通道
    mask_inv = cv2.bitwise_not(mask)
    
    # 溢色抑制 (Spill Suppression)
    b, g, r = cv2.split(img)
    g = np.minimum(g, np.maximum(r, b))
    
    # 合并为 RGBA
    rgba = cv2.merge([b, g, r, mask_inv])
    return rgba

def process_url(url, target_path):
    try:
        if url.startswith('data:'):
            print(f"📦 Processing Base64 Data URL")
            # data:image/png;base64,xxxx
            header, encoded = url.split(",", 1)
            img_data = BytesIO(base64.b64decode(encoded))
        else:
            print(f"📥 Downloading: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            img_data = BytesIO(response.content)
        
        # Load image
        pil_img = Image.open(img_data).convert("RGBA")
        
        # Decide which algorithm to use
        # If the image looks like it has a solid green background, use the precise green-key
        # Otherwise, use rembg (if available) for better results on general AI images
        
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGBA2BGR)
        
        # Simple detection: check if corners/center-top are very green
        corner_pixels = [cv_img[0,0], cv_img[0,-1], cv_img[-1,0], cv_img[-1,-1]]
        is_green = all([p[1] > 200 and p[0] < 100 and p[2] < 100 for p in corner_pixels])

        if is_green:
            print("🟢 Green screen detected, using precise keying...")
            res_img = remove_green_screen_precise(cv_img)
            # Reformat to WebP for better alpha and small size
            target_path_webp = target_path.replace('.png', '.webp')
            cv2.imwrite(target_path_webp, res_img, [cv2.IMWRITE_WEBP_QUALITY, 90])
            print(f"✅ Saved to: {target_path_webp}")
        elif HAS_REMBG:
            print("🧠 Using rembg for background removal...")
            output = rembg_remove(pil_img)
            target_path_webp = target_path.replace('.png', '.webp')
            output.save(target_path_webp, "WEBP", quality=90)
            print(f"✅ Saved to: {target_path_webp}")
        else:
            print("⚠️ No green screen and no rembg installed, saving original...")
            pil_img.save(target_path.replace('.png', '.webp'), "WEBP", quality=90)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py <URL> <LOCAL_TARGET_PATH>")
        sys.exit(1)
        
    url = sys.argv[1]
    target_path = sys.argv[2]
    process_url(url, target_path)
