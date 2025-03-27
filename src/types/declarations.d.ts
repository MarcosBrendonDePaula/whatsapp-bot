// Declaração para ffmpeg-static
declare module 'ffmpeg-static' {
  const path: string;
  export default path;
}

// Declaração para ytdl-core
declare module 'ytdl-core' {
  export function getInfo(url: string): Promise<any>;
  export function validateURL(url: string): boolean;
  export function chooseFormat(formats: any[], options: any): any;
  export default function ytdl(url: string, options?: any): any;
}
