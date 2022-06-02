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
		{
			identifier: "displacement_scale",
			direction: "in",
			dimensions: "1d",
			type: "float",
			default: 1,
			constraints: { min: -10, max: 10 }
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
				label: "Color",
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
		{
			name: "displacement_scale_factor",
			type: "Input",
			options: {
				label: "Displacement Scale",
				inputBoundIdentifier: "displacement_scale",
			},
			data: {},
		},
	],
};

export function getDefinition() {
	return definition;
}

export function compute(nodeData) {
	Object.values(definition.rows).forEach((row) => {
		if (row.name === "displacement_scale_factor") {
			ViewportShader.updateDisplacementScale(row.data.inputValue);
		}

		if (!row.options || !row.options.outputBoundIdentifier) return;

		const identifier = row.options.outputBoundIdentifier;
		const image = Node.getInPropertyValue(nodeData, identifier);
		ViewportShader.updateImage(row.options.textureUniformName, image);
	});

	const inputTexture = nodeData.inConnections.diffuse[0];
	const inputDisplacement = nodeData.inConnections.displacement[0];
	const inputTextureIdentifier = inputTexture?.identifier;
	const inputTextureResolution = inputTexture?.node.propertyValues[inputTextureIdentifier]?.resolution;
	const inputTextureFF = inputTextureResolution && Node.formFactorFromResolution(inputTextureResolution);

	const ff = inputDisplacement ? "Square" : inputTextureFF;

	document.querySelector(".column.right").style.display = ff === "Square" ? "" : "none";
	document.querySelector(".brush-viewport").style.display = ff === "Strip" ? "" : "none";

	const viewport3DClasses = document.querySelector(".material-viewports").classList;
	if (inputDisplacement) viewport3DClasses.remove("viewport-2d-only");
	else viewport3DClasses.add("viewport-2d-only");
}
