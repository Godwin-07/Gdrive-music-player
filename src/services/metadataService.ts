import TrackPlayer from 'react-native-track-player';
import { usePlayerStore } from '../store/playerStore';

interface ParsedMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  bpm: number | null;
  duration: number;
  artworkUri: string | null;
}

function decodeToString(uint8: Uint8Array): string {
  let s = '';
  for (let i = 0; i < uint8.length; i++) {
    s += String.fromCharCode(uint8[i]);
  }
  return s;
}

function decodeUTF8(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const c1 = bytes[i++];
    if (c1 < 128) {
      out += String.fromCharCode(c1);
    } else if (c1 > 191 && c1 < 224 && i < bytes.length) {
      const c2 = bytes[i++];
      out += String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
    } else if (c1 > 223 && c1 < 240 && i + 1 < bytes.length) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      out += String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
    } else if (c1 > 239 && c1 < 248 && i + 2 < bytes.length) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      const c4 = bytes[i++];
      const u = ((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63);
      const s = u - 0x10000;
      out += String.fromCharCode(0xD800 + (s >> 10), 0xDC00 + (s & 0x3FF));
    }
  }
  return out;
}

function readString(view: DataView, offset: number, length: number, encoding: number): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
  const nullIdx = bytes.indexOf(0);
  const actualBytes = nullIdx >= 0 ? bytes.slice(0, nullIdx) : bytes;

  if (actualBytes.length === 0) return '';

  try {
    if (encoding === 0) {
      // Latin-1
      return decodeToString(actualBytes);
    } else if (encoding === 3) {
      // UTF-8
      return decodeUTF8(actualBytes);
    } else if (encoding === 1 || encoding === 2) {
      // UTF-16
      let s = '';
      // Detect Byte Order Mark (BOM)
      // If encoding is 1, it should have a BOM. If 2, it's Big Endian without BOM.
      let isBE = encoding === 2;
      let start = 0;

      if (actualBytes.length >= 2) {
        if (actualBytes[0] === 0xFE && actualBytes[1] === 0xFF) {
          isBE = true;
          start = 2;
        } else if (actualBytes[0] === 0xFF && actualBytes[1] === 0xFE) {
          isBE = false;
          start = 2;
        }
      }

      // Check if it's actually UTF-16 or if the encoding byte was a lie (common in some tags)
      // In UTF-16, every other byte is often 0 for Latin characters.
      // If we see no 0s in the first few bytes of a multi-byte string marked as UTF-16, it might be Latin-1.
      if (actualBytes.length > 4 && start === 0) {
        let zeroCount = 0;
        for (let i = 0; i < Math.min(actualBytes.length, 10); i++) {
          if (actualBytes[i] === 0) zeroCount++;
        }
        if (zeroCount === 0) {
          return decodeToString(actualBytes);
        }
      }

      for (let i = start; i < actualBytes.length - 1; i += 2) {
        let charCode: number;
        if (isBE) {
          charCode = (actualBytes[i] << 8) | actualBytes[i + 1];
        } else {
          charCode = actualBytes[i] | (actualBytes[i + 1] << 8);
        }
        if (charCode !== 0) s += String.fromCharCode(charCode);
      }
      return s;
    }
  } catch (e) {
    console.log('[Metadata] String decode error:', e);
    return decodeToString(actualBytes.filter(b => b >= 32));
  }
  return '';
}

function parseId3v2(buffer: ArrayBuffer): Partial<ParsedMetadata> {
  const view = new DataView(buffer);
  if (view.byteLength < 10) return {};
  const id = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2));
  if (id !== 'ID3') return {};

  const version = view.getUint8(3);
  const size = ((view.getUint8(6) & 0x7f) << 21) |
    ((view.getUint8(7) & 0x7f) << 14) |
    ((view.getUint8(8) & 0x7f) << 7) |
    (view.getUint8(9) & 0x7f);

  const result: Partial<ParsedMetadata> = {};
  let pos = 10;
  const end = Math.min(10 + size, view.byteLength);

  while (pos + 10 <= end) {
    const frameId = String.fromCharCode(
      view.getUint8(pos), view.getUint8(pos + 1),
      view.getUint8(pos + 2), view.getUint8(pos + 3)
    );

    // Frame size: ID3v2.3 uses 32-bit int, ID3v2.4 uses synchsafe int (7 bits)
    let frameSize: number;
    if (version >= 4) {
      frameSize = ((view.getUint8(pos + 4) & 0x7f) << 21) |
        ((view.getUint8(pos + 5) & 0x7f) << 14) |
        ((view.getUint8(pos + 6) & 0x7f) << 7) |
        (view.getUint8(pos + 7) & 0x7f);
    } else {
      frameSize = (view.getUint8(pos + 4) << 24) |
        (view.getUint8(pos + 5) << 16) |
        (view.getUint8(pos + 6) << 8) |
        view.getUint8(pos + 7);
    }

    if (frameSize <= 0) break;
    if (pos + 10 + frameSize > end) {
      console.log(`[Metadata] Frame ${frameId} exceeds bounds: ${pos + 10 + frameSize} > ${end}`);
      break;
    }

    const frameDataPos = pos + 10;
    const data = view.buffer.slice(view.byteOffset + frameDataPos, view.byteOffset + frameDataPos + frameSize);
    const frameView = new DataView(data);

    if (frameSize >= 1) {
      const encoding = frameView.getUint8(0);
      let value = readString(frameView, 1, frameSize - 1, encoding);
      
      // Critical check: if value is empty/garbled but we have data, try raw Latin-1
      if (!value || value.includes('\u0000') || value.length < 2) {
         let raw = '';
         const rawBytes = new Uint8Array(data, 1);
         for(let i=0; i<rawBytes.length; i++) {
           if(rawBytes[i] >= 32 && rawBytes[i] < 127) raw += String.fromCharCode(rawBytes[i]);
         }
         if (raw.length > 0) value = raw;
      }

      const cleanValue = value.replace(/\0/g, '').trim();
      console.log(`[Metadata] Frame ${frameId}, Size ${frameSize}, Encoding ${encoding}, Value: "${cleanValue}"`);

      switch (frameId) {
        case 'TIT2':
          result.title = cleanValue;
          break;
        case 'TPE1':
          result.artist = cleanValue;
          break;
        case 'TALB':
          result.album = cleanValue;
          break;
        case 'TCON':
          result.genre = cleanValue;
          break;
        case 'APIC':
          result.artworkUri = parseApicFrame(new Uint8Array(data));
          break;
      }
    }
    pos += 10 + frameSize;
  }

  return result;
}

function toBase64(uint8: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  const len = uint8.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = uint8[i];
    const b2 = i + 1 < len ? uint8[i + 1] : 0;
    const b3 = i + 2 < len ? uint8[i + 2] : 0;

    const chunk = (b1 << 16) | (b2 << 8) | b3;
    base64 += chars[(chunk & 0xFC0000) >> 18];
    base64 += chars[(chunk & 0x3F000) >> 12];
    
    if (i + 1 < len) {
        base64 += chars[(chunk & 0xFC0) >> 6];
    } else {
        base64 += '=';
    }
    
    if (i + 2 < len) {
        base64 += chars[chunk & 0x3F];
    } else {
        base64 += '=';
    }
  }
  return base64;
}

function parseApicFrame(data: Uint8Array): string | null {
  if (data.length < 5) return null;
  const encoding = data[0];
  let offset = 1;

  // MIME type
  let mimeEnd = data.indexOf(0, offset);
  if (mimeEnd < 0) return null;
  const mimeType = decodeToString(data.slice(offset, mimeEnd));
  console.log(`[Metadata] APIC MIME: ${mimeType}, Encoding: ${encoding}`);
  offset = mimeEnd + 1;

  // Picture type
  const picType = data[offset];
  offset += 1;

  // Description
  let descEnd: number;
  if (encoding === 0 || encoding === 3) {
    descEnd = data.indexOf(0, offset);
    offset = descEnd >= 0 ? descEnd + 1 : offset;
  } else {
    // UTF-16 description ends with 00 00
    descEnd = -1;
    for (let i = offset; i < data.length - 1; i += 2) {
      if (data[i] === 0 && data[i + 1] === 0) {
        descEnd = i;
        break;
      }
    }
    offset = descEnd >= 0 ? descEnd + 2 : offset;
  }

  const imageData = data.slice(offset);
  if (imageData.length < 10) {
    console.log(`[Metadata] APIC Image data too small: ${imageData.length}`);
    return null;
  }

  try {
    const base64 = toBase64(imageData);
    const uri = `data:${mimeType};base64,${base64}`;
    console.log(`[Metadata] Generated Artwork URI (length: ${uri.length})`);
    return uri;
  } catch (e) {
    console.error('[Metadata] APIC base64 error:', e);
    return null;
  }
}

function readVorbisComment(buffer: ArrayBuffer): Partial<ParsedMetadata> {
  const text = decodeUTF8(new Uint8Array(buffer));
  const result: Partial<ParsedMetadata> = {};

  const titleMatch = text.match(/TITLE=([^\n\r\x00]+)/i);
  const artistMatch = text.match(/ARTIST=([^\n\r\x00]+)/i);
  const albumMatch = text.match(/ALBUM=([^\n\r\x00]+)/i);
  const genreMatch = text.match(/GENRE=([^\n\r\x00]+)/i);

  if (titleMatch) result.title = titleMatch[1].trim();
  if (artistMatch) result.artist = artistMatch[1].trim();
  if (albumMatch) result.album = albumMatch[1].trim();
  if (genreMatch) result.genre = genreMatch[1].trim();

  return result;
}

export function extractFileName(name: string): string {
  const withoutExt = name.replace(/\.[^/.]+$/, '');
  return withoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function parseMetadataFromBuffer(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<ParsedMetadata> {
  const defaults = {
    title: 'Unknown Title',
    artist: 'Unknown Artist',
    album: 'Unknown Album',
    genre: 'Unknown',
    bpm: null as number | null,
    duration: 0,
    artworkUri: null as string | null,
  };

  try {
    if (buffer.byteLength < 10) {
      console.log('[Metadata] Buffer too small:', buffer.byteLength);
      return defaults;
    }

    const header = new Uint8Array(buffer.slice(0, 10));
    const headerStr = String.fromCharCode(header[0], header[1], header[2]);
    console.log(`[Metadata] Header: ${headerStr}, Mime: ${mimeType}, Size: ${buffer.byteLength}`);

    let tags: Partial<ParsedMetadata> = {};

    if (headerStr === 'ID3') {
      tags = parseId3v2(buffer);
      console.log(`[Metadata] ID3 tags found: ${tags.title} - ${tags.artist}, Has Artwork: ${!!tags.artworkUri}`);
    } else if (headerStr === 'fLaC' || mimeType === 'audio/flac') {
      const idx = findFlacMetadataBlock(buffer);
      if (idx >= 0) {
        tags = readVorbisComment(buffer.slice(idx));
      }
    } else if (mimeType === 'audio/ogg' || mimeType === 'audio/opus') {
      const idx = findOggVorbisComment(buffer);
      if (idx >= 0) {
        tags = readVorbisComment(buffer.slice(idx));
      }
    }

    return {
      title: tags.title || defaults.title,
      artist: tags.artist || defaults.artist,
      album: tags.album || defaults.album,
      genre: tags.genre || defaults.genre,
      bpm: null,
      duration: 0,
      artworkUri: tags.artworkUri || null,
    };
  } catch (e) {
    console.error('[Metadata] Error parsing buffer:', e);
    return defaults;
  }
}

function findFlacMetadataBlock(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  if (view.byteLength < 42) return -1;
  let pos = 4;
  let isLast = false;
  while (!isLast && pos + 4 <= view.byteLength) {
    const header = view.getUint8(pos);
    isLast = (header & 0x80) !== 0;
    const blockType = header & 0x7f;
    const blockSize = ((view.getUint8(pos + 1) << 16) |
      (view.getUint8(pos + 2) << 8) |
      view.getUint8(pos + 3));
    pos += 4;
    if (blockType === 4) {
      return pos;
    }
    pos += blockSize;
  }
  return -1;
}

function findOggVorbisComment(buffer: ArrayBuffer): number {
  const str = decodeToString(new Uint8Array(buffer.slice(0, Math.min(200, buffer.byteLength))));
  const idx = str.indexOf('\x01vorbis');
  if (idx >= 0) return idx + 7;
  return -1;
}

export async function updateActiveTrackMetadata(
  songId: string,
  metadata: { title: string; artist: string; artworkUri?: string | null }
): Promise<void> {
  try {
    const update = {
      title: metadata.title,
      artist: metadata.artist,
      artwork: metadata.artworkUri || undefined,
    };

    // 1. Update TrackPlayer internal state
    const queue = await TrackPlayer.getQueue();
    const index = queue.findIndex((t) => String(t.id) === String(songId));
    if (index !== -1) {
      await TrackPlayer.updateMetadataForTrack(index, update);
    }

    // 2. Update Now Playing (if it is the active track)
    const activeTrack = await TrackPlayer.getActiveTrack();
    if (activeTrack && String(activeTrack.id) === String(songId)) {
      await TrackPlayer.updateNowPlayingMetadata(update);
    }

    // 3. Update Zustand Store
    const state = usePlayerStore.getState();
    const updatedQueue = state.queue.map((t) =>
      String(t.id) === String(songId) ? { ...t, ...update } : t
    );

    const newState: any = { queue: updatedQueue };
    if (state.activeTrack && String(state.activeTrack.id) === String(songId)) {
      newState.activeTrack = { ...state.activeTrack, ...update };
    }

    usePlayerStore.setState(newState);
  } catch (e) {
    console.log('[updateTrackMetadata] Error:', e);
  }
}
