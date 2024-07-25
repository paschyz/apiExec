from PIL import Image, ImageDraw, ImageFont

def generate_image(text, output_path):
    # Create an image with white background
    width, height = 800, 600
    background_color = (255, 255, 255)
    image = Image.new('RGB', (width, height), background_color)
    
    # Get a drawing context
    draw = ImageDraw.Draw(image)
    
    # Define the text properties
    text_color = (0, 0, 0)
    font_size = 50
    # Calculate text size and position
    text_bbox = draw.textbbox((0, 0), text)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    text_x = (width - text_width) // 2
    text_y = (height - text_height) // 2
    
    # Draw the text on the image
    draw.text((text_x, text_y), text, fill=text_color)
    
    # Save the image
    image.save(output_path)
    print(f"Image saved to {output_path}")

# Example usage
generate_image("Hello, World!", "/app/output.png")
