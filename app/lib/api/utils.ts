// app/lib/api/utils.ts
export const API_URL = "";

/**
 * Transforms a product document into the format expected by the frontend.
 * - Handles both MongoDB (_id) and Drizzle/Postgres (id) shapes
 * - Prepends the API URL to image paths if they are relative
 */
type ProductInput = {
    _id?: { toString(): string } | null;
    id?: string;
    images?: string[] | null;
} & Record<string, unknown>;

export function transformProduct(product: ProductInput | null) {
    if (!product) return null;

    const apiUrl = "";
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    const transformed = {
        ...product,
        id: product._id ? product._id.toString() : product.id,
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

    // Remove the raw MongoDB _id to avoid confusion on the frontend
    delete transformed._id;

    return transformed;
}
