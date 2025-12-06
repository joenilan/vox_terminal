from PIL import Image
import os

try:
    if os.path.exists("icon.png"):
        img = Image.open("icon.png")
        img.save("icon.ico", format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])
        print("Successfully created icon.ico")
    else:
        print("icon.png not found")
except Exception as e:
    print(f"Error: {e}")
