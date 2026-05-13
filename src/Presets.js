import NewGraph from "@/data/new-graph.json";
import Material2Octaves from "@/data/material-2-octaves.json";
import Material3Octaves from "@/data/material-3-octaves.json";
import MaterialComplex from "@/data/material-complex.json";
import BrushDottedStampRoller from "@/data/brush-dotted-stamp-roller.json";
import BrushBristles from "@/data/brush-bristles.json";
import BrushDilutedInk from "@/data/brush-diluted-ink.json";
import BrushRaggedSolidInk from "@/data/brush-ragged-solid-ink.json";

export const presets = [
	{ slug: "new-graph", name: "New Graph", data: NewGraph },
	{ slug: "brush-dotted-stamp-roller", name: "Brush Dotted Stamp Roller", data: BrushDottedStampRoller },
	{ slug: "brush-bristles", name: "Brush Bristles", data: BrushBristles },
	{ slug: "brush-diluted-ink", name: "Brush Diluted Ink", data: BrushDilutedInk },
	{ slug: "brush-ragged-solid-ink", name: "Brush Ragged Solid Ink", data: BrushRaggedSolidInk },
	{ slug: "material-2-octaves", name: "Material 2 Octaves", data: Material2Octaves },
	{ slug: "material-3-octaves", name: "Material 3 Octaves", data: Material3Octaves },
	{ slug: "material-complex", name: "Material Complex", data: MaterialComplex },
];

export function findPresetBySlug(slug) {
	return presets.find((preset) => preset.slug === slug);
}
