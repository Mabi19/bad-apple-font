import * as fs from "node:fs/promises";
import * as opentype from "./opentype.js";
import SVGPathCommander from "svg-path-commander";

async function traceFile(filepath: string) {
    const proc = Bun.spawn([
        "potrace",
        "-b",
        "svg",
        "-k",
        "0.7",
        "-u",
        "10",
        "--flat",
        filepath,
        "-o",
        "-",
    ]);
    const result = await new Response(proc.stdout).text();

    const match = result.match(/<path d="([A-Za-z0-9\-\n ]+)"\/>/);
    if (!match) {
        throw new Error("Could not find path in SVG");
    }
    const pathString = match[1];
    const path = new SVGPathCommander(pathString);
    path.transform({
        scale: 0.1,
        origin: [0, 0],
    });
    path.normalize();

    const opentypePath = new opentype.Path();
    for (const segment of path.segments) {
        switch (segment[0]) {
            case "M":
                opentypePath.moveTo(Math.round(segment[1]), Math.round(segment[2]));
                break;
            case "C":
                opentypePath.bezierCurveTo(
                    Math.round(segment[1]),
                    Math.round(segment[2]),
                    Math.round(segment[3]),
                    Math.round(segment[4]),
                    Math.round(segment[5]),
                    Math.round(segment[6])
                );
                break;
            case "L":
                opentypePath.lineTo(Math.round(segment[1]), Math.round(segment[2]));
                break;
            case "Z":
                opentypePath.close();
                break;
            default:
                throw new Error("Unsupported path segment " + segment[0]);
        }
    }

    return opentypePath.commands;
}

const FRAMES_DIR = "./bad-apple-frames";

let files = await fs.readdir(FRAMES_DIR);
files.sort();

// files = files.slice(0, 1200);

const results: opentype.PathCommand[][] = [];

console.time("full");

const CHUNK_SIZE = 256;
for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    console.time(`creating tasks #${i}`);
    const promises = files
        .slice(i, i + CHUNK_SIZE)
        .map((filename) => traceFile(`${FRAMES_DIR}/${filename}`));
    console.timeEnd(`creating tasks #${i}`);
    console.time(`tracing #${i}`);
    const chunkResults = await Promise.all(promises);
    console.timeEnd(`tracing #${i}`);
    results.push(...chunkResults);
}

await Bun.write("./frames.json", JSON.stringify(results));

console.timeEnd("full");
