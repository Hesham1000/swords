// app/lib/api/utils.ts
export const API_URL = "";

/**
 * Transforms a product row (Drizzle) into the format expected by the frontend.
 * - id is already a string uuid (no _id)
 * - Prepends the API URL to image paths if they are relative
 */
type ProductRow = { id?: string; _id?: unknown; images?: unknown; [key: string]: unknown };

export function transformProduct(product: ProductRow | null) {
    if (!product) return null;

    const apiUrl = "";
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    const { _id, ...rest } = product;

    return {
        ...rest,
        id: product.id ?? (_id ? _id.toString() : undefined),
        images: ((product.images as string[]) || []).map((img: string) => {
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
}
