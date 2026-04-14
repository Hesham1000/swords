import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads a file buffer to Cloudinary and returns the URL and public_id
 * @param buffer - File buffer
 * @param folder - Cloudinary folder name
 */
export async function uploadImage(buffer: Buffer, folder: string = "products"): Promise<{ url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: folder,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return reject(error);
          }
          if (!result) {
            return reject(new Error("Cloudinary upload failed: No result"));
          }
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      )
      .end(buffer);
  });
}

/**
 * Extracts the relative part of a Cloudinary URL (e.g., v123/folder/id.jpg)
 * for storage in the database.
 */
export function getRelativePathFromUrl(url: string): string {
  if (!url) return "";
  const parts = url.split("/upload/");
  return parts.length > 1 ? parts[parts.length - 1] : url;
}

/**
 * Deletes an image from Cloudinary using its public_id
 */
export async function deleteImage(publicId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error("Cloudinary delete error:", error);
        return reject(error);
      }
      resolve(result);
    });
  });
}

/**
 * Extracts public_id from a Cloudinary URL
 * Useful if you only stored the URL but need to delete the image later
 * Note: This is a robust helper but storing the public_id directly is preferred
 */
export function getPublicIdFromUrl(url: string): string | null {
  try {
    // Look for the part between the last slash and the file extension
    // e.g. https://res.cloudinary.com/demo/image/upload/v12345/products/ab123.jpg -> products/ab123
    const parts = url.split("/");
    const filenameWithExtension = parts[parts.length - 1];
    const filename = filenameWithExtension.split(".")[0];
    
    // If it's in a folder (e.g. products/filename), we need to include the folder
    const folderIndex = parts.indexOf("upload");
    if (folderIndex !== -1 && folderIndex < parts.length - 2) {
      const folderParts = parts.slice(folderIndex + 2, parts.length - 1);
      return [...folderParts, filename].join("/");
    }
    
    return filename;
  } catch (err) {
    console.error("Failed to extract public_id from URL:", url, err);
    return null;
  }
}
