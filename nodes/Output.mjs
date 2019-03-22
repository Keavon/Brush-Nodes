import * as Node from "/Materialism/js/Node.mjs";
import * as ViewportShader from "/Materialism/js/ViewportShader.mjs";

const definition = {
	name: "Output",
	properties: [
		{
			identifier: "diffuse",
			direction: "in",
			dimensions: "2d",
			type: "color",
			constraints: {},
		},
		{
			identifier: "displacement",
			direction: "in",
			dimensions: "2d",
			type: "color",
			constraints: {},
		},
	],
	rows: [
		{ type: "Spacer" },
		{
			name: "diffuse_output",
			type: "Output",
			connectors: [
				{ identifier: "diffuse", direction: "in", dimensions: "2d", type: "color" },
			],
			options: {
				label: "Diffuse",
				outputBoundIdentifier: "diffuse",
				textureUniformName: "u_diffuse",
			},
		},
		{
			name: "displacement_output",
			type: "Output",
			connectors: [
				{ identifier: "displacement", direction: "in", dimensions: "2d", type: "color" },
			],
			options: {
				label: "Displacement",
				outputBoundIdentifier: "displacement",
				textureUniformName: "u_displacement",
			},
		},
	],
};

export function getDefinition() {
	return definition;
}

export function compute(nodeData) {
	Object.keys(definition.rows).forEach((rowName) => {
		const row = definition.rows[rowName];
		if (!row.options) return;

		const identifier = row.options.outputBoundIdentifier;
		const image = Node.getInPropertyValue(nodeData, identifier);

		ViewportShader.updateImage(row.options.textureUniformName, image);
	});
}