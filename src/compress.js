import sharp from 'sharp';
import { redirect } from './redirect.js';

export async function compressImg(request, reply, imgData) {
    const { webp, grayscale, quality, originSize } = request.params;
    const imgFormat = webp ? 'webp' : 'jpeg';

    try {
        reply
            .header('content-type', `image/${imgFormat}`)
            .header('x-original-size', originSize)
            .header('x-bytes-saved', 0);  // Placeholder, as we can't calculate this until the stream ends
       
        const transformStream = sharp()
            .grayscale(grayscale)  // Apply grayscale conditionally
            .toFormat(imgFormat, {
                quality,
                progressive: true,
                optimizeScans: webp,  // Optimize scans only for WebP
                chromaSubsampling: webp ? '4:4:4' : '4:2:0',  // Conditional chroma subsampling
            });

        let processedSize = 0;  // This will hold the size of the processed image

        // Pipe the image data through the transform stream to the response stream
        imgData
            .pipe(transformStream)
            .on('data', (chunk) => {
                processedSize += chunk.length;  // Increment with each chunk of data
            })
            .on('end', () => {
                // Adjust x-bytes-saved header once the stream has finished processing
                reply.header('x-bytes-saved', originSize - processedSize);
            })
            .on('error', (error) => {
                return redirect(request, reply);  // Fallback to redirection on error
            })
            .pipe(reply.raw);  // Directly pipe to the reply's raw stream
    } catch (error) {
        return redirect(request, reply);
    }
                    }
