// app/lib/api/utils.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Transforms a product record into the format expected by the frontend.
 * - Normalizes _id/id to id
 * - Prepends the API URL to image paths if they are relative
 */
export function transformProduct(product: any) {
    if (!product) return null;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    const rawId = product._id ?? product.id;

    const transformed = {
        ...product,
        id: rawId?.toString?.() ?? rawId,
        images: (product.images || []).map((img: string) => {
            if (img.startsWith("http")) {
                return img;
            }
            if (img.startsWith("/uploads")) {
                return `${apiUrl}${img}`;
            }
            // If it starts with 'v' followed by numbers, it's likely a Cloudinary path
            // e.g., v1744646400/products/my-image.jpg
            if (img.match(/^v\d+\//) && cloudName) {
                return `https://res.cloudinary.com/${cloudName}/image/upload/${img}`;
            }
            // Fallback for any other local relative paths
            return img.startsWith("/") ? `${apiUrl}${img}` : img;
        }),
    };

    // Remove the raw _id to avoid confusion on the frontend
    delete transformed._id;

    return transformed;
}
