import * as opentype from "./opentype.js";

const USE_ACTUAL_FRAMES = true;
console.time("load frames");
const BAD_APPLE_FRAMES: opentype.PathCommand[][] = USE_ACTUAL_FRAMES
    ? await Bun.file("./frames.json").json()
    : [];
console.timeEnd("load frames");
// this will be 1444x1080 (TODO: double-check) for the bad apple font
const ADVANCE_WIDTH = USE_ACTUAL_FRAMES ? 1444 : 1000;
const FONT_HEIGHT = USE_ACTUAL_FRAMES ? 1080 : 1000;

const GENERATE_COUNT = USE_ACTUAL_FRAMES ? BAD_APPLE_FRAMES.length : 6562;
const BATCH_SIZE = 512;
const LIGA_MAX = GENERATE_COUNT;

//// This only works if LIGA_MAX is <= 253.
// Limited to generating up to 5.
// Regardless of this option the characters are put into the PUA starting at U+F0002.
const GENERATE_LIGATURES = true;

// Generates a glyph with dots counting in binary
function generatePlaceholderPath(counter: number) {
    const path = new opentype.Path();

    const counterBits = (counter | 0).toString(2).padStart(16, "0");
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            const bitIdx = y * 4 + x;

            const halfWidth = counterBits[bitIdx] == "1" ? 75 : 40;

            const centerX = 200 + (800 * x) / 4;
            const centerY = 200 + (800 * y) / 4;

            const box = new opentype.BoundingBox();
            box.x1 = centerX - halfWidth;
            box.y1 = centerY - halfWidth;
            box.x2 = centerX + halfWidth;
            box.y2 = centerY + halfWidth;

            path.extend(box);
        }
    }

    return path;
}

function getPath(frame: number) {
    if (USE_ACTUAL_FRAMES) {
        const commands = BAD_APPLE_FRAMES[frame - 1];
        const path = new opentype.Path();
        path.commands = commands;
        return path;
    } else {
        return generatePlaceholderPath(frame);
    }
}

function getBaseGlyphStart(idx: number) {
    const baseGlyphIndex = Math.floor((idx - 1) / 512);
    return String.fromCodePoint("A".codePointAt(0)! + baseGlyphIndex);
}

const notdefGlyph = new opentype.Glyph({
    name: ".notdef",
    unicode: 0,
    path: generatePlaceholderPath(65535),
    advanceWidth: 1000,
});

const spaceGlyph = new opentype.Glyph({
    name: "space",
    unicode: " ".codePointAt(0)!,
    path: new opentype.Path(),
    advanceWidth: ADVANCE_WIDTH,
});

console.time("generating glyphs");

const REPEAT_CHARACTER_IDX = 1;
const ligaGlyphs: opentype.Glyph[] = [];
const ligaDefs: { sub: number[]; by: number }[] = [];
for (let i = 1; i <= GENERATE_COUNT; i++) {
    let glyph: opentype.Glyph;

    if (i % BATCH_SIZE == 1) {
        const start = getBaseGlyphStart(i);
        glyph = new opentype.Glyph({
            name: `liga${start}`,
            unicode: start.codePointAt(0)!,
            path: getPath(i),
            advanceWidth: ADVANCE_WIDTH,
        });
    } else {
        glyph = new opentype.Glyph({
            name: `liga${i}`,
            unicode: 0xf0000 + i,
            path: getPath(i),
            advanceWidth: ADVANCE_WIDTH,
        });
    }

    ligaGlyphs.push(glyph);

    if (i > 1 && i <= LIGA_MAX) {
        ligaDefs.push({
            sub: Array.from<number>({ length: i }).fill(REPEAT_CHARACTER_IDX),
            by: i,
        });
    }
}

console.timeEnd("generating glyphs");
console.time("saving font");

const font = new opentype.Font({
    familyName: "BadApple",
    styleName: "Regular",
    unitsPerEm: FONT_HEIGHT,
    ascender: FONT_HEIGHT,
    descender: 0,
    glyphs: [notdefGlyph, spaceGlyph, ...ligaGlyphs],
});

if (GENERATE_LIGATURES) {
    // Ligatures need to be defined in reverse order of length
    for (const definition of ligaDefs.slice(0, 5).reverse()) {
        font.substitution.addLigature("liga", definition);
    }

    // // try splitting across ligature sets?
    // const ligaLookup = font.tables.gsub.lookups;
    // ligaLookup.push({
    //     lookupType: 4,
    //     lookupFlag: 0,
    //     subtables: [
    //         {
    //             substFormat: 1,
    //             coverage: {
    //                 format: 1,
    //                 glyphs: [1],
    //             },
    //             ligatureSets: [
    //                 [
    //                     {
    //                         ligGlyph: 5,
    //                         components: [1, 1, 1, 1],
    //                     },
    //                     {
    //                         ligGlyph: 4,
    //                         components: [1, 1, 1],
    //                     },
    //                     {
    //                         ligGlyph: 3,
    //                         components: [1, 1],
    //                     },
    //                     {
    //                         ligGlyph: 2,
    //                         components: [1],
    //                     },
    //                 ],
    //             ],
    //         },
    //     ],
    // });
    // ligaLookup[0] = {
    //     lookupType: 4,
    //     lookupFlag: 0,
    //     subtables: [
    //         {
    //             substFormat: 1,
    //             coverage: {
    //                 format: 1,
    //                 glyphs: [1],
    //             },
    //             ligatureSets: [
    //                 [
    //                     {
    //                         ligGlyph: 10,
    //                         components: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    //                     },
    //                     {
    //                         ligGlyph: 9,
    //                         components: [1, 1, 1, 1, 1, 1, 1, 1],
    //                     },
    //                     {
    //                         ligGlyph: 8,
    //                         components: [1, 1, 1, 1, 1, 1, 1],
    //                     },
    //                     {
    //                         ligGlyph: 7,
    //                         components: [1, 1, 1, 1, 1, 1],
    //                     },
    //                     {
    //                         ligGlyph: 6,
    //                         components: [1, 1, 1, 1, 1],
    //                     },
    //                 ],
    //             ],
    //         },
    //     ],
    //     markFilteringSet: undefined,
    // };
    // const featureTable = font.substitution.getFeatureTable("DFLT", "dflt", "liga", false);
    // featureTable.lookupListIndexes.push(1);
    // console.log("feature table", featureTable);

    // console.log(font.substitution.getLookupTables("DFLT", "dflt", "liga", 4, false));
    // console.log(font.tables.gsub.lookups);
}

// const tables = font.toTables();

await Bun.write("./font.otf", font.toArrayBuffer());

console.timeEnd("saving font");
