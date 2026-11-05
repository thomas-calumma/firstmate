// Pi Enterprise pixel scene. Reference profiles: Pixel Trek Enterprises by vampireslug,
// https://pixeljoint.com/pixelart/87681.htm. The source artist retains copyright.
import { deflateSync, inflateSync } from "node:zlib";

const PROFILES: readonly [number, number, string][] = [
  [130, 36, "eNrtm12OxCAIgL3Evu3jHmRvVh/nWE16nn3ZC3RDExKXaNWpgigkpJlOpz/yFRAc50xGkOM4TlQbjXUZCGU0FrZtO2vULPqQg18nxsG+7ydVsCncS41t4djYuSTVe38p3T9SDMgpJwdUYOxmEOQA5HpO5y6VZIHGgJxIsoBjh+MY6gwcSLJQ4wukfcIKHHj//U+57P6OcLKBsbOWg5/Pr6iCwHnvtqnfliqeA/Ir/CztD1rYfQQ2Qh4sP+gb+2Pv1FM2OOYRs2jL2D2Laqyz9GK/px8fWTRyAHWKnve+Ggua6thc/iC8FvJGt1ol9TxaOeC4/1V8grZeAKc/wOvV9lY0qvZ+3Ij5Qcn4hsf0OP9qfVmO+UKprd61DX037+xuvVw+DlJ+IJUntraP2V2eg9QcoeX7bzI2B6X5gNl/Xg5yscDsPx8HsZp6iQ/QWIfXbOecxupINZrLx2OqvQ6r/V2PjX3JPq56fIlveLkP46UDB1zrO1J5Qoy/FAvAgHFQHw+09econ+YL2viC1iykemsteoaUA+oXzBc8iwk1tRzpvIDyaxy054BD7ta9ht/j+le6bjDGAa57Rg441kLPPmfsYeOa9c+Ug1RsMH8gkz/exf3eccTigs75RK88w+YL48SOkeaNVj9Ys+4QrlmzeqKevkRrZrD3ZKM/PzOz/P+nRv4AePFwdw=="],
  [130, 34, "eNrtm11uwyAMgHOJve1xB9nNkscdK1LOs5ddIJsrMSELE0zAxsSWrLZpmyb4wz+YLgst67qeHF1cquQ4jhOr9DXs+35iBZvCtXBsC59NnUtTt217KT4+ot0pleQAH4Oxm0ECByBwn383+lJNFsC2HNFkIYxdGMdYZ+BAkwWOL9D2CU/gQGp8sU1rRJKNOHZyOPh+/0gqCJwr90h9t1TDOc6f5f+1tj9oYfcR2Ag8eH7QP/an5tRdNiTqiFm0ZeyeRa3U1xLs9/TjI4tFDmCdoue1P40FKwxI+oP4twJv+NGqUPdjlQOJ63+KT7DWC5D0B+H3uL0Vi2qxDyMdF2rm1tX4xp/h5vPez9OpF0rzgVrb4LmZs7v3cuU4oPwAlSe2to/bXZ8DqkZoOf9dxuagNB9w+8/LwVUscPvPx0EqBy/xARbX4S3b+UpT60gczdV5lFpfh7U+11NjX3JMaj3efYMeB1L7O6g8IcVfioWv5c35qIwH1vpzmE/noI0vaM0C1Vtr0TPEHMR+ARhwDu7FBM5ajnZegPl1DtpzICG5fa/x+2H/K943mOJg2z7PwAE8d+verxl72Jiz/xlzQMUG9wc6+WMu7veOIx4XbNYTvfIMrxfGiR0j1Y2+fvDMdYd4j4hbwk5fojUzoffkoz8/M7P8/4cjv34qCRY="],
  [129, 36, "eNrtm8ttwzAMQLVEbz3We3Qz59g5OokBL9NLL10gQVqoEBTJpiR+IxIgckgKK+QTv2kILtKy7/s1qoUzWtTw+fWnymwaX1OR4ABiw3Vd1WiP/DOggIMmdpnPBZVeP2BI5DHKsiwPeuh/YQZa7CwRE9Lz1T4DZaDkGwxN4xKUA6sxQKo+iByMMEDl/xoDpedqYSD3Z2/s4+bi7KzSDMTnl2qEnANu/2P4XAsXLbGKm4OURU0MjPr8+/VtmAuu7yRZE3b3AxP0v0O9cwMH27aZ0pa7QRm7NQvERqM5Z8S2mnvkWfyPXV9YOGea7/JXq1L7PpK9pwUOnl3uHEjPSbRyoG02TqVadibaOOiNARDbpp9prdu1+U46JlBxkJ4Dmv97/ZLfybMd3Sz783svJ8XB2SwkZwLTN6Vna/4dgaa4gGWnWi+Aee9b51PBJUBjwqi9oLzNFJO1cQDxEfbsKo0D7ns7+eGIA0itXWPBYzSfjyl3N6293REXzgHdHefYuY/0/KUezr0351w23fE7B3IzY00MfIQX5wDh/mNzUNuRYez+nAG6HNAyp5Has+dxyxmgYYArnpc0f//6Ex7eS88aGbhc3n/VvYrTE2D8LrNX87+PDJRigscBPjageZ46d3gusNc7UNUVXhN6H+nzAb15gpMB3yPprykpGYnzYre+fUZG/7/Prfv8MWQ2n98AIVR+bg=="],
  [128, 38, "eNrtmt9pxDAMxjtIHxu6XjfIDn271w5SApmiG5RCZ+hhikH47MSK/0nWJxAXwiVx8vssS7b3ff/bjfiTMJPSRvdcKyaNtxSthho4+i/4t+9jEjSQY8uyDPcHW1//XWnf1zIWSGAf1YDnH2hgJO8rNkoTue2VxD+pgU7sa/CWpAmtGkhpQnL+/Pv8UqyJVu91+/qJ+kw5326oBubGjlAD27apctS/5XGjdKxx1729fz74ab/9+BaX81hjXzs/4vDvqQHPf13X6K9WS73PyPqSw3+EBmY3pwEJcyGsHK6DBtz93beZ3SWtf3Dqi5YaONJjbs2T+sb0PDc/l8itRSwYqQHKPjben/Hn8An74hHvWZlzYkFrDaT6PdWBb0uojRqMrPLOjQUt84HcHCRsC1j1jQUtNBDWoqk8hDq497Pc+WaOBq7OkYK7jFhQqoEr9b3EfWOW84IrGjjq26k1VS17CGdh29JLjcYfaMDefGvIH7GgD39ab49Yh/HPpPxpTgoNlM+1a+z//hziQDn/FmNAbV3F+PtjxIHyvq8hD0jVDcgJ5fGn93Z7K7keXhvTAvjXqfd6xgDw11P/a4n/GP/7xgkp+R/yfz16qM0f9b8cPYzgj/VAvXPI7hr6Gx6f8fdzFvjydtYRaLzHmC9XAzl7eDiOtd85aslcbYC3TW1Y5n0H/dQEgA=="],
  [158, 41, "eNrtnE1OwzAQhXsCTsCSqsdB4hbsuEHvACu2HKSq1BVH4AYIiQ0XKHLoFNcdZ8bOJLGdN9KINLHbxPn8xr+sVrA+OxwOxz6v+RlqKeNaynmovX58HZ275w1tu92ej2soD+4ZSrr/vvsL77VlBn3mOHfckVuWgabOcxqQk68UTeGY49KFafb7/XH19tmka+vflHWeu4cUnZDcr1POS9I77rlII1rx8L12BXTikdJccGqoYdYePkt4jvtM56bm8PF+c9y9PPS6S+O7lL4W1zCXwp1vY9YRjhuOLU4nY2nC82Nw6MeMpXLHGXEXvm8Nd77mWfPXx4cUh/vOx76HuzaEw6vve7/5c8G+b++a9LD8rdriYTnnaprEmrbtJ+VNZZPjUGIxt223ZMvtU2jY0/YRuPdM/ezYtbm85DZwTT5lH07SNrVRLFPEM+vfkbSP6lxp9aWGupvL3kWc3246p89Pz7vOOeO00t0f97fTUY8HLo/2OPZ70m/11VeprRHL10r8nGPcNIe7GFulu5a90uftahynHxJzB/WBPf1Zr9esm47xRPS1lrmuVvSNs1baHjXVdRg/Zs+5NI7qH+f2Q8BFXBucTtM4W6q5fNQeaok590x0fBXDf1ads3Nop2t0fQnr2HJiUdjGSeGP2uk0Pjbl3PcczElzJtZrG0rlLUfTafwzNreQwp6fnvM5GbSIrWPX/dqY08y79OXV9Jsk9og5aS5qjncxFXNLsdi6G+0aMWfcO4i9J8m16xzAXJvMpfSzLLjTrEPx04O5dvoQ8H/P1evQQZn9WG/KXo+h35GaX1pDWct+H+jd3zs6z6mc5idbWztv7aDMUCMD9mDl7j9E23DYfpdYzOTSTLnm+WJsKKiD4K698eySNQ7MLYe/mAaOqYdXegedW0R8n1PPoHNg0ILBlP2F6EfASmoHgjvwF+4jTPmsTYO1urCU8Z0xdA7cwXLHF614A3Ngz4ojxFdYDnup/9sklVGUNCyXPe3/DgNrMEv2sF8QNgV3iJ2wOfoZ4Aw2x/gKSkO2X4mvthM="],
];

export type EnterpriseSceneState = "waiting" | "working" | "failure";
export type EnterpriseProfile = "enterprise-cage" | "enterprise" | "enterprise-phase2" | "enterprise-refit" | "enterprise-b";
const names: EnterpriseProfile[] = ["enterprise-cage", "enterprise", "enterprise-phase2", "enterprise-refit", "enterprise-b"];
const station = inflateSync(Buffer.from("eNrlVztOAzEU3JukAyl0JNR0QaJJkSpnoIqogT1QCu7ABbjRJrMwaHawweu1EyRWenJs+XnevJ+dpsn/FtfLDtKc4Xvdv3WQx93zWWwg9l/Ah/wX/s5bbahph+bb/XrTuR2zy3k1OxT74eUD3/ljjeslbVBsjMTx+Ct+SRsUW/krFuful6n45B7Lud9kqg/AVfkqR7UNojFQQV5Oxdac09iTH+1hDTh+jg3OjT7F/OnmdrCG31xTe3LuB4+347+vtoO57ru7uBrg5+QCzgcXjBDo4tyx+NTFWVjnOLbeabv733tByP85/B3b9ZWb2kofYY/HkHqp+KF673Xb9htXCtb6e/hzT24vgC5rz/XV/97/iE/+fjdhzxj8YC8V/jH8EH/2gZz4h3KQWCraE2K6qfXHGmQdftXOkZvmH7kpPvZoDfMc6KfWXyz/tQfE8H/Szb2LtPbcr/ruqfUW8/cNex3xtO9xX0l89rrUe780vvpBYxkba72BQ2+sUJ3XwveeGJKa+CnvwFP8FyoZ9wOLk0rr", "base64"));
// Station icon: buddysWorld, https://www.newgrounds.com/art/view/buddysworld/deep-space-nine-icons.
// Source rights are not established for redistribution.
const LOGICAL_W = 320, LOGICAL_H = 80;
const masks = PROFILES.map(([width, height, data]) => ({ width, height, pixels: inflateSync(Buffer.from(data, "base64")) }));
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const v of data) c = crcTable[(c ^ v) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Buffer): Buffer {
  const tag = Buffer.from(name), length = Buffer.alloc(4), sum = Buffer.alloc(4);
  length.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([tag, data])));
  return Buffer.concat([length, tag, data, sum]);
}
function png(frame: Buffer, W: number, H: number): string {
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) frame.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
  const header = Buffer.alloc(13); header.writeUInt32BE(W); header.writeUInt32BE(H, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 1 })), chunk("IEND", Buffer.alloc(0))]).toString("base64");
}
function hash(n: number): number {
  let v = Math.imul(n + 91, 0x9e3779b1) >>> 0; v ^= v >>> 15; return v >>> 0;
}

/** One bounded RGBA scene; all movement is tick-driven and reduced motion is static. */
export function createEnterprisePixelScene(profile: EnterpriseProfile, reduced = false) {
  const mask = masks[Math.max(0, names.indexOf(profile))]!;
  let minX = mask.width, maxX = 0;
  for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
    if (mask.pixels[(y * mask.width + x) * 4 + 3]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  }
  let W = 320, H = 80, frame = Buffer.alloc(W * H * 4);
  let state: EnterpriseSceneState = "waiting", tick = 0, entered = 0, exit = -100, travel = 0, failureAge = 0, revision = 0;
  function rect(x: number, y: number, w: number, h: number, color: readonly number[]): void {
    const x0 = Math.max(0, Math.floor(x * W / LOGICAL_W)), y0 = Math.max(0, Math.floor(y * H / LOGICAL_H));
    const x1 = Math.min(W, Math.ceil((x + w) * W / LOGICAL_W)), y1 = Math.min(H, Math.ceil((y + h) * H / LOGICAL_H));
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
      const i = (py * W + px) * 4; frame[i] = color[0]!; frame[i+1] = color[1]!; frame[i+2] = color[2]!; frame[i+3] = 255;
    }
  }
  function polygon(points: readonly (readonly [number, number])[], color: readonly number[]): void {
    const minY = Math.floor(Math.min(...points.map(p => p[1])));
    const maxY = Math.ceil(Math.max(...points.map(p => p[1])));
    for (let y = minY; y < maxY; y++) {
      const crosses: number[] = [];
      for (let i=0;i<points.length;i++) {
        const a=points[i]!, b=points[(i+1)%points.length]!;
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) crosses.push(a[0] + (y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      crosses.sort((a,b)=>a-b);
      for(let i=0;i+1<crosses.length;i+=2) rect(crosses[i]!,y,crosses[i+1]!-crosses[i]!,1,color);
    }
  }
  function draw(width: number, height: number, framed = false): string {
    width = Math.max(1, Math.min(1024, Math.floor(width))); height = Math.max(1, Math.min(256, Math.floor(height)));
    if (width !== W || height !== H) { W = width; H = height; frame = Buffer.alloc(W * H * 4); }
    const epoch = Math.floor(tick / 300);
    const event = !reduced && epoch % 2 === 1 && tick % 300 < 260 ? 1 + hash(Math.floor(epoch / 2)) % 7 : -1;
    const galaxy = !reduced && Math.floor(tick / 3000) % 4 === 2;
    const entryAge = tick - entered;
    const flicker = !reduced && state === "working" && entryAge >= 4 && entryAge < 4.5;
    const bg = event === 1 ? [23, 17, 40] : flicker ? [12, 17, 31] : [8, 12, 24];
    rect(0, 0, LOGICAL_W, LOGICAL_H, bg);
    const warp = reduced ? 0 : state === "working" ? (entryAge >= 4 ? 1 : 0) : Math.max(0, 1 - (tick - exit) / 5);
    for (let i = 0; i < 42; i++) {
      const v = hash(i), speed = .5 + (v % 5) / 8;
      // Keep the entire longest streak in the cycle before wrapping it.
      let x = ((v % 440) - travel * speed + 52) % 392; if (x < 0) x += 392; x -= 52;
      rect(x, (v >>> 9) % LOGICAL_H, Math.max(1, Math.floor(warp * (14 + ((v >>> 16) % 39)))), 1, i % 6 ? [82,108,133] : [184,201,206]);
    }
    const transition = !reduced && (state !== "working" && tick - exit < 2);
    if (transition) { const c = [105, 155, 189]; rect(8,8,30,1,c); rect(23,69,45,1,c); rect(267,12,35,1,c); rect(258,66,45,1,c); }
    const age = tick % 300, pass = (speed: number) => 330 - age * speed;
    if (galaxy) { const x = 330 - ((tick % 3000) * .12) % 390; rect(x-9,8,20,1,[52,58,102]); rect(x-6,6,14,5,[67,74,117]); rect(x-2,7,5,3,[167,160,176]); }
    if (event === 2) { const x = pass(2.2); rect(x,66,10,2,[86,102,123]); rect(x+3,64,6,5,[119,134,154]); rect(x+4,62+(Math.floor(tick/3)%2)*5,4,2,[141,157,171]); }
    if (event === 3) {
      const left = Math.floor(pass(1.8) * W / LOGICAL_W) - 16, top = Math.floor(6 * H / LOGICAL_H);
      for (let y=0;y<32;y++) for(let x=0;x<32;x++) {
        const px=left+x,py=top+y,source=(y*32+x)*4;
        if(px<0 || py<0 || px>=W || py>=H || !station[source+3])continue;
        station.copy(frame,(py*W+px)*4,source,source+4);
      }
    }
    if (event === 4 && state === "working") { const p = Math.min(1, age/16), fade = Math.max(0,1-Math.max(0,age-18)/28), r = Math.max(1,Math.floor(1+p*8)); if(fade>0) { rect(275-r,13-r,2*r,2*r,[Math.floor(120*fade),Math.floor(79*fade),Math.floor(114*fade)]); rect(275-Math.floor(r/2),13-Math.floor(r/2),r,r,[Math.floor(255*fade),Math.floor(241*fade),Math.floor(198*fade)]); } }
    if (event === 5) { const x=pass(1.9); rect(x,8,16,14,[56,75,72]); for(let j=0;j<3;j++) for(let k=0;k<4;k++) rect(x+2+k*3,10+j*4,2,2,(j+k)%2?[53,79,66]:[138,157,118]); rect(x+3,10+Math.floor(tick/2)%10,10,1,[145,189,145]); }
    if (event === 6) { const x=pass(2.4), phase=Math.floor(tick/2)%4; rect(x,11,5,4,[234,229,203]); rect(x+5,12,12+phase*3,2,[123,172,192]); rect(x+15,12,13+phase*4,1,[77,112,138]); }
    if (event === 7) {
      const x=pass(1.5),y=12;
      polygon([[x-12,y+4],[x-8,y+2],[x+10,y-1],[x+17,y-1],[x+13,y+1],[x-5,y+5]],[107,105,114]);
      polygon([[x-7,y-4],[x-4,y-7],[x+3,y-8],[x+7,y-5],[x+9,y-1],[x+8,y+4],[x+4,y+7],[x-4,y+7],[x-8,y+4],[x-9,y]],[65,76,96]);
      polygon([[x-7,y-4],[x-4,y-7],[x+2,y-7],[x+6,y-4],[x+7,y],[x+4,y+4],[x-3,y+5],[x-7,y+2]],[132,149,165]);
      rect(x-5,y-4,7,1,[189,197,196]);rect(x-6,y-1,11,1,[170,178,180]);rect(x-4,y+2,9,1,[123,130,146]);
      polygon([[x-13,y+2],[x-8,y+1],[x+10,y-2],[x+17,y-3],[x+13,y],[x-5,y+4]],[179,163,152]);
      rect(x-12,y+2,5,1,[221,208,181]);rect(x+8,y-1,7,1,[213,196,174]);
    }
    const bob = reduced || state === "waiting" ? 0 : Math.floor(tick / 10) % 2;
    // Acceleration into warp, then a gentle return to center. Leaving warp
    // mirrors that path behind the center before easing back to rest.
    const ease = (t: number) => { const p = Math.max(0, Math.min(1, t)); return p * p * (3 - 2 * p); };
    const excursion = (age: number) => age < 4 ? ease(age / 4) : 1 - ease((age - 4) / 6);
    const shift = reduced ? 0 : state === "working" ? 22 * excursion(tick - entered)
      : tick - exit < 10 ? -18 * excursion(tick - exit) : 0;
    // Center the visible artwork in the scene after the framed accent, in pixels.
    const sceneStart = framed ? Math.ceil(4 * W / LOGICAL_W) : 0;
    const centerLeft = (sceneStart + W - (minX + maxX + 1)) / 2;
    const left = Math.floor(centerLeft + shift * W / LOGICAL_W), top = Math.floor((H-mask.height)/2)+bob;
    const logicalLeft = left * LOGICAL_W / W, logicalTop = top * LOGICAL_H / H;
    if (warp > 0) { rect(logicalLeft-60,logicalTop-2,60,7,[18,38,65]); rect(logicalLeft-43,logicalTop-1,43,5,[36,73,112]); rect(logicalLeft-23,logicalTop,23,3,[65,135,172]); }
    for (let y=0;y<mask.height;y++) for(let x=0;x<mask.width;x++) {
      const source=(y*mask.width+x)*4; if(!mask.pixels[source+3])continue;
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
        const px=left+x+dx, py=top+y+dy; if(px<0||py<0||px>=W||py>=H)continue;
        const target=(py*W+px)*4; frame[target]=bg[0]!; frame[target+1]=bg[1]!; frame[target+2]=bg[2]!; frame[target+3]=255;
      }
    }
    for (let y=0;y<mask.height;y++) for(let x=0;x<mask.width;x++) {
      const source=(y*mask.width+x)*4; if(!mask.pixels[source+3])continue;
      const target=((top+y)*W+left+x)*4; mask.pixels.copy(frame,target,source,source+4);
    }
    if(state === "failure") { const x=294-(reduced?0:Math.min(12,Math.floor(failureAge/2))); rect(x,18,3,2,[167,120,119]); rect(x+11,18,3,2,[167,120,119]); rect(x+2,20,10,2,[167,120,119]); rect(x+4,22,6,2,[231,178,160]); rect(x+6,24,2,2,[167,120,119]); }
    if (framed) rect(0, 0, 4, LOGICAL_H, process.env.NO_COLOR !== undefined ? [190, 190, 190] : [232, 163, 93]);
    return png(frame, W, H);
  }
  return {
    setState(next: EnterpriseSceneState) { if(next===state)return; if(state==="working")exit=tick; state=next; entered=tick; if(next==="failure")failureAge=0; revision++; },
    tick() { if(reduced)return; tick += .5; travel += state === "working" ? .165 + (5.5 - .165) * Math.min(1, (tick - entered) / 4) : .165; if(state==="failure")failureAge += .5; revision++; },
    reset() { state="waiting"; tick=0; entered=0; exit=-100; travel=0; failureAge=0; revision++; },
    get revision() { return revision; },
    render: draw,
  };
}

import { Image, allocateImageId, getCapabilities, getCellDimensions, type Component, type TUI } from "@earendil-works/pi-tui";
import type { CalmWorkingShipAnimation } from "./fm-calm-working-ship.ts";

export function createEnterprisePixelWidget(
  tui: TUI,
  scene: ReturnType<typeof createEnterprisePixelScene>,
  fallback: CalmWorkingShipAnimation,
  reduced: boolean,
  framed: () => boolean = () => false,
): Component & { dispose(): void } {
  let disposed = false, key = "", cached: Image | undefined, fallbackTick = 0;
  const imageId = allocateImageId();
  const timer = setInterval(() => {
    if (disposed || reduced) return;
    fallbackTick++;
    if (fallbackTick % 2 === 0) fallback.tick();
    scene.tick(); tui.requestRender();
  }, 110);
  timer.unref?.();
  return {
    render(width) {
      if (disposed) return [];
      if (width < 48 || !getCapabilities().images) return fallback.render(width);
      const cell = getCellDimensions();
      const columns = Math.min(framed() ? Math.floor(1024 / cell.widthPx) : 78, width - 2);
      const pw = Math.round(columns * cell.widthPx);
      const ph = Math.round(12 * cell.heightPx);
      if (pw < 160 || ph < 60 || pw > 1024 || ph > 256) return fallback.render(width);
      const nextKey = `${scene.revision}:${width}:${pw}:${ph}:${getCapabilities().images}:${framed()}`;
      if (key !== nextKey || !cached) {
        cached = new Image(scene.render(pw, ph, framed()), "image/png", { fallbackColor: (s) => s }, { maxWidthCells: columns, maxHeightCells: 12, imageId }, { widthPx: pw, heightPx: ph });
        key = nextKey;
      }
      return cached.render(width);
    },
    invalidate() { key = ""; cached = undefined; },
    dispose() { if (disposed) return; disposed = true; clearInterval(timer); fallback.restoreLastRendered(); cached = undefined; },
  };
}
