#!/usr/bin/env python3
"""Measure two local PNGs with the same offline Playwright Chromium engine used by FFAX.
No Pillow, network, scripts from screenshots, installs, or customer file modifications.
Pixel metrics are diagnostics, never functional/visual acceptance.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import sys
from pathlib import Path

SIGNATURE = b"\x89PNG\r\n\x1a\n"
MAX_BYTES = 8 * 1024 * 1024
MAX_PIXELS = 2560 * 2200


def inspect_png(path: str) -> tuple[bytes, int, int, str]:
    p = Path(path).resolve(strict=True)
    if not p.is_file() or p.stat().st_size < 33 or p.stat().st_size > MAX_BYTES:
        raise ValueError("FORGE_METRIC_PNG_SIZE")
    data = p.read_bytes()
    if data[:8] != SIGNATURE or data[12:16] != b"IHDR" or int.from_bytes(data[8:12], "big") != 13:
        raise ValueError("FORGE_METRIC_PNG_HEADER")
    width = int.from_bytes(data[16:20], "big")
    height = int.from_bytes(data[20:24], "big")
    if not 1 <= width <= 2560 or not 1 <= height <= 2200 or width * height > MAX_PIXELS:
        raise ValueError("FORGE_METRIC_DIMENSIONS")
    return data, width, height, hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference", required=True)
    parser.add_argument("--render", required=True)
    args = parser.parse_args()
    a, w, h, ahash = inspect_png(args.reference)
    b, bw, bh, bhash = inspect_png(args.render)
    if (w, h) != (bw, bh):
        raise ValueError("FORGE_METRIC_VIEWPORT_MISMATCH")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as ex:
        raise RuntimeError("FORGE_PLAYWRIGHT_NOT_INSTALLED") from ex

    js = r"""async (args) => {
      async function decoded(b64) {
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], {type:'image/png'}));
        if(bitmap.width !== args.width || bitmap.height !== args.height) {
          bitmap.close(); throw new Error('FORGE_METRIC_DECODE_DIMENSIONS');
        }
        const canvas = document.createElement('canvas');
        canvas.width=args.width;canvas.height=args.height;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(bitmap,0,0);bitmap.close();
        return ctx.getImageData(0,0,args.width,args.height).data;
      }
      const a=await decoded(args.a),b=await decoded(args.b);
      let sum=0,changed=0;
      const bins=Array.from({length:9},(_,i)=>({id:'r'+(i+1),pixels:0,changed:0,scoreSum:0}));
      for(let y=0;y<args.height;y++)for(let x=0;x<args.width;x++){
        const i=(y*args.width+x)*4;
        let diff=0;
        for(let c=0;c<3;c++){
          const ac=(a[i+c]*a[i+3]+255*(255-a[i+3]))/255;
          const bc=(b[i+c]*b[i+3]+255*(255-b[i+3]))/255;
          diff+=Math.abs(ac-bc);
        }
        const delta=diff/3;
        sum+=delta;
        const bin=bins[Math.min(2,Math.floor(y*3/args.height))*3+Math.min(2,Math.floor(x*3/args.width))];
        bin.pixels++;bin.scoreSum+=delta;
        if(delta>20){changed++;bin.changed++;}
      }
      return {
        meanAbsoluteChannelError:sum/(args.width*args.height),
        changedPixels:changed,totalPixels:args.width*args.height,
        regionDiagnostics:bins.map(r=>({id:r.id,pixels:r.pixels,changed:r.changed,
          meanAbsoluteChannelError:r.scoreSum/r.pixels}))
      };
    }"""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-first-run", "--disable-extensions"])
        try:
            context = browser.new_context(
                viewport={"width": w, "height": h},
                java_script_enabled=True, offline=True,
            )
            page = context.new_page()
            page.route("**/*", lambda route: route.abort())
            page.set_content("<!doctype html><html><body></body></html>")
            metric = page.evaluate(
                js,
                {"a": base64.b64encode(a).decode("ascii"), "b": base64.b64encode(b).decode("ascii"),
                 "width": w, "height": h},
            )
            context.close()
        finally:
            browser.close()

    output = {
        "schema": "ffax.pixel-metric.v1",
        "engine": "OFFLINE_CHROMIUM_CANVAS",
        "width": w, "height": h,
        "referenceSha256": ahash, "renderSha256": bhash,
        "meanAbsoluteChannelError": metric["meanAbsoluteChannelError"],
        "changedPixels": metric["changedPixels"], "totalPixels": metric["totalPixels"],
        "regionDiagnostics": metric["regionDiagnostics"],
        "status": "DIAGNOSTIC_NOT_VISUAL_ACCEPTANCE",
        "externalRequests": 0,
    }
    print(json.dumps(output, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)[:180]}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
