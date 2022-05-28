import * as Node from "/Materialism/js/Node.mjs";
import * as ViewportShader from "/Materialism/js/ViewportShader.mjs";

const definition = {
	name: "Output",
	properties: [
		{
			identifier: "workflow",
			direction: "in",
			dimensions: "0d",
			type: "string",
			default: "Brush",
			constraints: {},
		},
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
			name: "workflow",
			type: "Dropdown",
			connectors: [],
			data: {
				options: ["Brush", "Material"],
			},
			options: {
				label: "Workflow",
				inputBoundIdentifier: "workflow",
				outputBoundIdentifier: "visualization",
			},
		},
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
	Object.values(definition.rows).forEach((row) => {
		if (!row.options) return;

		const identifier = row.options.outputBoundIdentifier;

		if (identifier === "visualization") {
			const workflow = row.data.inputValue;

			document.querySelector(".column.right").style.display = workflow === "Material" ? "" : "none";
			document.querySelector(".brush-viewport").style.display = workflow === "Brush" ? "" : "none";
		} else {
			const image = Node.getInPropertyValue(nodeData, identifier);
			ViewportShader.updateImage(row.options.textureUniformName, image);
		}
	});
}
