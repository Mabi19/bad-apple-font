const template = await Bun.file("./font.ttx.template").text();

function repeat<T>(val: T, length: number) {
    return Array.from<T>({ length }).fill(val);
}

function getBaseGlyphChar(batchIdx: number) {
    return String.fromCodePoint("A".codePointAt(0)! + batchIdx);
}

// [start, end)
interface LigaRange {
    base: string;
    start: number;
    end: number;
}

const INJECTED_LIGA_MAX = 6562;
const BATCH_SIZE = 512;

const MAX_LENGTHS = [
    252,
    106,
    81,
    68,
    60,
    54,
    50,
    46,
    44,
    41,
    39,
    37,
    36,
    35,
    33,
    32,
    31,
    30,
    repeat(29, 2),
    28,
    repeat(27, 2),
    repeat(26, 2),
    repeat(25, 2),
    repeat(24, 2),
    repeat(23, 2),
    repeat(22, 3),
    repeat(21, 4),
    repeat(20, 4),
    repeat(19, 4),
    repeat(18, 6),
    repeat(17, 6),
    repeat(16, 7),
].flat();
// gaps:
// 146, 88, 13, 8, 6, 4, 4, 2, 3, 2, 2, 1, 2, 1, 1, 1, 1, 0, 1, 1, 0, ...

// the full list of lookups.
// created from lowest to highest, but they (and their contents) need to be reversed when put in
const ranges: LigaRange[] = [];

// generate ranges

const batches = Math.ceil(INJECTED_LIGA_MAX / 512);

for (let batch = 0; batch < batches; batch++) {
    const thisBatchSize = batch == batches - 1 ? INJECTED_LIGA_MAX % BATCH_SIZE : BATCH_SIZE;

    let added = 0;
    let lengthIdx = 0;
    while (added < thisBatchSize - 1) {
        if (lengthIdx >= MAX_LENGTHS.length) {
            console.warn(
                `Could not fit all ranges inside provided lengths; only ${added} ligatures have been added (${
                    thisBatchSize - 1 - added
                } left)`
            );
            break;
        }

        const leftToAdd = thisBatchSize - added;

        if (leftToAdd <= MAX_LENGTHS[lengthIdx]) {
            ranges.push({
                base: getBaseGlyphChar(batch),
                start: added + 2,
                end: added + 2 + leftToAdd - 1,
            });

            added += leftToAdd;
        } else {
            ranges.push({
                base: getBaseGlyphChar(batch),
                start: added + 2,
                end: added + 2 + MAX_LENGTHS[lengthIdx],
            });
            added += MAX_LENGTHS[lengthIdx];
        }

        lengthIdx += 1;
    }
}

console.log(`emitting ${ranges.length} lookups`);

let lookupIndex = 0;
const lookups: string[] = [];
for (const range of ranges.reverse()) {
    const pre = `      <Lookup index="${lookupIndex}">
        <LookupType value="4"/>
        <LookupFlag value="0"/>
        <!-- SubTableCount=1 -->
        <LigatureSubst index="0">
          <LigatureSet glyph="liga${range.base}">`;

    const post = `          </LigatureSet>
        </LigatureSubst>
      </Lookup>`;

    const entries = [];
    for (let i = range.end - 1; i >= range.start; i--) {
        const batchOffset = (range.base.codePointAt(0)! - "A".codePointAt(0)!) * 512;
        const ligaChain = `liga${range.base},`.repeat(i - 1).slice(0, -1);
        entries.push(
            `            <Ligature components="${ligaChain}" glyph="liga${i + batchOffset}"/>`
        );
    }
    const result = `${pre}\n${entries.join("\n")}\n${post}`;
    lookups.push(result);

    lookupIndex += 1;
}

const lookupIndices: string[] = [];
for (let i = 0; i < lookups.length; i++) {
    lookupIndices.push(`          <LookupListIndex index="${i}" value="${i}"/>`);
}

const newFontDefinition = template
    .replaceAll("{{LOOKUP_LIST_LENGTH}}", lookups.length.toString())
    .replace("{{LOOKUP_LIST}}", lookups.join("\n"))
    .replace("{{LOOKUP_LIST_INDICES_LENGTH}}", lookupIndices.length.toString())
    .replace("{{LOOKUP_LIST_INDICES}}", lookupIndices.join("\n"));

await Bun.write("font-withliga.ttx", newFontDefinition);
