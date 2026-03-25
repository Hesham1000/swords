// app/lib/api/utils.ts

/**
 * Transforms a MongoDB product document into the format expected by the frontend.
 * - Renames _id to id
 * - Prepends the API URL to image paths if they are relative
 */
export function transformProduct(product: any) {
    if (!product) return null;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

    const transformed = {
        ...product,
        id: product._id.toString(),
        images: (product.images || []).map((img: string) => {
            if (img.startsWith("http")) {
                return img;
            }
            return `${apiUrl}${img}`;
        }),
    };

    // Remove the raw MongoDB _id to avoid confusion on the frontend
    delete transformed._id;

    return transformed;
}
