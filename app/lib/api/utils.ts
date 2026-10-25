// app/lib/api/utils.ts
export const API_URL = ""

/**
 * Transforms a Drizzle product row into the format expected by the frontend.
 * - Rows already have an `id` (uuid) column, so no _id renaming is needed
 * - Prepends the API URL to image paths if they are relative
 */
interface ProductRow {
  id: string;
  images?: string[] | null;
  [key: string]: unknown;
}

export function transformProduct(product: ProductRow) {
    if (!product) return null;

    const apiUrl = ""
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    const transformed = {
        ...product,
        id: product.id,
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

    // Remove any legacy MongoDB _id if it somehow slipped through
    delete (transformed as Record<string, unknown>)._id;

    return transformed;
}
