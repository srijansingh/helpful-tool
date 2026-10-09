export async function validateFiles(files: File[], accept: string, multiple = true): Promise<File[]> {
 if (!files.length) throw new Error("Choose a file to start.");
 if (!multiple && files.length !== 1) throw new Error("Choose one file at a time.");
 const valid: File[] = [];
 for (const file of files) {
  if (!file.size) throw new Error(`${file.name} is empty. Choose another file.`);
  const bytes = new Uint8Array(await file.slice(0,1024).arrayBuffer());
  const pdf = new TextDecoder().decode(bytes).includes("%PDF-");
  const image = (bytes[0]===0xff && bytes[1]===0xd8) || (bytes[0]===0x89 && bytes[1]===0x50) || new TextDecoder().decode(bytes.slice(0,6)).startsWith("GIF8") || (new TextDecoder().decode(bytes.slice(0,4))==="RIFF" && new TextDecoder().decode(bytes.slice(8,12))==="WEBP") || (bytes[0]===0x42 && bytes[1]===0x4d);
  if (accept.includes("pdf") && pdf) valid.push(new File([file],file.name,{type:"application/pdf",lastModified:file.lastModified}));
  else if (accept.includes("image") && image) {const type=bytes[0]===0xff?"image/jpeg":bytes[0]===0x89?"image/png":bytes[0]===0x42?"image/bmp":bytes[0]===0x47?"image/gif":"image/webp";valid.push(new File([file],file.name,{type,lastModified:file.lastModified}));}
  else throw new Error(`${file.name}: choose ${accept.includes("pdf") && !accept.includes("image") ? "a PDF" : "a supported PDF or JPG, PNG, WebP, GIF or BMP image"}.`);
 }
 return valid;
}
export function friendlyError(error: unknown): string {
 const message = error instanceof Error ? error.message : "Something went wrong.";
 if (/encrypt|password/i.test(message)) return "This PDF is password protected. Open an unprotected copy, or use the password tools when available.";
 if (/quota/i.test(message)) return "Device storage is full. Export a backup and free some space before saving.";
 return message;
}
