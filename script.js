// Get DOM elements
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const secretMessageInput = document.getElementById('secretMessage');
const generateBtn = document.getElementById('generateBtn');
const encodeBtn = document.getElementById('encodeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const uploadBtn = document.getElementById('uploadBtn');
const uploadInput = document.getElementById('uploadInput');
const decodeBtn = document.getElementById('decodeBtn');
const decodedMessageOutput = document.getElementById('decodedMessage');

// Global variables
const delimiter = '|||END|||'; // Special delimiter to indicate end of message
let imageData; // Will store the current image data

// Event listeners
generateBtn.addEventListener('click', generateAbstractImage);
encodeBtn.addEventListener('click', encodeMessage);
downloadBtn.addEventListener('click', downloadImage);
uploadBtn.addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', handleImageUpload);
decodeBtn.addEventListener('click', decodeMessage);

// Initialize the canvas with a blank state
window.addEventListener('load', () => {
    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

/**
 * Generates an abstract image with random colored blocks
 * This creates a visually interesting base image in which we'll hide our message
 */
function generateAbstractImage() {
    const blockSize = 20; // Size of each block
    const numBlocksX = canvas.width / blockSize;
    const numBlocksY = canvas.height / blockSize;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw random colored blocks
    for (let y = 0; y < numBlocksY; y++) {
        for (let x = 0; x < numBlocksX; x++) {
            // Generate random colors that aren't too extreme for better steganography
            // We keep values in mid-range to ensure changes in LSB aren't visually detectable
            const r = Math.floor(Math.random() * 200) + 28; // 28-227 range for red
            const g = Math.floor(Math.random() * 200) + 28;
            const b = Math.floor(Math.random() * 200) + 28;
            
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
        }
    }
    
    // Store the image data
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Indicate success
    alert('Abstract image generated!');
}

/**
 * Converts a string to binary representation
 * Each character is converted to its ASCII value and then to an 8-bit binary string
 * 
 * @param {string} str - The string to convert
 * @returns {string} - Binary representation of the string
 */
function stringToBinary(str) {
    let binary = '';
    for (let i = 0; i < str.length; i++) {
        let charBinary = str.charCodeAt(i).toString(2);
        // Ensure each character takes up 8 bits (pad with leading zeros if needed)
        charBinary = charBinary.padStart(8, '0');
        binary += charBinary;
    }
    return binary;
}

/**
 * Converts a binary string back to a regular string
 * Processes 8 bits at a time to reconstruct the original ASCII characters
 * 
 * @param {string} binary - The binary string to convert
 * @returns {string} - The decoded string
 */
function binaryToString(binary) {
    let str = '';
    // Process 8 bits at a time (1 character)
    for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.substr(i, 8);
        if (byte.length !== 8) break; // Handle incomplete bytes at the end
        str += String.fromCharCode(parseInt(byte, 2));
    }
    return str;
}

/**
 * Encodes a message into the image using LSB steganography on the red channel
 * 
 * LSB Steganography works by replacing the least significant bit of pixel data
 * with bits from our secret message. This causes minimal visual change to the image
 * while allowing us to store hidden information.
 */
function encodeMessage() {
    // Check if we have an image
    if (!imageData) {
        alert('Please generate an image first!');
        return;
    }
    
    // Get the message
    const message = secretMessageInput.value;
    if (!message) {
        alert('Please enter a message to encode!');
        return;
    }
    
    // Add delimiter to the message to mark its end
    const messageWithDelimiter = message + delimiter;
    
    // Convert message to binary
    const binaryMessage = stringToBinary(messageWithDelimiter);
    
    // Check if the message is too large for the image
    const pixelCount = canvas.width * canvas.height;
    if (binaryMessage.length > pixelCount) {
        alert('Message is too large for this image size!');
        return;
    }
    
    // Get image data for manipulation
    const data = imageData.data;
    
    // Encode the binary message into the LSB of the red channel of each pixel
    let binaryIndex = 0;
    for (let i = 0; i < data.length; i += 4) {
        // Break the loop once we've encoded all bits
        if (binaryIndex >= binaryMessage.length) break;
        
        // R value is at index i
        // Encode the bit by setting the LSB of the red channel
        if (binaryMessage[binaryIndex] === '0') {
            // Make LSB 0: Use bitwise AND with 11111110 to clear the last bit
            data[i] = data[i] & 0xFE; 
        } else {
            // Make LSB 1: Use bitwise OR with 00000001 to set the last bit
            data[i] = data[i] | 0x01;
        }
        
        binaryIndex++;
    }
    
    // Put the modified data back into the canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Update the imageData to the modified version
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Show success message with information about encoding capacity
    alert(`Message encoded successfully! Used ${binaryMessage.length} bits out of ${pixelCount} available pixels.`);
}

/**
 * Decodes a message from the image by reading the LSB of each pixel's red channel
 * 
 * Extraction process:
 * 1. Read the LSB (Least Significant Bit) from each red channel value
 * 2. Combine these bits to form bytes (8 bits)
 * 3. Convert bytes to characters
 * 4. Continue until delimiter (|||END|||) is found
 */
function decodeMessage() {
    // Check if we have an image
    if (!imageData) {
        alert('No image to decode! Please upload an image first.');
        return;
    }
    
    // Get image data
    const data = imageData.data;
    
    // Extract the binary message from LSB of red channel
    let binaryMessage = '';
    let extractedText = '';
    
    // Process pixels to extract the hidden message
    for (let i = 0; i < data.length; i += 4) {
        // Extract LSB from red channel using bitwise AND with 00000001
        const lsb = data[i] & 0x01;
        binaryMessage += lsb;
        
        // Every 8 bits, convert to a character
        if (binaryMessage.length % 8 === 0) {
            // Convert the last 8 bits to a character
            const byteStr = binaryMessage.slice(binaryMessage.length - 8);
            const asciiCode = parseInt(byteStr, 2);
            const char = String.fromCharCode(asciiCode);
            
            // Add the character to our extracted text
            extractedText += char;
            
            // Check if our extracted text ends with the delimiter
            if (extractedText.endsWith(delimiter)) {
                // Found the delimiter! Extract the message without the delimiter
                const message = extractedText.substring(0, extractedText.length - delimiter.length);
                decodedMessageOutput.textContent = message;
                console.log("Message decoded successfully!");
                alert('Message successfully decoded!');
                return;
            }
        }
        
        // Safety check to avoid infinitely long extraction
        if (i >= data.length - 4) {
            // Reached the end of the image without finding the delimiter
            if (extractedText.length > 0) {
                decodedMessageOutput.textContent = `Partial message (no delimiter found): ${extractedText}`;
                alert('Warning: No end marker found. The image might not contain a hidden message or the message format is corrupted.');
            } else {
                decodedMessageOutput.textContent = "No readable message could be decoded.";
                alert('No hidden message found or message format is corrupted.');
            }
            return;
        }
    }
}

/**
 * Handles the upload of an image to decode
 * @param {Event} event - The file input change event
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file is an image
    if (!file.type.match('image.*')) {
        alert('Please select a valid image file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
            // Adjust canvas size to match the uploaded image
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Clear canvas before drawing new image
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the uploaded image on canvas
            ctx.drawImage(img, 0, 0);
            
            try {
                // Get the image data for processing
                imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                console.log("Image data loaded. Size:", imageData.width, "x", imageData.height);
                alert('Image uploaded successfully! You can now decode the message.');
            } catch (error) {
                // Handle CORS errors or other issues
                console.error("Error accessing image data:", error);
                alert('Error processing the image. The image might be from another domain or corrupted.');
            }
        };
        
        // Handle errors in loading the image
        img.onerror = function() {
            alert('Error loading the image. The file might be corrupted.');
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = function() {
        alert('Error reading the file. Please try again.');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Downloads the current canvas as an image
 */
function downloadImage() {
    if (!imageData) {
        alert('No image to download! Please generate an image first.');
        return;
    }
    
    try {
        // Create a temporary link element
        const link = document.createElement('a');
        link.download = 'steganography_image.png';
        link.href = canvas.toDataURL('image/png');
        
        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Error downloading image:", error);
        alert('Error downloading the image. Please try again.');
    }
}
