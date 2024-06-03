# Bad Apple Font

This is the code that generated the font in my video "bad_apple.otf".
The frames were extracted with FFmpeg, then vectorized with potrace.
The actual font was created using a combination of opentype.js and fonttools (well, only the ttx command line tool)
I didn't really make it user-friendly, but here's a description of how to use it anyway:

0. You'll need working installations of FFmpeg, potrace, Bun, opentype.js
(NOT installed through npm, but in a folder called "opentype.js" because I hacked on it a bit in the process of making this. A vanilla install (latest NPM version, not master) should work)
and fonttools. Make is also useful, but not required. Part of the pipeline uses `svg-path-commander`, but you can do `bun i` to install it.
1. Obtain a copy of the original video. I used a 1440x1080 one; the height is hardcoded in some places
2. Extract all the frames with FFmpeg (the "bad-apple-frames" folder is .gitignore'd for this purpose). Make sure to extract to BMP, since potrace doesn't support any compressed image formats (warning, this will take 30GB of disk space)
3. Run `bun run trace-frames.ts` to create "frames.json", a file with all of the frames vectorized in order (~120 MB; this will take a few minutes)
4. Run `make` to execute all of the other steps (if you don't have Make, you'll need to read and execute the Makefile manually)

The font generation pipeline generally looks like this:
```
frames.json --(make-base-font.ts)-> font.otf --(ttx)-> font.ttx --(make-ttx-template.ts)-> font.ttx.template --(inject-ligatures.ts)-> font-withliga.ttx --(ttx)-> font-withliga.otf (finished product)
```

## Display notes
Most OpenType implementations aren't made for 512-long ligatures<sup>[*citation needed*]</sup>.
I've tested quite a few in the process of making this, so here are their limits:
- Windows Notepad can display very long ligatures. However, if the font includes any with a length above 512, it starts to lag. Additionally, the text layout glitches out when rendering such a ligature.
- Word seems to have the same limits as Notepad, but it gets increasingly laggier with the length of the rendered ligature.
- Notepad++ (when using DirectWrite) can render up to 297 fine, but 298 is rendered as (ligature 99) + (ligature 99) + (ligature 99) + (single non-ligature character)
- Firefox (and therefore most apps on Linux I think) ignore any ligatures longer than 64.

TL;DR: I've only gotten the font to render fully on Windows, in Notepad. It may work on Macs. I don't know, I don't have one.
