import { useEffect, useReducer, useRef } from "react";

// Object URLs for image previews, created once per File and revoked when
// that file is removed or the component unmounts — avoids both a memory
// leak and a thumbnail flash on every reorder.
export function useImageThumbnails(files: File[]): Map<File, string> {
  const mapRef = useRef<Map<File, string>>(new Map());
  const [, forceRender] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const map = mapRef.current;
    const currentSet = new Set(files);
    for (const [file, url] of map) {
      if (!currentSet.has(file)) {
        URL.revokeObjectURL(url);
        map.delete(file);
      }
    }
    let changed = false;
    for (const file of files) {
      if (!map.has(file)) {
        map.set(file, URL.createObjectURL(file));
        changed = true;
      }
    }
    if (changed) forceRender();
  }, [files]);

  useEffect(
    () => () => {
      mapRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  return mapRef.current;
}
