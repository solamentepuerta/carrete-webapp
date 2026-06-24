export function imagePathToPhotoUrl(imagePath: string) {
  return `/api/photos/${imagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}
