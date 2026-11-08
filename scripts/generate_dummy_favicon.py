import os
from PIL import Image, ImageDraw, ImageFont

def create_agent_favicon():
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Draw rounded rectangle with sleek indigo-cyan gradient
    # We create a 256x256 gradient
    for y in range(size):
        # Gradient from Indigo (99, 102, 241) to Purple (168, 85, 247) to Cyan (6, 182, 212)
        factor = y / size
        r = int(79 + (147 - 79) * factor)
        g = int(70 + (51 - 70) * factor * 0.5)
        b = int(229 + (234 - 229) * factor)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Mask to rounded rectangle
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    corner_radius = 60
    mask_draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=corner_radius, fill=255)

    # Apply mask
    rounded = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rounded.paste(img, (0, 0), mask)

    # Draw border
    border_draw = ImageDraw.Draw(rounded)
    border_draw.rounded_rectangle([(1, 1), (size - 2, size - 2)], radius=corner_radius, outline=(255, 255, 255, 120), width=6)

    # Draw stylized "A" for Agent
    # Triangle / chevron peak:
    # Top peak at (128, 48)
    # Bottom left at (56, 200)
    # Bottom right at (200, 200)
    # Crossbar at y = 145, x from 80 to 176
    draw_symbol = ImageDraw.Draw(rounded)

    stroke_w = 26
    # Left leg
    draw_symbol.line([(128, 52), (64, 196)], fill=(255, 255, 255, 255), width=stroke_w)
    # Right leg
    draw_symbol.line([(128, 52), (192, 196)], fill=(255, 255, 255, 255), width=stroke_w)
    # Horizontal crossbar
    draw_symbol.line([(88, 146), (168, 146)], fill=(255, 255, 255, 255), width=stroke_w - 4)

    # Glowing center core node
    core_r = 16
    draw_symbol.ellipse(
        [(128 - core_r, 146 - core_r), (128 + core_r, 146 + core_r)],
        fill=(6, 182, 212, 255),
        outline=(255, 255, 255, 255),
        width=4
    )

    # Save PNG and ICO
    out_dir = os.path.dirname(os.path.abspath(__file__))
    png_path = os.path.join(out_dir, "agent_favicon.png")
    ico_path = os.path.join(out_dir, "agent_favicon.ico")

    rounded.save(png_path, format="PNG")
    print(f"Saved {png_path}")

    # Generate multi-size ICO
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    rounded.save(ico_path, format="ICO", sizes=icon_sizes)
    print(f"Saved multi-size {ico_path}")

if __name__ == "__main__":
    create_agent_favicon()

