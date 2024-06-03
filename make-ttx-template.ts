let file = await Bun.file("./font.ttx").text();

file = file.replace(
    `<!-- LookupCount=1 -->
          <LookupListIndex index="0" value="0"/>`,
    "<!-- LookupCount={{LOOKUP_LIST_INDICES_LENGTH}} -->\n{{LOOKUP_LIST_INDICES}}"
);
file = file.replace(
    `<!-- LookupCount=1 -->
      <Lookup index="0">
        <LookupType value="4"/>
        <LookupFlag value="0"/>
        <!-- SubTableCount=1 -->
        <LigatureSubst index="0">
          <LigatureSet glyph="space">
            <Ligature components="space,space,space,space,space" glyph="liga5"/>
            <Ligature components="space,space,space,space" glyph="liga4"/>
            <Ligature components="space,space,space" glyph="liga3"/>
            <Ligature components="space,space" glyph="liga2"/>
            <Ligature components="space" glyph="ligaA"/>
          </LigatureSet>
        </LigatureSubst>
      </Lookup>`,
    "<!-- LookupCount={{LOOKUP_LIST_LENGTH}} -->\n{{LOOKUP_LIST}}"
);

await Bun.write("./font.ttx.template", file);
