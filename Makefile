font-withliga.otf: font-withliga.ttx
	ttx -f font-withliga.ttx

font-withliga.ttx: font.ttx.template inject-ligatures.ts
	bun run inject-ligatures.ts

font.ttx.template: font.ttx make-ttx-template.ts
	bun run make-ttx-template.ts

font.ttx: font.otf
	ttx -f font.otf

font.otf: frames.json make-base-font.ts
	bun run make-base-font.ts